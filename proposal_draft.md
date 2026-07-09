# PROPOSAL PROYEK AKHIR
## SISTEM GAME CATUR MULTI-PEMAIN REAL-TIME BERBASIS WEBSOCKET DENGAN ANALISIS STATISTIK PERFORMA ELO

---

### **1. IDENTITAS KELOMPOK**
- **Mata Kuliah**: Cloud Computing / Pemrograman Web
- **Nama Game**: Chess Go
- **Anggota Kelompok**:
  1. Azizah (NPM: [Isi NPM Manual]) - *Peran: Fullstack Developer*

---

### **2. LATAR BELAKANG & TUJUAN**
Catur adalah salah satu permainan papan strategi paling populer di dunia. Di era digital saat ini, kebutuhan untuk bermain catur jarak jauh secara real-time sangatlah tinggi. Namun, banyak platform game catur tidak menyediakan representasi metrik performa pemain secara transparan dan mudah dianalisis untuk melihat perkembangan kemampuan berpikir taktis.

Proyek akhir ini bertujuan untuk membangun sebuah platform game catur online multi-pemain real-time yang memvalidasi pergerakan bidak secara aman di sisi server menggunakan WebSocket. Selain itu, sistem ini dirancang untuk merekam setiap hasil permainan ke database terpusat dan menyajikan visualisasi data analitik performa pemain menggunakan metode perhitungan rating ELO standar FIDE.

---

### **3. RUANG LINGKUP & FITUR MINIMUM**
Sistem "Chess Go" akan mengimplementasikan seluruh fitur wajib:
1. **Sistem Matchmaking Room**: Menggunakan kode unik 6 karakter agar pemain dapat bertanding satu sama lain (mendukung minimal 2 pemain per game).
2. **Real-Time Synchronized Play**: Pembaruan pergerakan bidak catur, timer catur (chess clock), dan chat real-time menggunakan pustaka **Socket.io**.
3. **Validasi Aturan & Skor Server-Side**: Mengintegrasikan `chess.js` pada server Node.js untuk mencegah kecurangan (illegal moves) dan secara otomatis menghitung penyesuaian ELO pasca pertandingan.
4. **Penyimpanan Database Terstruktur**: Riwayat pertandingan lengkap dan data sejarah fluktuasi ELO direkam ke database MySQL.
5. **Dashboard & Analitik Statistik**: Grafik interaktif (Chart.js) untuk menganalisis tren performa pemain dan membuktikan hipotesis pelatihan taktis.

---

### **4. TEKNOLOGI YANG DIGUNAKAN**
Aplikasi ini memanfaatkan teknologi modern berbasis JavaScript full-stack:
- **Web Server**: Node.js & Express
- **Real-Time Transport**: Socket.io (WebSocket)
- **Engine Validasi Catur**: Chess.js
- **Database**: MySQL (dengan driver `mysql2`) dan fallback SQLite untuk kebutuhan testing lokal.
- **Frontend UI & Visualisasi**: HTML5, Vanilla CSS (Glassmorphism Dark Theme), Vanilla JavaScript, dan Chart.js CDN.

---

### **5. METODOLOGI ANALISIS STATISTIK**
Untuk membuktikan pengaruh latihan bermain catur terhadap performa pemain, kami mengusulkan hipotesis:
> **Hipotesis**: *"Bermain game catur secara real-time pada jaringan WebSocket meningkatkan ketajaman analisis taktis dan konsistensi rating pemain seiring waktu."*

Kami akan memverifikasi hipotesis ini menggunakan tiga indikator statistik utama yang ditarik langsung dari database permainan:
1. **Slope Regresi Linier (Tren ELO)**: Menghitung gradien kecenderungan rating ELO pemain dari pertandingan pertama hingga terakhir. Slope positif ($m > 0$) membuktikan peningkatan performa.
2. **Simpangan Baku (Standard Deviation)**: Mengukur kestabilan performa rating ELO. Simpangan baku yang mengecil menunjukkan bahwa pemain telah mencapai stabilitas/konsistensi permainan yang tinggi.
3. **Analisis Komparatif (Pre vs Post)**: Membandingkan rata-rata ELO pada 5 pertandingan awal (Pre-Test) dengan 5 pertandingan terakhir (Post-Test) untuk mendeteksi deviasi positif performa kelompok.
