// SVG Bidak Catur Premium (Vektor Tajam & Modern)
const PIECE_SVGS = {
  // Bidak Putih (White Pieces)
  'wp': `<svg viewBox="0 0 45 45" class="piece-svg"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-.83.62-1.41 1.61-1.41 2.72 0 1.93 1.57 3.5 3.5 3.5h4c1.93 0 3.5-1.57 3.5-3.5 0-1.11-.58-2.1-1.41-2.72C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#ffffff" stroke="#000000" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  'wr': `<svg viewBox="0 0 45 45" class="piece-svg"><path d="M9 39h27v-3H9v3zm3-3h21v-4H12v4zm2.5-4l1.5-12h18l1.5 12h-21zm-1.5-12h24l-2-6h-3v4h-3v-4h-4v4h-3v-4h-4v4h-3v-4h-3l-2 6z" fill="#ffffff" stroke="#000000" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  'wn': `<svg viewBox="0 0 45 45" class="piece-svg"><path d="M 22,10 C 22,10 19,11 16,15 C 13,19 13,23 13,23 C 13,23 14,21 16,20 C 18,19 20,20 20,20 C 20,20 18,21 17,23 C 16,25 16,28 16,28 C 16,28 17,27 19,26 C 21,25 23,26 23,26 C 23,26 20,27 19,30 C 18,33 19,36 19,36 C 19,36 21,35 23,32 C 25,29 27,29 27,29 C 27,29 26,31 25,33 C 24,35 25,38 25,38 C 25,38 27,37 29,34 C 31,31 32,27 32,22 C 32,17 29,12 22,10 z" fill="#ffffff" stroke="#000000" stroke-width="1.5" stroke-linejoin="round"/><path d="M 9,39 L 36,39" stroke="#000000" stroke-width="1.5"/></svg>`,
  'wb': `<svg viewBox="0 0 45 45" class="piece-svg"><path d="M9 36h27l-3-4H12l-3 4zm22.5-17c0-4.42-3.58-8-8-8s-8 3.58-8 8c0 1.22.28 2.37.77 3.4L13 30h19l-3.27-7.6c.49-1.03.77-2.18.77-3.4z" fill="#ffffff" stroke="#000000" stroke-width="1.5" stroke-linejoin="round"/><circle cx="23.5" cy="7.5" r="1.5" fill="#ffffff" stroke="#000000" stroke-width="1.5"/><path d="M17.5 18h11M23 12.5v11" stroke="#000000" stroke-width="1.5"/></svg>`,
  'wq': `<svg viewBox="0 0 45 45" class="piece-svg"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM9 37h27v-3H9v3zm4.5-3l2.5-17 6.5 13 6.5-13 2.5 17h-18z" fill="#ffffff" stroke="#000000" stroke-width="1.5" stroke-linejoin="round"/><circle cx="22.5" cy="7.5" r="2" fill="#ffffff" stroke="#000000" stroke-width="1.5"/></svg>`,
  'wk': `<svg viewBox="0 0 45 45" class="piece-svg"><path d="M8.5 36h28l-2.5-4H11l-2.5 4zm14-25V7h-3v4h-4v3h4v4h3v-4h4v-3h-4zm-8.5 10c0-3.58 2.92-6.5 6.5-6.5s6.5 2.92 6.5 6.5c0 1.63-.6 3.12-1.58 4.27L30 30H15l4.58-4.27c-.98-1.15-1.58-2.64-1.58-4.27z" fill="#ffffff" stroke="#000000" stroke-width="1.5" stroke-linejoin="round"/></svg>`,

  // Bidak Hitam (Black Pieces)
  'bp': `<svg viewBox="0 0 45 45" class="piece-svg"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-.83.62-1.41 1.61-1.41 2.72 0 1.93 1.57 3.5 3.5 3.5h4c1.93 0 3.5-1.57 3.5-3.5 0-1.11-.58-2.1-1.41-2.72C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#1e293b" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  'br': `<svg viewBox="0 0 45 45" class="piece-svg"><path d="M9 39h27v-3H9v3zm3-3h21v-4H12v4zm2.5-4l1.5-12h18l1.5 12h-21zm-1.5-12h24l-2-6h-3v4h-3v-4h-4v4h-3v-4h-4v4h-3v-4h-3l-2 6z" fill="#1e293b" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  'bn': `<svg viewBox="0 0 45 45" class="piece-svg"><path d="M 22,10 C 22,10 19,11 16,15 C 13,19 13,23 13,23 C 13,23 14,21 16,20 C 18,19 20,20 20,20 C 20,20 18,21 17,23 C 16,25 16,28 16,28 C 16,28 17,27 19,26 C 21,25 23,26 23,26 C 23,26 20,27 19,30 C 18,33 19,36 19,36 C 19,36 21,35 23,32 C 25,29 27,29 27,29 C 27,29 26,31 25,33 C 24,35 25,38 25,38 C 25,38 27,37 29,34 C 31,31 32,27 32,22 C 32,17 29,12 22,10 z" fill="#1e293b" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/><path d="M 9,39 L 36,39" stroke="#ffffff" stroke-width="1.5"/></svg>`,
  'bb': `<svg viewBox="0 0 45 45" class="piece-svg"><path d="M9 36h27l-3-4H12l-3 4zm22.5-17c0-4.42-3.58-8-8-8s-8 3.58-8 8c0 1.22.28 2.37.77 3.4L13 30h19l-3.27-7.6c.49-1.03.77-2.18.77-3.4z" fill="#1e293b" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/><circle cx="23.5" cy="7.5" r="1.5" fill="#1e293b" stroke="#ffffff" stroke-width="1.5"/><path d="M17.5 18h11M23 12.5v11" stroke="#ffffff" stroke-width="1.5"/></svg>`,
  'bq': `<svg viewBox="0 0 45 45" class="piece-svg"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM9 37h27v-3H9v3zm4.5-3l2.5-17 6.5 13 6.5-13 2.5 17h-18z" fill="#1e293b" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/><circle cx="22.5" cy="7.5" r="2" fill="#1e293b" stroke="#ffffff" stroke-width="1.5"/></svg>`,
  'bk': `<svg viewBox="0 0 45 45" class="piece-svg"><path d="M8.5 36h28l-2.5-4H11l-2.5 4zm14-25V7h-3v4h-4v3h4v4h3v-4h4v-3h-4zm-8.5 10c0-3.58 2.92-6.5 6.5-6.5s6.5 2.92 6.5 6.5c0 1.63-.6 3.12-1.58 4.27L30 30H15l4.58-4.27c-.98-1.15-1.58-2.64-1.58-4.27z" fill="#1e293b" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/></svg>`
};

class ChessBoard {
  constructor(elementId) {
    this.boardEl = document.getElementById(elementId);
    this.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    this.playerColor = 'w'; // 'w' (White) atau 'b' (Black)
    this.selectedSquare = null;
    this.validMoves = []; // array of squares e.g. ['e3', 'e4']
    this.clickCallback = null;
    this.checkSquare = null;
    this.lastMoveSquares = []; // [from, to]

    this.files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    this.ranks = [8, 7, 6, 5, 4, 3, 2, 1];
  }

  // Set callback jika kotak diklik
  onSquareClick(callback) {
    this.clickCallback = callback;
  }

  // Parse FEN dan kembalikan struktur papan 2D
  parseFen(fen) {
    const boardState = Array(8).fill(null).map(() => Array(8).fill(null));
    const parts = fen.split(' ');
    const position = parts[0];
    const rows = position.split('/');

    for (let r = 0; r < 8; r++) {
      let fileIdx = 0;
      const rowStr = rows[r];
      
      for (let c = 0; c < rowStr.length; c++) {
        const char = rowStr[c];
        if (isNaN(char)) {
          // Itu adalah huruf bidak (p, r, n, b, q, k dll)
          const color = char === char.toUpperCase() ? 'w' : 'b';
          const type = char.toLowerCase();
          boardState[r][fileIdx] = `${color}${type}`;
          fileIdx++;
        } else {
          // Itu angka yang menunjukkan jumlah kotak kosong
          const emptyCount = parseInt(char);
          fileIdx += emptyCount;
        }
      }
    }
    return boardState;
  }

  // Render visual papan catur ke DOM
  render(fen, playerColor = 'w', lastMove = null, checkSquare = null) {
    this.fen = fen;
    this.playerColor = playerColor;
    this.checkSquare = checkSquare;
    
    if (lastMove) {
      this.lastMoveSquares = [lastMove.from, lastMove.to];
    } else {
      this.lastMoveSquares = [];
    }

    this.boardEl.innerHTML = '';
    const boardState = this.parseFen(this.fen);

    // Jika giliran bidak Hitam, kita balik papannya agar Bidak Hitam di bawah (Flipped Board)
    const renderRanks = this.playerColor === 'b' ? [...this.ranks].reverse() : this.ranks;
    const renderFiles = this.playerColor === 'b' ? [...this.files].reverse() : this.files;

    for (let r = 0; r < 8; r++) {
      const actualRank = renderRanks[r];
      const stateRowIdx = 8 - actualRank; // indeks baris di array boardState

      for (let f = 0; f < 8; f++) {
        const actualFile = renderFiles[f];
        const stateFileIdx = this.files.indexOf(actualFile); // indeks kolom di array boardState
        
        const squareName = `${actualFile}${actualRank}`;
        const piece = boardState[stateRowIdx][stateFileIdx];
        
        // Buat elemen kotak (square)
        const squareEl = document.createElement('div');
        squareEl.className = `square ${(r + f) % 2 === 0 ? 'light' : 'dark'}`;
        squareEl.dataset.square = squareName;

        // Tambah sorotan gerakan terakhir
        if (this.lastMoveSquares.includes(squareName)) {
          squareEl.classList.add('last-move');
        }

        // Tambah sorotan skak (check)
        if (this.checkSquare === squareName) {
          squareEl.classList.add('check');
        }

        // Tambah sorotan terpilih (selected)
        if (this.selectedSquare === squareName) {
          squareEl.classList.add('selected');
        }

        // Gambar bidak jika ada
        if (piece) {
          squareEl.innerHTML = PIECE_SVGS[piece] || '';
        }

        // Gambar indikator valid moves (lingkaran penuntun)
        const validMoveObj = this.validMoves.find(m => m.to === squareName);
        if (validMoveObj) {
          const dot = document.createElement('div');
          // Jika petak tujuan berisi bidak lawan, tampilkan cincin tangkapan (capture ring)
          if (piece) {
            dot.className = 'valid-capture';
          } else {
            dot.className = 'valid-dot';
          }
          squareEl.appendChild(dot);
        }

        // Event listener klik petak catur
        squareEl.addEventListener('click', () => {
          if (this.clickCallback) {
            this.clickCallback(squareName);
          }
        });

        this.boardEl.appendChild(squareEl);
      }
    }
  }

  // Mengatur highlight valid moves secara visual
  setValidMoves(moves) {
    this.validMoves = moves; // berformat array object: [{to: 'e4', promotion: 'q'}, ...]
  }

  // Pilih suatu kotak
  setSelectedSquare(square) {
    this.selectedSquare = square;
  }

  // Reset semua status visual highlight interaksi
  clearSelection() {
    this.selectedSquare = null;
    this.validMoves = [];
  }
}

// Ekspor kelas ke scope global agar bisa dipakai di app.js
window.ChessBoard = ChessBoard;
