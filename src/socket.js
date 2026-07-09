const { Chess } = require('chess.js');
const stats = require('./stats');

// Peta memori untuk menyimpan permainan yang sedang aktif
const activeGames = new Map();

// Fungsi untuk menghasilkan kode room acak sepanjang 6 karakter
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Pastikan tidak duplikat dengan room aktif
  if (activeGames.has(result)) {
    return generateRoomId();
  }
  return result;
}

module.exports = function (io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Klien terhubung: ${socket.id}`);

    // Variabel lokal socket untuk pelacakan cepat
    let currentRoomId = null;
    let myColor = null; // 'w' atau 'b'

    // 1. EVENT: Create Room (Membuat Room Pertandingan Baru)
    socket.on('create_room', async ({ username, playerId }) => {
      try {
        const roomId = generateRoomId();
        currentRoomId = roomId;
        myColor = 'w'; // Pembuat room otomatis memegang bidak Putih

        const gameInstance = {
          roomId,
          chess: new Chess(),
          white: {
            socketId: socket.id,
            playerId: parseInt(playerId),
            username: username,
            timeLeft: 600, // 10 menit dalam detik
            timer: null
          },
          black: null, // Menunggu pemain kedua bergabung
          spectators: [],
          status: 'waiting', // waiting, playing, gameover
          startedAt: Date.now(),
          movesHistory: [],
          disconnectTimeout: null
        };

        activeGames.set(roomId, gameInstance);
        socket.join(roomId);
        
        socket.emit('room_created', {
          roomId,
          color: 'w',
          timeLeft: gameInstance.white.timeLeft
        });
        
        console.log(`[Room] Room ${roomId} dibuat oleh ${username} (Putih)`);
      } catch (err) {
        console.error('Error creating room:', err);
        socket.emit('error_message', 'Gagal membuat room.');
      }
    });

    // 2. EVENT: Join Room (Bergabung ke Room Pertandingan yang Ada)
    socket.on('join_room', async ({ roomId, username, playerId }) => {
      try {
        const upperRoomId = roomId.trim().toUpperCase();
        const game = activeGames.get(upperRoomId);

        if (!game) {
          return socket.emit('error_message', 'Room tidak ditemukan.');
        }

        if (game.status !== 'waiting') {
          // Jika room sudah penuh, gabung sebagai penonton (spectator)
          socket.join(upperRoomId);
          game.spectators.push({ socketId: socket.id, username });
          currentRoomId = upperRoomId;
          myColor = 's'; // Spectator
          
          socket.emit('spectator_joined', {
            roomId: upperRoomId,
            fen: game.chess.fen(),
            white: game.white.username,
            black: game.black ? game.black.username : 'Belum Bergabung',
            moves: game.movesHistory
          });
          return;
        }

        // Bergabung sebagai pemain kedua (Bidak Hitam)
        currentRoomId = upperRoomId;
        myColor = 'b';
        game.black = {
          socketId: socket.id,
          playerId: parseInt(playerId),
          username: username,
          timeLeft: 600,
          timer: null
        };
        game.status = 'playing';

        socket.join(upperRoomId);
        
        // Kirim event ke pemain hitam bahwa dia berhasil join
        socket.emit('room_joined', {
          roomId: upperRoomId,
          color: 'b',
          white: { username: game.white.username, rating: 1200 }, // Rating diambil saat login
          timeLeft: game.black.timeLeft
        });

        // Beritahu pemain putih bahwa lawan sudah masuk dan game dimulai
        io.to(game.white.socketId).emit('match_start', {
          roomId: upperRoomId,
          opponent: { username: game.black.username },
          color: 'w'
        });

        // Broadcast ke semua di room bahwa game resmi dimulai
        io.to(upperRoomId).emit('game_started', {
          white: game.white.username,
          black: game.black.username,
          fen: game.chess.fen()
        });

        // Mulai Timer Catur (Putih mendapat giliran pertama)
        startPlayerTimer(game, 'w', io);
        console.log(`[Room] ${username} (Hitam) bergabung ke ${upperRoomId}. Pertandingan dimulai!`);
      } catch (err) {
        console.error('Error joining room:', err);
        socket.emit('error_message', 'Gagal bergabung ke room.');
      }
    });

    // 3. EVENT: Make Move (Melakukan Pergerakan Bidak Catur)
    socket.on('make_move', async (moveData) => {
      const game = activeGames.get(currentRoomId);
      if (!game || game.status !== 'playing') return;

      // Pastikan giliran warna cocok dengan pengirim socket
      const activeColor = game.chess.turn(); // 'w' atau 'b'
      if (activeColor !== myColor) {
        return socket.emit('error_message', 'Bukan giliran Anda!');
      }

      try {
        // Coba validasi langkah di server menggunakan chess.js
        const move = game.chess.move(moveData);
        
        if (!move) {
          return socket.emit('invalid_move', { fen: game.chess.fen() });
        }

        // Catat histori langkah
        game.movesHistory.push(move.san);

        // Siarkan langkah yang valid ke lawan dan spectator
        socket.to(currentRoomId).emit('move_made', {
          move: move,
          fen: game.chess.fen(),
          timeLeftWhite: game.white.timeLeft,
          timeLeftBlack: game.black.timeLeft
        });

        // Cek apakah game berakhir (skakmat, draw, dll)
        if (game.chess.isGameOver()) {
          await handleGameEnd(game, io, null); // diakhiri karena aturan catur
        } else {
          // Ganti giliran timer catur
          stopPlayerTimer(game, activeColor);
          const nextColor = activeColor === 'w' ? 'b' : 'w';
          startPlayerTimer(game, nextColor, io);
        }
      } catch (err) {
        console.error('Error making move:', err);
        socket.emit('error_message', 'Langkah tidak valid.');
      }
    });

    // 4. EVENT: Resign (Menyerah)
    socket.on('resign', async () => {
      const game = activeGames.get(currentRoomId);
      if (!game || game.status !== 'playing') return;

      if (myColor === 'w' || myColor === 'b') {
        const loserColor = myColor;
        console.log(`[Game] Player ${loserColor === 'w' ? 'White' : 'Black'} menyerah di room ${currentRoomId}`);
        await handleGameEnd(game, io, loserColor === 'w' ? 'black_win' : 'white_win', 'resign');
      }
    });

    // 5. EVENT: Send Message (Chat Real-Time)
    socket.on('send_message', (messageText) => {
      if (!currentRoomId) return;
      
      const game = activeGames.get(currentRoomId);
      let sender = 'Penonton';
      if (game) {
        if (socket.id === game.white.socketId) sender = game.white.username;
        else if (game.black && socket.id === game.black.socketId) sender = game.black.username;
      }

      io.to(currentRoomId).emit('receive_message', {
        sender,
        text: messageText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    });

    // 6. EVENT: Disconnect (Klien Terputus)
    socket.on('disconnect', async () => {
      console.log(`[Socket] Klien terputus: ${socket.id}`);
      if (!currentRoomId) return;

      const game = activeGames.get(currentRoomId);
      if (!game) return;

      // Jika game masih menunggu pemain kedua, langsung hapus room
      if (game.status === 'waiting' && socket.id === game.white.socketId) {
        activeGames.delete(currentRoomId);
        console.log(`[Room] Room ${currentRoomId} dihapus karena pembuat terputus.`);
        return;
      }

      // Jika game sedang aktif dimainkan
      if (game.status === 'playing') {
        const isWhite = socket.id === game.white.socketId;
        const isBlack = game.black && socket.id === game.black.socketId;

        if (isWhite || isBlack) {
          const disconnectedColor = isWhite ? 'w' : 'b';
          const remainingPlayerSocketId = isWhite ? game.black.socketId : game.white.socketId;

          // Beritahu pemain yang tersisa bahwa lawan terputus, memberikan waktu tunggu
          io.to(remainingPlayerSocketId).emit('opponent_disconnected', {
            gracePeriod: 30 // 30 detik untuk menyambung kembali
          });

          // Hentikan timer permainan utama untuk sementara
          stopPlayerTimer(game, 'w');
          stopPlayerTimer(game, 'b');

          // Set timeout untuk auto-win bagi pemain yang tersisa jika lawan tidak reconnect
          game.disconnectTimeout = setTimeout(async () => {
            console.log(`[Game] Pemain ${disconnectedColor === 'w' ? 'Putih' : 'Hitam'} gagal menyambung kembali. Kemenangan default diberikan ke lawan.`);
            await handleGameEnd(
              game, 
              io, 
              disconnectedColor === 'w' ? 'black_win' : 'white_win', 
              'disconnection'
            );
          }, 30000); // 30 detik
        }
      }
    });

    // 7. EVENT: Reconnect / Resume Game (Menyambung Kembali ke Game Aktif)
    socket.on('reconnect_game', ({ roomId, username }) => {
      const upperRoomId = roomId.toUpperCase();
      const game = activeGames.get(upperRoomId);
      
      if (game && game.status === 'playing') {
        const isWhite = game.white.username === username;
        const isBlack = game.black && game.black.username === username;
        
        if (isWhite || isBlack) {
          // Bersihkan timeout pemutusan koneksi jika ada
          if (game.disconnectTimeout) {
            clearTimeout(game.disconnectTimeout);
            game.disconnectTimeout = null;
          }

          // Update socket ID baru
          if (isWhite) {
            game.white.socketId = socket.id;
            myColor = 'w';
          } else {
            game.black.socketId = socket.id;
            myColor = 'b';
          }
          currentRoomId = upperRoomId;
          socket.join(upperRoomId);

          // Beritahu pemain bahwa mereka berhasil terhubung kembali
          socket.emit('reconnected', {
            color: myColor,
            fen: game.chess.fen(),
            white: game.white.username,
            black: game.black.username,
            timeLeftWhite: game.white.timeLeft,
            timeLeftBlack: game.black.timeLeft,
            moves: game.movesHistory
          });

          // Beritahu lawan bahwa koneksi telah pulih
          socket.to(upperRoomId).emit('opponent_reconnected', {
            username
          });

          // Lanjutkan timer catur untuk giliran aktif saat ini
          const activeColor = game.chess.turn();
          startPlayerTimer(game, activeColor, io);
          
          console.log(`[Game] Pemain ${username} berhasil terhubung kembali ke room ${upperRoomId}`);
        }
      }
    });
  });
};

// ============================================================================
// TIMERS & GAME END HANDLERS
// ============================================================================

// Mulai timer hitung mundur untuk salah satu pemain
function startPlayerTimer(game, color, io) {
  const player = color === 'w' ? game.white : game.black;
  if (!player) return;

  // Bersihkan timer lama jika ada
  if (player.timer) clearInterval(player.timer);

  player.timer = setInterval(async () => {
    player.timeLeft--;

    // Broadcast sisa waktu berkala ke seluruh room catur
    io.to(game.roomId).emit('time_update', {
      timeLeftWhite: game.white.timeLeft,
      timeLeftBlack: game.black ? game.black.timeLeft : 600
    });

    // Jika waktu habis, pemain kalah karena timeout
    if (player.timeLeft <= 0) {
      clearInterval(player.timer);
      console.log(`[Game] Waktu pemain ${color === 'w' ? 'Putih' : 'Hitam'} habis di room ${game.roomId}`);
      await handleGameEnd(
        game, 
        io, 
        color === 'w' ? 'black_win' : 'white_win', 
        'timeout'
      );
    }
  }, 1000);
}

// Hentikan timer hitung mundur untuk pemain
function stopPlayerTimer(game, color) {
  const player = color === 'w' ? game.white : game.black;
  if (player && player.timer) {
    clearInterval(player.timer);
    player.timer = null;
  }
}

// Menangani kondisi akhir permainan catur dan menyimpan data ke DB
async function handleGameEnd(game, io, presetResult = null, presetReason = null) {
  // Cegah pemrosesan ganda
  if (game.status === 'gameover') return;
  game.status = 'gameover';

  // Hentikan semua timer aktif
  stopPlayerTimer(game, 'w');
  stopPlayerTimer(game, 'b');
  if (game.disconnectTimeout) clearTimeout(game.disconnectTimeout);

  let result = presetResult;
  let endReason = presetReason;
  let winnerId = null;
  let winnerUsername = 'Draw';

  // 1. Tentukan hasil berdasarkan catur jika tidak diset manual (seperti menyerah/RTO)
  if (!result) {
    if (game.chess.isCheckmate()) {
      const loserColor = game.chess.turn(); // Giliran aktif kalah
      result = loserColor === 'w' ? 'black_win' : 'white_win';
      endReason = 'checkmate';
    } else if (game.chess.isDraw()) {
      result = 'draw';
      if (game.chess.isStalemate()) endReason = 'stalemate';
      else if (game.chess.isThreefoldRepetition()) endReason = 'threefold_repetition';
      else if (game.chess.isInsufficientMaterial()) endReason = 'insufficient_material';
      else endReason = 'draw_rule';
    }
  }

  // Tentukan id pemenang
  if (result === 'white_win') {
    winnerId = game.white.playerId;
    winnerUsername = game.white.username;
  } else if (result === 'black_win' && game.black) {
    winnerId = game.black.playerId;
    winnerUsername = game.black.username;
  }

  // Hitung durasi permainan
  const durationSeconds = Math.round((Date.now() - game.startedAt) / 1000);

  try {
    // 2. Rekam di database dan hitung perubahan skor ELO secara otomatis
    const ratingChanges = await stats.recordMatchResult({
      matchId: game.roomId,
      whitePlayerId: game.white.playerId,
      blackPlayerId: game.black.playerId,
      winnerId: winnerId,
      result: result,
      endReason: endReason,
      movesPgn: game.movesHistory.join(' '),
      durationSeconds: durationSeconds
    });

    // 3. Siarkan event game over beserta informasi skor rating baru ke klien
    io.to(game.roomId).emit('game_over', {
      result,
      endReason,
      winner: winnerUsername,
      whitePlayer: {
        username: game.white.username,
        oldRating: ratingChanges.white.oldRating,
        newRating: ratingChanges.white.newRating,
        diff: ratingChanges.white.newRating - ratingChanges.white.oldRating
      },
      blackPlayer: {
        username: game.black.username,
        oldRating: ratingChanges.black.oldRating,
        newRating: ratingChanges.black.newRating,
        diff: ratingChanges.black.newRating - ratingChanges.black.oldRating
      }
    });

    console.log(`[Game] Pertandingan ${game.roomId} selesai. Pemenang: ${winnerUsername} (${endReason})`);
  } catch (err) {
    console.error('[Game] Gagal menyimpan hasil pertandingan ke database:', err);
    // Kirim event game_over tanpa perubahan rating jika DB gagal
    io.to(game.roomId).emit('game_over', {
      result,
      endReason,
      winner: winnerUsername,
      whitePlayer: { username: game.white.username, oldRating: 1200, newRating: 1200, diff: 0 },
      blackPlayer: { username: game.black.username, oldRating: 1200, newRating: 1200, diff: 0 }
    });
  } finally {
    // Hapus game dari room aktif
    activeGames.delete(game.roomId);
  }
}
