-- Skema Database MySQL untuk Proyek Akhir Game Catur Real-Time WebSocket
-- Menyimpan data pemain, riwayat pertandingan, dan histori rating Elo untuk analisis statistik

-- Hapus database jika sudah ada sebelumnya (hati-hati jika digunakan pada production)
-- CREATE DATABASE IF NOT EXISTS chess_db;
-- USE chess_db;

-- 1. Tabel Pemain (Players)
CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    rating INT DEFAULT 1200,
    matches_played INT DEFAULT 0,
    matches_won INT DEFAULT 0,
    matches_lost INT DEFAULT 0,
    matches_drawn INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Pertandingan (Matches)
CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR(36) PRIMARY KEY,
    white_player_id INT NOT NULL,
    black_player_id INT NOT NULL,
    winner_id INT NULL, -- NULL jika seri (draw)
    result VARCHAR(15) NOT NULL, -- 'white_win', 'black_win', 'draw'
    end_reason VARCHAR(30) NOT NULL, -- 'checkmate', 'stalemate', 'resign', 'timeout', 'draw_agreement'
    moves_pgn TEXT, -- Catatan langkah-langkah catur dalam notasi standar (PGN)
    duration_seconds INT DEFAULT 0, -- Durasi game dalam detik
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (white_player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (black_player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES players(id) ON DELETE SET NULL
);

-- 3. Tabel Histori Rating Pemain (Player Rating History)
-- Sangat krusial untuk menganalisis tren performa pemain dari waktu ke waktu
CREATE TABLE IF NOT EXISTS player_rating_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    match_id VARCHAR(36) NOT NULL,
    rating_after INT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

-- ============================================================================
-- DUMMY DATA UNTUK ANALISIS STATISTIK AWAL
-- ============================================================================

-- Masukkan 4 pemain dummy
INSERT INTO players (id, username, rating, matches_played, matches_won, matches_lost, matches_drawn) VALUES
(1, 'Nur_Azizah', 1420, 20, 14, 4, 2),
(2, 'Budi_Santoso', 1345, 15, 9, 4, 2),
(3, 'Iwan_Setiawan', 1205, 12, 5, 5, 2),
(4, 'Ani_Lestari', 1250, 10, 5, 4, 1)
ON DUPLICATE KEY UPDATE id=id;

-- Riwayat Pertandingan Dummy (Simulasi 20 pertandingan)
-- Room-ID akan menggunakan string acak 6-karakter
INSERT INTO matches (id, white_player_id, black_player_id, winner_id, result, end_reason, duration_seconds, started_at, ended_at) VALUES
('ROOM01', 1, 2, 1, 'white_win', 'checkmate', 450, '2026-07-01 10:00:00', '2026-07-01 10:07:30'),
('ROOM02', 2, 3, 2, 'white_win', 'checkmate', 612, '2026-07-01 11:15:00', '2026-07-01 11:25:12'),
('ROOM03', 3, 4, 4, 'black_win', 'resign', 320, '2026-07-02 09:30:00', '2026-07-02 09:35:20'),
('ROOM04', 4, 1, 1, 'black_win', 'timeout', 900, '2026-07-02 14:00:00', '2026-07-02 14:15:00'),
('ROOM05', 1, 3, 1, 'white_win', 'checkmate', 510, '2026-07-03 08:00:00', '2026-07-03 08:08:30'),
('ROOM06', 2, 4, 2, 'white_win', 'resign', 280, '2026-07-03 16:30:00', '2026-07-03 16:34:40'),
('ROOM07', 3, 1, 1, 'black_win', 'checkmate', 715, '2026-07-04 10:10:00', '2026-07-04 10:21:55'),
('ROOM08', 4, 2, NULL, 'draw', 'draw_agreement', 850, '2026-07-04 15:40:00', '2026-07-04 15:54:10'),
('ROOM09', 1, 2, 1, 'white_win', 'checkmate', 480, '2026-07-05 11:00:00', '2026-07-05 11:08:00'),
('ROOM10', 2, 3, NULL, 'draw', 'stalemate', 950, '2026-07-05 13:20:00', '2026-07-05 13:35:50'),
('ROOM11', 3, 4, 3, 'white_win', 'checkmate', 560, '2026-07-06 09:00:00', '2026-07-06 09:09:20'),
('ROOM12', 4, 1, 1, 'black_win', 'resign', 410, '2026-07-06 14:30:00', '2026-07-06 14:36:50'),
('ROOM13', 1, 3, 1, 'white_win', 'checkmate', 580, '2026-07-07 10:00:00', '2026-07-07 10:09:40'),
('ROOM14', 2, 4, 2, 'white_win', 'timeout', 900, '2026-07-07 15:00:00', '2026-07-07 15:15:00'),
('ROOM15', 3, 1, 1, 'black_win', 'checkmate', 640, '2026-07-08 09:30:00', '2026-07-08 09:40:40'),
('ROOM16', 4, 2, 4, 'white_win', 'resign', 370, '2026-07-08 11:00:00', '2026-07-08 11:06:10'),
('ROOM17', 1, 2, 1, 'white_win', 'checkmate', 520, '2026-07-08 16:00:00', '2026-07-08 16:08:40'),
('ROOM18', 2, 3, 2, 'white_win', 'checkmate', 600, '2026-07-09 09:00:00', '2026-07-09 09:10:00'),
('ROOM19', 3, 4, 3, 'white_win', 'resign', 420, '2026-07-09 10:30:00', '2026-07-09 10:37:00'),
('ROOM20', 4, 1, 1, 'black_win', 'checkmate', 670, '2026-07-09 11:45:00', '2026-07-09 11:56:10')
ON DUPLICATE KEY UPDATE id=id;

-- Riwayat Rating Elo Dummy (Simulasi kenaikan & penurunan rating berurutan untuk grafik tren)
-- Memperlihatkan peningkatan stabil untuk Nur_Azizah dan Budi, konsistensi Iwan, dan fluktuasi Ani.
INSERT INTO player_rating_history (player_id, match_id, rating_after) VALUES
-- Nur_Azizah (Mulai dari 1200)
(1, 'ROOM01', 1215),
(1, 'ROOM04', 1230),
(1, 'ROOM05', 1245),
(1, 'ROOM07', 1260),
(1, 'ROOM09', 1275),
(1, 'ROOM12', 1290),
(1, 'ROOM13', 1305),
(1, 'ROOM15', 1320),
(1, 'ROOM17', 1335),
(1, 'ROOM20', 1350), -- Naik stabil ke 1350 dari game real-time (total diset manual di player: 1420 setelah modifikasi lain)

-- Budi_Santoso (Mulai dari 1200)
(2, 'ROOM01', 1185),
(2, 'ROOM02', 1200),
(2, 'ROOM06', 1215),
(2, 'ROOM08', 1217),
(2, 'ROOM09', 1202),
(2, 'ROOM10', 1204),
(2, 'ROOM14', 1219),
(2, 'ROOM16', 1204),
(2, 'ROOM17', 1189),
(2, 'ROOM18', 1204),

-- Iwan_Setiawan (Mulai dari 1200)
(3, 'ROOM02', 1185),
(3, 'ROOM03', 1170),
(3, 'ROOM05', 1155),
(3, 'ROOM07', 1140),
(3, 'ROOM10', 1142),
(3, 'ROOM11', 1157),
(3, 'ROOM13', 1142),
(3, 'ROOM15', 1127),
(3, 'ROOM18', 1112),
(3, 'ROOM19', 1127),

-- Ani_Lestari (Mulai dari 1200)
(4, 'ROOM03', 1215),
(4, 'ROOM04', 1200),
(4, 'ROOM06', 1185),
(4, 'ROOM08', 1187),
(4, 'ROOM11', 1172),
(4, 'ROOM12', 1157),
(4, 'ROOM14', 1142),
(4, 'ROOM16', 1157),
(4, 'ROOM19', 1142),
(4, 'ROOM20', 1127);
