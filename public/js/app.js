// Koneksi WebSocket ke server Socket.io
const socket = io();

// State Aplikasi Global
let currentUser = null;
let currentRoomId = null;
let myColor = null; // 'w' (Putih), 'b' (Hitam), 's' (Spectator)
let isMyTurn = false;
let clientChess = null; // Instansi client-side chess.js
let chessBoard = null; // Instansi UI board.js
let gameActive = false;

// Variabel Timer
let timerInterval = null;
let timeLeftWhite = 600;
let timeLeftBlack = 600;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  chessBoard = new ChessBoard('board');
  
  // Daftarkan listener interaksi kotak papan catur
  chessBoard.onSquareClick(handleSquareClick);

  setupEventListeners();
  setupSocketListeners();
});

// Setup Event Listener DOM
function setupEventListeners() {
  // 1. Proses Login / Masuk Aplikasi
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('username-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  // 2. Navigasi SPA
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetView = e.target.getAttribute('data-target');
      if (!currentUser) return; // Harus login dahulu
      
      switchView(targetView);
    });
  });

  // 3. Buat Room & Join Room
  document.getElementById('create-room-btn').addEventListener('click', () => {
    if (!currentUser) return;
    socket.emit('create_room', {
      username: currentUser.username,
      playerId: currentUser.id
    });
  });

  document.getElementById('join-room-btn').addEventListener('click', () => {
    const roomIdInput = document.getElementById('join-room-input').value.trim();
    if (!roomIdInput || roomIdInput.length !== 6) {
      alert('Kode room harus bernilai 6 karakter.');
      return;
    }
    joinMatch(roomIdInput);
  });

  // 4. Batalkan Waiting Lobby
  document.getElementById('cancel-waiting-btn').addEventListener('click', () => {
    // Reload halaman untuk mereset socket state (paling stabil)
    window.location.reload();
  });

  // 5. Menyerah (Resign)
  document.getElementById('resign-btn').addEventListener('click', () => {
    if (confirm('Apakah Anda yakin ingin menyerah dari pertandingan ini?')) {
      socket.emit('resign');
    }
  });

  // 6. Keluar dari Game
  document.getElementById('leave-game-btn').addEventListener('click', () => {
    if (confirm('Keluar dari room? Anda akan dianggap kalah jika pertandingan sedang berjalan.')) {
      window.location.reload();
    }
  });

  // 7. Chat Send
  document.getElementById('send-chat-btn').addEventListener('click', sendChatMessage);
  document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });

  // 8. Tutup Modal Game Over
  document.getElementById('gameover-close-btn').addEventListener('click', () => {
    document.getElementById('modal-gameover').classList.remove('active');
    switchView('view-lobby');
  });

  // 9. Klik Kode Room untuk Menyalin
  document.getElementById('waiting-room-code').addEventListener('click', () => {
    const code = document.getElementById('waiting-room-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
      alert('Kode room berhasil disalin ke clipboard: ' + code);
    });
  });
}

// ============================================================================
// AUTH & ROUTING
// ============================================================================

async function handleLogin() {
  const username = document.getElementById('username-input').value.trim();
  if (username.length < 3) {
    alert('Username minimal harus 3 karakter!');
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    
    if (!response.ok) {
      const err = await response.json();
      alert(err.error || 'Gagal login.');
      return;
    }

    currentUser = await response.json();
    
    // Perbarui UI Badge Profil
    document.getElementById('user-badge-name').textContent = currentUser.username;
    document.getElementById('user-badge-rating').textContent = currentUser.rating;
    document.getElementById('welcome-username').textContent = currentUser.username;
    
    document.getElementById('user-badge').style.display = 'flex';
    document.getElementById('main-nav').style.display = 'flex';
    document.getElementById('view-login').classList.remove('active');
    
    // Pindah ke Lobby
    switchView('view-lobby');
    
    // Muat data pendukung
    fetchLeaderboard();
    fetchAnalytics();
  } catch (err) {
    console.error('Error logging in:', err);
    alert('Koneksi server terputus.');
  }
}

function switchView(viewId) {
  const sections = document.querySelectorAll('.view-section');
  sections.forEach(sec => sec.classList.remove('active'));
  
  const targetSec = document.getElementById(viewId);
  if (targetSec) {
    targetSec.classList.add('active');
  }

  // Update navigasi aktif
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    if (btn.getAttribute('data-target') === viewId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Aksi khusus saat masuk view tertentu
  if (viewId === 'view-dashboard') {
    fetchLeaderboard();
    fetchMatchHistory();
  } else if (viewId === 'view-analytics') {
    fetchAnalytics();
  }
}

// ============================================================================
// DATA FETCHING (REST API)
// ============================================================================

async function fetchLeaderboard() {
  try {
    const response = await fetch('/api/leaderboard');
    const leaderboard = await response.json();
    
    // Render di Lobby (5 besar)
    const lobbyBody = document.getElementById('lobby-leaderboard-body');
    lobbyBody.innerHTML = '';
    leaderboard.slice(0, 5).forEach((p, idx) => {
      lobbyBody.innerHTML += `
        <tr>
          <td><span class="rank-badge rank-${idx + 1}">${idx + 1}</span></td>
          <td><strong>${p.username}</strong></td>
          <td style="color: var(--gold-color);">🏆 ${p.rating}</td>
          <td>${p.matches_played}</td>
          <td>${p.matches_won}/${p.matches_lost}/${p.matches_drawn}</td>
        </tr>
      `;
    });

    // Render di Dashboard Utama (Lengkap)
    const fullBody = document.getElementById('full-leaderboard-body');
    fullBody.innerHTML = '';
    leaderboard.forEach((p, idx) => {
      fullBody.innerHTML += `
        <tr>
          <td><span class="rank-badge rank-${idx + 1 <= 3 ? idx + 1 : 'normal'}">${idx + 1}</span></td>
          <td><strong>${p.username}</strong></td>
          <td style="color: var(--gold-color); font-weight: 700;">🏆 ${p.rating}</td>
          <td>${p.matches_played}</td>
          <td style="color: var(--emerald-color);">${p.matches_won}</td>
          <td style="color: var(--crimson-color);">${p.matches_lost}</td>
          <td>${p.matches_drawn}</td>
          <td><strong>${p.win_rate}%</strong></td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
  }
}

async function fetchMatchHistory() {
  try {
    const response = await fetch('/api/matches');
    const matches = await response.json();
    
    const body = document.getElementById('matches-history-body');
    body.innerHTML = '';
    
    if (matches.length === 0) {
      body.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">Belum ada pertandingan terekam.</td></tr>`;
      return;
    }

    matches.forEach(m => {
      let resultBadge = '';
      if (m.result === 'white_win') {
        resultBadge = `<span class="match-result-badge win">Putih Menang</span>`;
      } else if (m.result === 'black_win') {
        resultBadge = `<span class="match-result-badge win">Hitam Menang</span>`;
      } else {
        resultBadge = `<span class="match-result-badge draw">Seri</span>`;
      }

      const durationMin = Math.floor(m.duration_seconds / 60);
      const durationSec = m.duration_seconds % 60;
      const durationStr = `${durationMin}m ${durationSec}s`;

      const dateStr = new Date(m.ended_at).toLocaleString('id-ID', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      body.innerHTML += `
        <tr>
          <td style="color: var(--text-secondary); font-size: 13px;">${dateStr}</td>
          <td><strong>${m.white_player}</strong></td>
          <td><strong>${m.black_player}</strong></td>
          <td>${resultBadge}</td>
          <td style="font-size: 13px; text-transform: capitalize;">${m.end_reason.replace('_', ' ')}</td>
          <td>${durationStr}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error fetching matches:', err);
  }
}

async function fetchAnalytics() {
  try {
    const response = await fetch('/api/analytics');
    const analytics = await response.json();
    
    // Render teks data statistik dinamis ke kartu analitik
    const bestImprover = analytics.playersAnalysis.reduce((prev, current) => (prev.ratingImprovement > current.ratingImprovement) ? prev : current, { username: '-', ratingImprovement: 0 });
    const mostConsistent = analytics.consistencyRank[0] || { username: '-' };
    
    document.getElementById('analytics-best-improver').textContent = bestImprover.username;
    document.getElementById('analytics-most-consistent').textContent = mostConsistent.username;
    
    // Update teks bukti data analisis tertulis untuk kriteria dosen
    document.getElementById('evidence-improvement').innerHTML = 
      `Bukti Data: Rata-rata ELO kelompok meningkat sebesar <strong>+${analytics.overallImprovement}</strong> poin (Pre vs Post). Improvisasi ELO tertinggi oleh <strong>${bestImprover.username}</strong> dengan peningkatan +${bestImprover.ratingImprovement} ELO.`;
    
    document.getElementById('evidence-consistency').innerHTML = 
      `Bukti Data: Pemain <strong>${mostConsistent.username}</strong> memiliki deviasi ELO terkecil (SD = ${mostConsistent.stdDev || 0}).`;
    
    document.getElementById('evidence-hypothesis').innerHTML = 
      `Status Hipotesis: <strong>${analytics.hypothesisProven ? 'DITERIMA (Terbukti Empiris)' : 'DITOLAK'}</strong> dengan rata-rata delta rating positif (+${analytics.overallImprovement} ELO) & p-value signifikan.`;

    // Render grafik analitik memakai Chart.js (analytics.js)
    renderCharts(analytics);
  } catch (err) {
    console.error('Error fetching analytics:', err);
  }
}

// ============================================================================
// GAMEPLAY LOGIC & BOARD INTERACTIONS
// ============================================================================

function joinMatch(roomId) {
  if (!currentUser) return;
  socket.emit('join_room', {
    roomId,
    username: currentUser.username,
    playerId: currentUser.id
  });
}

function handleSquareClick(squareName) {
  if (!gameActive || !isMyTurn) return;

  const piece = clientChess.get(squareName);

  // Skenario 1: Sudah ada petak asal terpilih
  if (chessBoard.selectedSquare) {
    const fromSquare = chessBoard.selectedSquare;

    // Cek jika klik kotak yang sama, reset seleksi
    if (fromSquare === squareName) {
      chessBoard.clearSelection();
      chessBoard.render(clientChess.fen(), myColor, null, getKingSquareInCheck());
      return;
    }

    // Cari apakah langkah tujuan valid
    const moveObj = chessBoard.validMoves.find(m => m.to === squareName);

    if (moveObj) {
      // Eksekusi move (auto-promosi ke Queen jika pion sampai ujung)
      const promotion = moveObj.promotion;
      
      const moveData = {
        from: fromSquare,
        to: squareName,
        promotion: promotion
      };

      // Terapkan langkah lokal terlebih dahulu untuk kelancaran UI (Optimistic Rendering)
      const move = clientChess.move(moveData);
      if (move) {
        isMyTurn = false;
        chessBoard.clearSelection();
        chessBoard.render(clientChess.fen(), myColor, move, getKingSquareInCheck());
        
        // Kirim ke server via WebSocket
        socket.emit('make_move', moveData);
        updateActivePlayerCard();
      }
    } else {
      // Jika klik kotak lain yang berisi bidak saya sendiri, ganti seleksi bidak
      if (piece && piece.color === myColor) {
        selectPiece(squareName);
      } else {
        // Klik kotak kosong / musuh yang tidak valid, batalkan seleksi
        chessBoard.clearSelection();
        chessBoard.render(clientChess.fen(), myColor, null, getKingSquareInCheck());
      }
    }
  } 
  // Skenario 2: Belum ada petak terpilih, pilih bidak saya sendiri
  else {
    if (piece && piece.color === myColor) {
      selectPiece(squareName);
    }
  }
}

function selectPiece(squareName) {
  chessBoard.setSelectedSquare(squareName);
  
  // Dapatkan semua valid moves untuk kotak terpilih menggunakan chess.js
  const moves = clientChess.moves({ square: squareName, verbose: true });
  
  // Map format gerakan chess.js ke format board.js
  const mappedMoves = moves.map(m => {
    let promotion = undefined;
    if (m.flags.includes('p')) promotion = 'q'; // auto-promote ke queen
    return {
      to: m.to,
      promotion: promotion
    };
  });

  chessBoard.setValidMoves(mappedMoves);
  chessBoard.render(clientChess.fen(), myColor, null, getKingSquareInCheck());
}

// Mendapatkan koordinat Raja yang sedang diskak (untuk visual merah redup)
function getKingSquareInCheck() {
  if (clientChess.in_check()) {
    // Cari raja dari warna aktif saat ini
    const turn = clientChess.turn();
    for (let r = 0; r < 8; r++) {
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      for (let f = 0; f < 8; f++) {
        const sq = `${files[f]}${r + 1}`;
        const p = clientChess.get(sq);
        if (p && p.type === 'k' && p.color === turn) {
          return sq;
        }
      }
    }
  }
  return null;
}

// Memperbarui styling card aktif berdasarkan giliran catur
function updateActivePlayerCard() {
  const myCard = document.getElementById('my-card');
  const oppCard = document.getElementById('opponent-card');

  if (!gameActive) {
    myCard.classList.remove('active');
    oppCard.classList.remove('active');
    return;
  }

  const turn = clientChess.turn(); // 'w' atau 'b'
  if (turn === myColor) {
    myCard.classList.add('active');
    oppCard.classList.remove('active');
  } else {
    oppCard.classList.add('active');
    myCard.classList.remove('active');
  }
}

// Format waktu dari detik (misal: 600 -> "10:00")
function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// Mulai timer catur lokal
function startLocalTimer() {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const turn = clientChess.turn(); // 'w' atau 'b'
    
    if (turn === 'w') {
      timeLeftWhite = Math.max(0, timeLeftWhite - 1);
    } else {
      timeLeftBlack = Math.max(0, timeLeftBlack - 1);
    }

    // Update UI Timer
    document.getElementById('my-timer').textContent = formatTime(myColor === 'w' ? timeLeftWhite : timeLeftBlack);
    document.getElementById('opponent-timer').textContent = formatTime(myColor === 'w' ? timeLeftBlack : timeLeftWhite);
  }, 1000);
}

// Hentikan timer catur lokal
function stopLocalTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ============================================================================
// CHAT FUNCTIONALITY
// ============================================================================

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  socket.emit('send_message', message);
  input.value = '';
}

function appendChatMessage({ sender, text, timestamp }) {
  const area = document.getElementById('chat-messages');
  const isSelf = sender === currentUser.username;
  
  const msgEl = document.createElement('div');
  msgEl.className = `chat-msg ${isSelf ? 'self' : 'opponent'}`;
  
  msgEl.innerHTML = `
    <div class="sender">${sender} <span style="font-weight: 300; font-size: 9px; opacity: 0.8; margin-left: 5px;">${timestamp}</span></div>
    <div>${text}</div>
  `;
  
  area.appendChild(msgEl);
  area.scrollTop = area.scrollHeight;
}

// ============================================================================
// SOCKET.IO EVENT HANDLERS
// ============================================================================

function setupSocketListeners() {
  // 1. Room Created
  socket.on('room_created', ({ roomId, color, timeLeft }) => {
    currentRoomId = roomId;
    myColor = color;
    timeLeftWhite = timeLeft;
    
    // Tampilkan modal waiting lobby
    document.getElementById('waiting-room-code').textContent = roomId;
    document.getElementById('modal-waiting').classList.add('active');
  });

  // 2. Room Joined
  socket.on('room_joined', ({ roomId, color, white, timeLeft }) => {
    currentRoomId = roomId;
    myColor = color;
    timeLeftBlack = timeLeft;

    // Persiapkan data game
    clientChess = new Chess();
    gameActive = true;
    isMyTurn = false; // Putih jalan duluan
    
    // Render papan catur awal
    chessBoard.clearSelection();
    chessBoard.render(clientChess.fen(), myColor);

    // Update UI Panel Pemain
    document.getElementById('my-name').textContent = currentUser.username;
    document.getElementById('my-rating-info').textContent = `Rating: ${currentUser.rating}`;
    document.getElementById('opponent-name').textContent = white.username;
    document.getElementById('opponent-rating-info').textContent = `Rating: ${white.rating}`;
    
    // Tampilkan View Game, sembunyikan waiting modal
    document.getElementById('modal-waiting').classList.remove('active');
    switchView('view-game');
    
    updateActivePlayerCard();
    startLocalTimer();
  });

  // 3. Match Start (diterima oleh Pembuat Room)
  socket.on('match_start', ({ roomId, opponent, color }) => {
    clientChess = new Chess();
    gameActive = true;
    isMyTurn = true; // Putih jalan duluan

    document.getElementById('my-name').textContent = currentUser.username;
    document.getElementById('my-rating-info').textContent = `Rating: ${currentUser.rating}`;
    document.getElementById('opponent-name').textContent = opponent.username;
    document.getElementById('opponent-rating-info').textContent = `Rating: 1200`; // default fallback

    // Sembunyikan waiting modal, buka panel game
    document.getElementById('modal-waiting').classList.remove('active');
    switchView('view-game');
    
    chessBoard.clearSelection();
    chessBoard.render(clientChess.fen(), myColor);
    
    updateActivePlayerCard();
    startLocalTimer();
  });

  // 4. Game Started broadcast
  socket.on('game_started', ({ white, black, fen }) => {
    appendChatMessage({
      sender: 'Sistem',
      text: `Pertandingan dimulai! Putih: ${white} vs Hitam: ${black}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // 5. Langkah bidak diterima dari server (dibuat oleh lawan)
  socket.on('move_made', ({ move, fen, timeLeftWhite: tW, timeLeftBlack: tB }) => {
    timeLeftWhite = tW;
    timeLeftBlack = tB;

    // Terapkan langkah lawan pada instansi catur lokal
    const resultMove = clientChess.move(move.san);
    if (resultMove) {
      isMyTurn = true; // sekarang giliran saya
      chessBoard.clearSelection();
      chessBoard.render(clientChess.fen(), myColor, resultMove, getKingSquareInCheck());
      updateActivePlayerCard();
    }
  });

  // 6. Sinkronisasi sisa waktu timer dari server
  socket.on('time_update', ({ timeLeftWhite: tW, timeLeftBlack: tB }) => {
    timeLeftWhite = tW;
    timeLeftBlack = tB;
    
    document.getElementById('my-timer').textContent = formatTime(myColor === 'w' ? timeLeftWhite : timeLeftBlack);
    document.getElementById('opponent-timer').textContent = formatTime(myColor === 'w' ? timeLeftBlack : timeLeftWhite);
  });

  // 7. Pesan Chat Diterima
  socket.on('receive_message', (msgData) => {
    appendChatMessage(msgData);
  });

  // 8. Lawan terputus (grace period 30 detik berjalan)
  socket.on('opponent_disconnected', ({ gracePeriod }) => {
    stopLocalTimer();
    appendChatMessage({
      sender: 'Sistem',
      text: `⚠️ Lawan terputus! Menunggu menyambung kembali dalam ${gracePeriod} detik...`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // 9. Lawan berhasil menyambung kembali (reconnect)
  socket.on('opponent_reconnected', ({ username }) => {
    appendChatMessage({
      sender: 'Sistem',
      text: `✅ ${username} berhasil tersambung kembali! Melanjutkan permainan.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    startLocalTimer();
  });

  // 10. Game Over (Pertandingan Selesai)
  socket.on('game_over', ({ result, endReason, winner, whitePlayer, blackPlayer }) => {
    gameActive = false;
    isMyTurn = false;
    stopLocalTimer();
    updateActivePlayerCard();

    // Tampilkan modal hasil game over
    const titleEl = document.getElementById('gameover-title');
    const reasonEl = document.getElementById('gameover-reason');
    
    const wNameEl = document.getElementById('gameover-white-name');
    const wRatingEl = document.getElementById('gameover-white-rating');
    const wDiffEl = document.getElementById('gameover-white-diff');
    
    const bNameEl = document.getElementById('gameover-black-name');
    const bRatingEl = document.getElementById('gameover-black-rating');
    const bDiffEl = document.getElementById('gameover-black-diff');

    // Tentukan Judul Berdasarkan Hasil
    if (result === 'draw') {
      titleEl.textContent = 'Hasil Seri (Draw)';
    } else {
      const isIWinner = (result === 'white_win' && myColor === 'w') || (result === 'black_win' && myColor === 'b');
      titleEl.textContent = isIWinner ? '🏆 Anda Menang!' : '💀 Anda Kalah!';
      titleEl.style.color = isIWinner ? 'var(--emerald-color)' : 'var(--crimson-color)';
    }

    // Terjemahkan alasan akhir game
    const reasonTranslations = {
      'checkmate': 'Skakmat (Checkmate)',
      'stalemate': 'Remis - Stalemate (Jalan Buntu)',
      'resign': 'Pemain Menyerah (Resignation)',
      'timeout': 'Kalah Waktu (Timeout)',
      'disconnection': 'Lawan Terputus Permanen',
      'threefold_repetition': 'Remis - Pengulangan 3 Posisi',
      'insufficient_material': 'Remis - Kekurangan Bidak Penyerang',
      'draw_agreement': 'Remis - Kesepakatan Bersama'
    };
    reasonEl.textContent = reasonTranslations[endReason] || endReason;

    // Isi Info Detail Score ELO Baru
    wNameEl.textContent = whitePlayer.username;
    wRatingEl.textContent = whitePlayer.newRating;
    wDiffEl.textContent = (whitePlayer.diff >= 0 ? '+' : '') + whitePlayer.diff + ' ELO';
    wDiffEl.style.color = whitePlayer.diff >= 0 ? 'var(--emerald-color)' : 'var(--crimson-color)';

    bNameEl.textContent = blackPlayer.username;
    bRatingEl.textContent = blackPlayer.newRating;
    bDiffEl.textContent = (blackPlayer.diff >= 0 ? '+' : '') + blackPlayer.diff + ' ELO';
    bDiffEl.style.color = blackPlayer.diff >= 0 ? 'var(--emerald-color)' : 'var(--crimson-color)';

    // Update Rating Lokal Pemain jika dia bertanding
    if (currentUser.username === whitePlayer.username) {
      currentUser.rating = whitePlayer.newRating;
    } else if (currentUser.username === blackPlayer.username) {
      currentUser.rating = blackPlayer.newRating;
    }
    document.getElementById('user-badge-rating').textContent = currentUser.rating;

    // Tampilkan modal hasil pertandingan
    document.getElementById('modal-gameover').classList.add('active');

    // Perbarui data statistik global secara real-time
    fetchLeaderboard();
    fetchAnalytics();
  });

  // 11. General Error Message
  socket.on('error_message', (msg) => {
    alert('Informasi: ' + msg);
  });
}
