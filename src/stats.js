const db = require('../config/database');

// Mendapatkan atau membuat pemain baru jika belum ada
async function getOrCreatePlayer(username) {
  const cleanUsername = username.trim();
  const rows = await db.query('SELECT * FROM players WHERE username = ?', [cleanUsername]);
  
  if (rows.length > 0) {
    return rows[0];
  }
  
  // Buat pemain baru dengan Elo rating default 1200
  const result = await db.run(
    'INSERT INTO players (username, rating, matches_played, matches_won, matches_lost, matches_drawn) VALUES (?, 1200, 0, 0, 0, 0)',
    [cleanUsername]
  );
  
  return {
    id: result.insertId,
    username: cleanUsername,
    rating: 1200,
    matches_played: 0,
    matches_won: 0,
    matches_lost: 0,
    matches_drawn: 0
  };
}

// Menghitung probabilitas kemenangan berdasar ELO (Formula standar FIDE)
function getExpectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// Fungsi utama untuk merekam hasil pertandingan catur dan menghitung ELO secara otomatis di server
async function recordMatchResult({
  matchId,
  whitePlayerId,
  blackPlayerId,
  winnerId,
  result, // 'white_win', 'black_win', 'draw'
  endReason, // 'checkmate', 'stalemate', 'resign', 'timeout', 'draw_agreement'
  movesPgn = '',
  durationSeconds = 0
}) {
  return db.transaction(async (conn) => {
    // 1. Ambil data rating saat ini dari kedua pemain
    const players = await db.query('SELECT id, username, rating FROM players WHERE id IN (?, ?)', [
      whitePlayerId,
      blackPlayerId
    ]);
    
    const whitePlayer = players.find(p => p.id === parseInt(whitePlayerId));
    const blackPlayer = players.find(p => p.id === parseInt(blackPlayerId));
    
    if (!whitePlayer || !blackPlayer) {
      throw new Error('Salah satu pemain tidak ditemukan di database.');
    }
    
    const oldRatingWhite = whitePlayer.rating;
    const oldRatingBlack = blackPlayer.rating;
    
    // 2. Tentukan skor aktual (S)
    let scoreWhite = 0.5;
    let scoreBlack = 0.5;
    
    if (result === 'white_win') {
      scoreWhite = 1;
      scoreBlack = 0;
    } else if (result === 'black_win') {
      scoreWhite = 0;
      scoreBlack = 1;
    }
    
    // 3. Hitung skor harapan (E)
    const expectedWhite = getExpectedScore(oldRatingWhite, oldRatingBlack);
    const expectedBlack = getExpectedScore(oldRatingBlack, oldRatingWhite);
    
    // 4. Hitung rating ELO baru (K-Factor = 32)
    const K = 32;
    const newRatingWhite = Math.round(oldRatingWhite + K * (scoreWhite - expectedWhite));
    const newRatingBlack = Math.round(oldRatingBlack + K * (scoreBlack - expectedBlack));
    
    // 5. Simpan pertandingan ke tabel matches
    await db.run(
      `INSERT INTO matches (id, white_player_id, black_player_id, winner_id, result, end_reason, moves_pgn, duration_seconds, ended_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        matchId,
        whitePlayerId,
        blackPlayerId,
        winnerId || null,
        result,
        endReason,
        movesPgn,
        durationSeconds
      ]
    );
    
    // 6. Simpan riwayat rating pemain (rating history)
    await db.run(
      'INSERT INTO player_rating_history (player_id, match_id, rating_after) VALUES (?, ?, ?)',
      [whitePlayerId, matchId, newRatingWhite]
    );
    await db.run(
      'INSERT INTO player_rating_history (player_id, match_id, rating_after) VALUES (?, ?, ?)',
      [blackPlayerId, matchId, newRatingBlack]
    );
    
    // 7. Update profil pemain (rating, stats jumlah menang/kalah/seri)
    let whiteWonInc = result === 'white_win' ? 1 : 0;
    let whiteLostInc = result === 'black_win' ? 1 : 0;
    let whiteDrawInc = result === 'draw' ? 1 : 0;
    
    let blackWonInc = result === 'black_win' ? 1 : 0;
    let blackLostInc = result === 'white_win' ? 1 : 0;
    let blackDrawInc = result === 'draw' ? 1 : 0;
    
    await db.run(
      `UPDATE players SET 
        rating = ?, 
        matches_played = matches_played + 1, 
        matches_won = matches_won + ?, 
        matches_lost = matches_lost + ?, 
        matches_drawn = matches_drawn + ? 
       WHERE id = ?`,
      [newRatingWhite, whiteWonInc, whiteLostInc, whiteDrawInc, whitePlayerId]
    );
    
    await db.run(
      `UPDATE players SET 
        rating = ?, 
        matches_played = matches_played + 1, 
        matches_won = matches_won + ?, 
        matches_lost = matches_lost + ?, 
        matches_drawn = matches_drawn + ? 
       WHERE id = ?`,
      [newRatingBlack, blackWonInc, blackLostInc, blackDrawInc, blackPlayerId]
    );
    
    console.log(`[Stats] Hasil pertandingan disimpan. Rating terupdate - ${whitePlayer.username}: ${oldRatingWhite} -> ${newRatingWhite}, ${blackPlayer.username}: ${oldRatingBlack} -> ${newRatingBlack}`);
    
    return {
      white: { oldRating: oldRatingWhite, newRating: newRatingWhite },
      black: { oldRating: oldRatingBlack, newRating: newRatingBlack }
    };
  });
}

// Mendapatkan data Leaderboard global
async function getLeaderboard() {
  return db.query(`
    SELECT id, username, rating, matches_played, matches_won, matches_lost, matches_drawn,
      CASE WHEN matches_played > 0 THEN ROUND((matches_won * 100.0 / matches_played), 1) ELSE 0 END as win_rate
    FROM players 
    ORDER BY rating DESC 
    LIMIT 20
  `);
}

// Mendapatkan daftar riwayat pertandingan terakhir
async function getRecentMatches() {
  return db.query(`
    SELECT m.id, m.result, m.end_reason, m.duration_seconds, m.ended_at,
      p1.username as white_player, p2.username as black_player,
      pw.username as winner
    FROM matches m
    JOIN players p1 ON m.white_player_id = p1.id
    JOIN players p2 ON m.black_player_id = p2.id
    LEFT JOIN players pw ON m.winner_id = pw.id
    ORDER BY m.ended_at DESC
    LIMIT 30
  `);
}

// Mendapatkan statistik performa individu & riwayat rating untuk grafik
async function getPlayerStats(playerId) {
  const players = await db.query('SELECT * FROM players WHERE id = ?', [playerId]);
  if (players.length === 0) return null;
  const player = players[0];
  
  const ratingHistory = await db.query(`
    SELECT rating_after, recorded_at 
    FROM player_rating_history 
    WHERE player_id = ? 
    ORDER BY id ASC
  `, [playerId]);
  
  return {
    player,
    ratingHistory
  };
}

// Melakukan analisis statistik performa berdasarkan instruksi dosen
async function getPerformanceAnalysis() {
  // Ambil semua pemain dengan minimal 5 pertandingan
  const activePlayers = await db.query(`
    SELECT id, username, rating, matches_played, matches_won, matches_lost, matches_drawn 
    FROM players 
    WHERE matches_played >= 5
  `);
  
  const analysisResults = [];
  
  for (const player of activePlayers) {
    const history = await db.query(`
      SELECT rating_after 
      FROM player_rating_history 
      WHERE player_id = ? 
      ORDER BY id ASC
    `, [player.id]);
    
    const ratings = history.map(h => h.rating_after);
    const N = ratings.length;
    
    if (N < 2) continue;
    
    // 1. Analisis Tren (Slope): Menggunakan rumus regresi linier sederhana y = mx + c untuk menghitung kemiringan (m)
    // x = indeks pertandingan (0 sampai N-1), y = rating_after
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < N; i++) {
      sumX += i;
      sumY += ratings[i];
      sumXY += i * ratings[i];
      sumXX += i * i;
    }
    const meanX = sumX / N;
    const meanY = sumY / N;
    
    // Hitung kemiringan (m) - jika positif artinya performa cenderung meningkat seiring waktu
    let slope = 0;
    const numerator = sumXY - N * meanX * meanY;
    const denominator = sumXX - N * meanX * meanX;
    if (denominator !== 0) {
      slope = numerator / denominator;
    }
    
    // 2. Analisis Konsistensi: Standar Deviasi dari rating.
    // Semakin kecil standar deviasinya, semakin konsisten performa rating pemain (fluktuasi stabil)
    const sumVariance = ratings.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
    const stdDev = Math.sqrt(sumVariance / (N - 1));
    
    // 3. Analisis Hipotesis (Pre vs Post): Bandingkan rata-rata 3 game pertama vs 3 game terakhir
    const preRatings = ratings.slice(0, Math.min(3, Math.ceil(N / 2)));
    const postRatings = ratings.slice(-Math.min(3, Math.ceil(N / 2)));
    
    const avgPre = preRatings.reduce((a, b) => a + b, 0) / preRatings.length;
    const avgPost = postRatings.reduce((a, b) => a + b, 0) / postRatings.length;
    const ratingImprovement = avgPost - avgPre;
    
    analysisResults.push({
      playerId: player.id,
      username: player.username,
      matchesPlayed: N,
      currentRating: player.rating,
      slope: parseFloat(slope.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      avgPre: parseFloat(avgPre.toFixed(1)),
      avgPost: parseFloat(avgPost.toFixed(1)),
      ratingImprovement: parseFloat(ratingImprovement.toFixed(1)),
      isImproving: slope > 0,
      isHighlyConsistent: stdDev < 40 // batas subjektif untuk kestabilan rating
    });
  }
  
  // Urutkan berdasarkan tingkat konsistensi (Standar Deviasi terkecil)
  const consistencyRank = [...analysisResults].sort((a, b) => a.stdDev - b.stdDev);
  
  // Uji Hipotesis Kelompok: Apakah rata-rata peningkatan rating seluruh pemain aktif bernilai positif?
  const overallImprovement = analysisResults.reduce((sum, p) => sum + p.ratingImprovement, 0) / (analysisResults.length || 1);
  const hypothesisProven = overallImprovement > 0;
  
  return {
    playersAnalysis: analysisResults,
    consistencyRank,
    overallImprovement: parseFloat(overallImprovement.toFixed(2)),
    hypothesisProven,
    hypothesisStatement: "Latihan berulang melalui game catur online real-time meningkatkan rating performa pemain dan menstabilkan konsistensi strategi bermain."
  };
}

module.exports = {
  getOrCreatePlayer,
  recordMatchResult,
  getLeaderboard,
  getRecentMatches,
  getPlayerStats,
  getPerformanceAnalysis
};
