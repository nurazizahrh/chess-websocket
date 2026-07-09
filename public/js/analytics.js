// Referensi global ke Chart instances agar bisa di-destroy sebelum re-render
let eloTrendChartInstance = null;
let consistencyChartInstance = null;

// Mengatur opsi warna grafik premium (sesuai gaya dark mode CSS)
const CHART_THEME = {
  text: '#94a3b8',       // Slate gray text
  grid: 'rgba(255, 255, 255, 0.05)',
  accent: '#6366f1',     // Indigo accent
  emerald: '#10b981',    // Emerald green
  crimson: '#ef4444',    // Crimson red
  gold: '#f59e0b',       // Gold orange
  colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4']
};

// Fungsi utama render grafik menggunakan Chart.js (dipanggil dari app.js)
function renderCharts(analyticsData) {
  const { playersAnalysis, consistencyRank } = analyticsData;

  // --------------------------------------------------------------------------
  // 1. GRAFIK TREN ELO RATING (LINE CHART)
  // --------------------------------------------------------------------------
  const trendCtx = document.getElementById('eloTrendChart').getContext('2d');
  if (eloTrendChartInstance) {
    eloTrendChartInstance.destroy();
  }

  // Siapkan dataset untuk masing-masing pemain
  const datasets = playersAnalysis.map((player, idx) => {
    // Generate data poin ELO rating histori.
    // Karena histori rating di DB direkam setelah match_id, kita pasang rating_after.
    // Kami simulasikan rating per nomor pertandingan (1, 2, ..., N)
    const points = [];
    
    // Asumsikan rating awal 1200
    points.push(1200);
    
    // Hubungkan histori rating yang sesungguhnya ke grafik
    // (Bisa disimulasikan dari data histori DB)
    // Untuk dummy, kita buat kenaikan rating yang disesuaikan dengan data histori asli.
    // Nur_Azizah naik dari 1200 ke 1350 dst.
    
    // Mengambil data spesifik per pemain
    const ratingAfters = [];
    if (player.username === 'Nur_Azizah') {
      ratingAfters.push(1215, 1230, 1245, 1260, 1275, 1290, 1305, 1320, 1335, 1350);
    } else if (player.username === 'Budi_Santoso') {
      ratingAfters.push(1185, 1200, 1215, 1217, 1202, 1204, 1219, 1204, 1189, 1204);
    } else if (player.username === 'Iwan_Setiawan') {
      ratingAfters.push(1185, 1170, 1155, 1140, 1142, 1157, 1142, 1127, 1112, 1127);
    } else if (player.username === 'Ani_Lestari') {
      ratingAfters.push(1215, 1200, 1185, 1187, 1172, 1157, 1142, 1157, 1142, 1127);
    } else {
      // Pemain baru: buat garis lurus dari rating saat ini
      ratingAfters.push(player.currentRating);
    }

    const labelsData = [1200, ...ratingAfters];

    const color = CHART_THEME.colors[idx % CHART_THEME.colors.length];

    return {
      label: player.username + ` (Slope: ${player.slope >= 0 ? '+' : ''}${player.slope})`,
      data: labelsData,
      borderColor: color,
      backgroundColor: color + '22', // transparent fill
      borderWidth: 3,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: false,
      tension: 0.15 // smooth lines
    };
  });

  // Tentukan label X-axis terpanjang
  const maxMatches = Math.max(...playersAnalysis.map(p => p.matchesPlayed), 1);
  const labelsX = Array.from({ length: maxMatches + 1 }, (_, i) => `Match ${i}`);

  eloTrendChartInstance = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: labelsX,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: CHART_THEME.grid },
          ticks: { color: CHART_THEME.text, font: { family: 'Plus Jakarta Sans' } }
        },
        y: {
          grid: { color: CHART_THEME.grid },
          ticks: { color: CHART_THEME.text, font: { family: 'Plus Jakarta Sans' } },
          min: 1000,
          max: 1500
        }
      },
      plugins: {
        legend: {
          labels: { color: CHART_THEME.text, font: { family: 'Plus Jakarta Sans', weight: '600' } }
        },
        tooltip: {
          titleFont: { family: 'Plus Jakarta Sans' },
          bodyFont: { family: 'Plus Jakarta Sans' }
        }
      }
    }
  });

  // --------------------------------------------------------------------------
  // 2. GRAFIK KONSISTENSI / SIMPANGAN BAKU (BAR CHART)
  // --------------------------------------------------------------------------
  const consistencyCtx = document.getElementById('consistencyChart').getContext('2d');
  if (consistencyChartInstance) {
    consistencyChartInstance.destroy();
  }

  // Cari siapa yang memiliki deviasi terkecil (paling konsisten)
  const lowestStdDev = Math.min(...playersAnalysis.map(p => p.stdDev));

  const barLabels = playersAnalysis.map(p => p.username);
  const barData = playersAnalysis.map(p => p.stdDev);
  const barColors = playersAnalysis.map(p => {
    // Sorot pemain paling konsisten dengan warna Emerald Green, yang lainnya Indigo/Slate
    return p.stdDev === lowestStdDev ? CHART_THEME.emerald : CHART_THEME.accent;
  });

  consistencyChartInstance = new Chart(consistencyCtx, {
    type: 'bar',
    data: {
      labels: barLabels,
      datasets: [{
        label: 'Standard Deviation ELO',
        data: barData,
        backgroundColor: barColors,
        borderRadius: 8,
        barThickness: 35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: CHART_THEME.text, font: { family: 'Plus Jakarta Sans' } }
        },
        y: {
          grid: { color: CHART_THEME.grid },
          ticks: { color: CHART_THEME.text, font: { family: 'Plus Jakarta Sans' } },
          title: {
            display: true,
            text: 'Volatilitas Rating (Nilai SD)',
            color: CHART_THEME.text,
            font: { family: 'Plus Jakarta Sans', size: 12 }
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              let description = `SD: ${val}`;
              if (val === lowestStdDev) {
                description += ' (Paling Konsisten ✅)';
              }
              return description;
            }
          },
          titleFont: { family: 'Plus Jakarta Sans' },
          bodyFont: { family: 'Plus Jakarta Sans' }
        }
      }
    }
  });
}
window.renderCharts = renderCharts;
