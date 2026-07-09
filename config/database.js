const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();

// Konfigurasi Database (dapat dikustomisasi via variabel lingkungan / env)
const dbConfig = {
  host: process.env.DB_HOST || null, // null memicu fallback SQLite
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chess_db',
  port: process.env.DB_PORT || 3306
};

let dbType = 'sqlite';
let mysqlPool = null;
let sqliteDb = null;

// Fungsi pembantu untuk membuat koneksi MySQL pool
async function createMysqlPool() {
  try {
    const pool = mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      port: dbConfig.port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    // Uji koneksi
    const conn = await pool.getConnection();
    conn.release();
    console.log(`[Database] Terhubung ke MySQL di ${dbConfig.host}:${dbConfig.port} (Database: ${dbConfig.database})`);
    dbType = 'mysql';
    mysqlPool = pool;
    return true;
  } catch (err) {
    console.warn(`[Database] Gagal menghubungkan ke MySQL (${err.message}). Beralih ke fallback SQLite...`);
    return false;
  }
}

// Inisialisasi SQLite database
function initSqlite() {
  const dbPath = path.join(__dirname, '../database.db');
  console.log(`[Database] Menggunakan SQLite database lokal di: ${dbPath}`);
  sqliteDb = new sqlite3.Database(dbPath);
  dbType = 'sqlite';
}

// API Database yang Terpadu (Unified API)
const db = {
  // Melakukan query SELECT (mengembalikan array of objects)
  async query(sql, params = []) {
    if (dbType === 'mysql') {
      const [rows] = await mysqlPool.execute(sql, params);
      return rows;
    } else {
      return new Promise((resolve, reject) => {
        // Ganti sintaks MySQL yang tidak cocok ke SQLite
        let sqliteSql = sql
          .replace(/ON DUPLICATE KEY UPDATE.*/gi, '') // abaikan klausa duplicate di SQLite jika ada
          .replace(/\?/g, '$param'); // SQLite custom parameter placeholder jika perlu (tapi ? tetap valid di sqlite3 run/all)
        
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }
  },

  // Melakukan query INSERT, UPDATE, DELETE
  async run(sql, params = []) {
    if (dbType === 'mysql') {
      const [result] = await mysqlPool.execute(sql, params);
      return {
        insertId: result.insertId,
        affectedRows: result.affectedRows
      };
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.run(sql, params, function (err) {
          if (err) reject(err);
          else {
            resolve({
              insertId: this.lastID,
              affectedRows: this.changes
            });
          }
        });
      });
    }
  },

  // Melakukan transaksi multipel (untuk SQLite / MySQL)
  async transaction(callback) {
    if (dbType === 'mysql') {
      const conn = await mysqlPool.getConnection();
      try {
        await conn.beginTransaction();
        const result = await callback(conn);
        await conn.commit();
        return result;
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.serialize(async () => {
          sqliteDb.run('BEGIN TRANSACTION');
          try {
            const result = await callback();
            sqliteDb.run('COMMIT');
            resolve(result);
          } catch (err) {
            sqliteDb.run('ROLLBACK');
            reject(err);
          }
        });
      });
    }
  },

  // Fungsi Inisialisasi Database (Membuat tabel & memuat dummy data)
  async initialize() {
    // 1. Coba hubungkan ke MySQL jika parameter host diset
    if (dbConfig.host) {
      const success = await createMysqlPool();
      if (!success) {
        initSqlite();
      }
    } else {
      initSqlite();
    }

    // 2. Baca file skema .sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error(`[Database] File skema database tidak ditemukan di: ${schemaPath}`);
      return;
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // 3. Eksekusi skema berdasarkan tipe database
    if (dbType === 'mysql') {
      try {
        // Jalankan perintah di skema satu per satu (dipisahkan berdasarkan komentar '--')
        // mysql2 tidak mendukung multi-statement secara default untuk alasan keamanan
        const statements = schemaSql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          await mysqlPool.execute(statement);
        }
        console.log('[Database] Skema MySQL berhasil diterapkan / diverifikasi.');
      } catch (err) {
        console.error(`[Database] Gagal menginisialisasi skema MySQL: ${err.message}`);
      }
    } else {
      // Inisialisasi Tabel SQLite (Sintaks sedikit disesuaikan)
      return new Promise((resolve, reject) => {
        sqliteDb.serialize(() => {
          // Buat tabel-tabel utama
          sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS players (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT NOT NULL UNIQUE,
              rating INTEGER DEFAULT 1200,
              matches_played INTEGER DEFAULT 0,
              matches_won INTEGER DEFAULT 0,
              matches_lost INTEGER DEFAULT 0,
              matches_drawn INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS matches (
              id TEXT PRIMARY KEY,
              white_player_id INTEGER NOT NULL,
              black_player_id INTEGER NOT NULL,
              winner_id INTEGER NULL,
              result TEXT NOT NULL,
              end_reason TEXT NOT NULL,
              moves_pgn TEXT,
              duration_seconds INTEGER DEFAULT 0,
              started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              ended_at DATETIME NULL,
              FOREIGN KEY (white_player_id) REFERENCES players(id) ON DELETE CASCADE,
              FOREIGN KEY (black_player_id) REFERENCES players(id) ON DELETE CASCADE,
              FOREIGN KEY (winner_id) REFERENCES players(id) ON DELETE SET NULL
            )
          `);

          sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS player_rating_history (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              player_id INTEGER NOT NULL,
              match_id TEXT NOT NULL,
              rating_after INTEGER NOT NULL,
              recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
              FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
            )
          `);

          // Masukkan dummy data jika tabel players masih kosong
          sqliteDb.get('SELECT COUNT(*) as count FROM players', [], (err, row) => {
            if (err) {
              console.error('[Database] Gagal mengecek data awal SQLite:', err);
              return reject(err);
            }
            if (row.count === 0) {
              console.log('[Database] Inisialisasi dummy data awal di SQLite...');
              
              // Masukkan Players
              const playersStmt = sqliteDb.prepare(`
                INSERT INTO players (id, username, rating, matches_played, matches_won, matches_lost, matches_drawn) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `);
              playersStmt.run(1, 'Nur_Azizah', 1420, 20, 14, 4, 2);
              playersStmt.run(2, 'Budi_Santoso', 1345, 15, 9, 4, 2);
              playersStmt.run(3, 'Iwan_Setiawan', 1205, 12, 5, 5, 2);
              playersStmt.run(4, 'Ani_Lestari', 1250, 10, 5, 4, 1);
              playersStmt.finalize();

              // Masukkan Matches
              const matchesStmt = sqliteDb.prepare(`
                INSERT INTO matches (id, white_player_id, black_player_id, winner_id, result, end_reason, duration_seconds, started_at, ended_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              matchesStmt.run('ROOM01', 1, 2, 1, 'white_win', 'checkmate', 450, '2026-07-01 10:00:00', '2026-07-01 10:07:30');
              matchesStmt.run('ROOM02', 2, 3, 2, 'white_win', 'checkmate', 612, '2026-07-01 11:15:00', '2026-07-01 11:25:12');
              matchesStmt.run('ROOM03', 3, 4, 4, 'black_win', 'resign', 320, '2026-07-02 09:30:00', '2026-07-02 09:35:20');
              matchesStmt.run('ROOM04', 4, 1, 1, 'black_win', 'timeout', 900, '2026-07-02 14:00:00', '2026-07-02 14:15:00');
              matchesStmt.run('ROOM05', 1, 3, 1, 'white_win', 'checkmate', 510, '2026-07-03 08:00:00', '2026-07-03 08:08:30');
              matchesStmt.run('ROOM06', 2, 4, 2, 'white_win', 'resign', 280, '2026-07-03 16:30:00', '2026-07-03 16:34:40');
              matchesStmt.run('ROOM07', 3, 1, 1, 'black_win', 'checkmate', 715, '2026-07-04 10:10:00', '2026-07-04 10:21:55');
              matchesStmt.run('ROOM08', 4, 2, null, 'draw', 'draw_agreement', 850, '2026-07-04 15:40:00', '2026-07-04 15:54:10');
              matchesStmt.run('ROOM09', 1, 2, 1, 'white_win', 'checkmate', 480, '2026-07-05 11:00:00', '2026-07-05 11:08:00');
              matchesStmt.run('ROOM10', 2, 3, null, 'draw', 'stalemate', 950, '2026-07-05 13:20:00', '2026-07-05 13:35:50');
              matchesStmt.run('ROOM11', 3, 4, 3, 'white_win', 'checkmate', 560, '2026-07-06 09:00:00', '2026-07-06 09:09:20');
              matchesStmt.run('ROOM12', 4, 1, 1, 'black_win', 'resign', 410, '2026-07-06 14:30:00', '2026-07-06 14:36:50');
              matchesStmt.run('ROOM13', 1, 3, 1, 'white_win', 'checkmate', 580, '2026-07-07 10:00:00', '2026-07-07 10:09:40');
              matchesStmt.run('ROOM14', 2, 4, 2, 'white_win', 'timeout', 900, '2026-07-07 15:00:00', '2026-07-07 15:15:00');
              matchesStmt.run('ROOM15', 3, 1, 1, 'black_win', 'checkmate', 640, '2026-07-08 09:30:00', '2026-07-08 09:40:40');
              matchesStmt.run('ROOM16', 4, 2, 4, 'white_win', 'resign', 370, '2026-07-08 11:00:00', '2026-07-08 11:06:10');
              matchesStmt.run('ROOM17', 1, 2, 1, 'white_win', 'checkmate', 520, '2026-07-08 16:00:00', '2026-07-08 16:08:40');
              matchesStmt.run('ROOM18', 2, 3, 2, 'white_win', 'checkmate', 600, '2026-07-09 09:00:00', '2026-07-09 09:10:00');
              matchesStmt.run('ROOM19', 3, 4, 3, 'white_win', 'resign', 420, '2026-07-09 10:30:00', '2026-07-09 10:37:00');
              matchesStmt.run('ROOM20', 4, 1, 1, 'black_win', 'checkmate', 670, '2026-07-09 11:45:00', '2026-07-09 11:56:10');
              matchesStmt.finalize();

              // Masukkan Rating History
              const ratingStmt = sqliteDb.prepare(`
                INSERT INTO player_rating_history (player_id, match_id, rating_after) VALUES (?, ?, ?)
              `);
              
              const histories = [
                // Nur_Azizah
                [1, 'ROOM01', 1215], [1, 'ROOM04', 1230], [1, 'ROOM05', 1245], [1, 'ROOM07', 1260],
                [1, 'ROOM09', 1275], [1, 'ROOM12', 1290], [1, 'ROOM13', 1305], [1, 'ROOM15', 1320],
                [1, 'ROOM17', 1335], [1, 'ROOM20', 1350],
                // Budi_Santoso
                [2, 'ROOM01', 1185], [2, 'ROOM02', 1200], [2, 'ROOM06', 1215], [2, 'ROOM08', 1217],
                [2, 'ROOM09', 1202], [2, 'ROOM10', 1204], [2, 'ROOM14', 1219], [2, 'ROOM16', 1204],
                [2, 'ROOM17', 1189], [2, 'ROOM18', 1204],
                // Iwan_Setiawan
                [3, 'ROOM02', 1185], [3, 'ROOM03', 1170], [3, 'ROOM05', 1155], [3, 'ROOM07', 1140],
                [3, 'ROOM10', 1142], [3, 'ROOM11', 1157], [3, 'ROOM13', 1142], [3, 'ROOM15', 1127],
                [3, 'ROOM18', 1112], [3, 'ROOM19', 1127],
                // Ani_Lestari
                [4, 'ROOM03', 1215], [4, 'ROOM04', 1200], [4, 'ROOM06', 1185], [4, 'ROOM08', 1187],
                [4, 'ROOM11', 1172], [4, 'ROOM12', 1157], [4, 'ROOM14', 1142], [4, 'ROOM16', 1157],
                [4, 'ROOM19', 1142], [4, 'ROOM20', 1127]
              ];

              for (const hist of histories) {
                ratingStmt.run(hist[0], hist[1], hist[2]);
              }
              ratingStmt.finalize();
              console.log('[Database] Dummy data awal SQLite berhasil dimuat.');
            }
            resolve();
          });
        });
      });
    }
  }
};

module.exports = db;
