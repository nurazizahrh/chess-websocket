const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./config/database');
const stats = require('./src/stats');
const initSocketHandler = require('./src/socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3030;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Login / Registrasi Pemain
app.post('/api/login', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username minimal harus 3 karakter.' });
    }
    const player = await stats.getOrCreatePlayer(username);
    res.json(player);
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// Mendapatkan data Leaderboard global
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await stats.getLeaderboard();
    res.json(leaderboard);
  } catch (err) {
    console.error('Error getting leaderboard:', err);
    res.status(500).json({ error: 'Gagal mengambil data leaderboard.' });
  }
});

// Mendapatkan histori pertandingan terakhir
app.get('/api/matches', async (req, res) => {
  try {
    const matches = await stats.getRecentMatches();
    res.json(matches);
  } catch (err) {
    console.error('Error getting matches:', err);
    res.status(500).json({ error: 'Gagal mengambil riwayat pertandingan.' });
  }
});

// Mendapatkan detail statistik performa pemain individu
app.get('/api/player/:id', async (req, res) => {
  try {
    const playerId = req.params.id;
    const playerStats = await stats.getPlayerStats(playerId);
    if (!playerStats) {
      return res.status(404).json({ error: 'Pemain tidak ditemukan.' });
    }
    res.json(playerStats);
  } catch (err) {
    console.error('Error getting player stats:', err);
    res.status(500).json({ error: 'Gagal mengambil statistik pemain.' });
  }
});

// Mendapatkan analisis data komprehensif (untuk visualisasi grafik dosen)
app.get('/api/analytics', async (req, res) => {
  try {
    const analysis = await stats.getPerformanceAnalysis();
    res.json(analysis);
  } catch (err) {
    console.error('Error getting analytics:', err);
    res.status(500).json({ error: 'Gagal melakukan analisis statistik.' });
  }
});

// Layani file index.html untuk semua route agar client-side routing berjalan (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

async function startServer() {
  try {
    // Inisialisasi Database (menghubungkan MySQL & memuat tabel/dummy data)
    await db.initialize();
    
    // Inisialisasi Event-Event WebSocket
    initSocketHandler(io);
    
    server.listen(PORT, () => {
      console.log(`================================================================`);
      console.log(`[Server] Game Catur Real-Time berjalan di http://localhost:${PORT}`);
      console.log(`================================================================`);
    });
  } catch (err) {
    console.error('Server gagal dijalankan:', err);
    process.exit(1);
  }
}

startServer();
