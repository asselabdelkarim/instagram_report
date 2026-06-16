// ----------------------------------------------------------------------
// Shared setup
// ----------------------------------------------------------------------
const COLORS = {
  low: '#5d7a91',
  medium: '#84ad9b',
  high: '#f0b94e',
  viral: '#ff5d3c',
  text: '#f4f1ea',
  textMid: '#c7c2b6',
  textDim: '#8e887b',
  grid: 'rgba(244,241,234,0.07)',
  surface: '#1c1a16'
};

Chart.defaults.color = COLORS.textDim;
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.borderColor = COLORS.grid;
Chart.defaults.plugins.legend.labels.color = COLORS.textMid;

const D = DASHBOARD_DATA;

const fmt1 = (n) => Number(n).toFixed(1);
const fmt2 = (n) => Number(n).toFixed(2);
const fmtInt = (n) => Math.round(n).toLocaleString();

const tooltipBase = {
  backgroundColor: '#0f0e0c',
  borderColor: 'rgba(244,241,234,0.12)',
  borderWidth: 1,
  titleFont: { family: "'IBM Plex Mono', monospace", size: 11 },
  bodyFont: { family: "'IBM Plex Mono', monospace", size: 11 },
  padding: 10,
  cornerRadius: 6
};

function gridOpt(extra) {
  return Object.assign({ color: COLORS.grid, drawTicks: false }, extra || {});
}

// ----------------------------------------------------------------------
// 01 — Performance bucket cards
// ----------------------------------------------------------------------
(function bucketCards() {
  const order = ['low', 'medium', 'high', 'viral'];
  const eng = {};
  D.performance_bucket.forEach(d => eng[d.performance_bucket_label] = d);
  const met = {};
  D.perf_bucket_metrics.forEach(d => met[d.performance_bucket_label] = d);

  const el = document.getElementById('bucket-cards');
  order.forEach(key => {
    const e = eng[key], m = met[key];
    const div = document.createElement('div');
    div.className = `bucket-card ${key}`;
    div.innerHTML = `
      <div class="tag">${key}</div>
      <div class="big">${fmt2(e.avg_engagement)}%</div>
      <div class="metrics">
        <div>Posts <b>${fmtInt(e.posts)}</b></div>
        <div>Avg. likes <b>${fmtInt(m.avg_likes)}</b></div>
        <div>Avg. comments <b>${fmt1(m.avg_comments)}</b></div>
        <div>Avg. shares <b>${fmt1(m.avg_shares)}</b></div>
        <div>Avg. saves <b>${fmt1(m.avg_saves)}</b></div>
        <div>Reach <b>${fmtInt(e.avg_reach)}</b></div>
      </div>`;
    el.appendChild(div);
  });
})();

// ----------------------------------------------------------------------
// 01 — Engagement rate histogram
// ----------------------------------------------------------------------
(function histChart() {
  const counts = D.engagement_hist.counts;
  const edges = D.engagement_hist.edges;
  const labels = counts.map((_, i) => `${edges[i]}–${edges[i + 1]}%`);
  const total = counts.reduce((a, b) => a + b, 0);

  // color bars along the spectrum
  const colorAt = (i) => {
    const t = i / (counts.length - 1);
    return lerpColor3(COLORS.low, COLORS.medium, COLORS.high, COLORS.viral, t);
  };

  new Chart(document.getElementById('chart-hist'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Posts',
        data: counts,
        backgroundColor: counts.map((_, i) => colorAt(i)),
        borderRadius: 3,
        barPercentage: 0.95,
        categoryPercentage: 1.0
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: Object.assign({}, tooltipBase, {
          callbacks: {
            label: (ctx) => `${fmtInt(ctx.parsed.y)} posts (${(ctx.parsed.y / total * 100).toFixed(1)}%)`
          }
        })
      },
      scales: {
        x: { ticks: { maxRotation: 90, minRotation: 90, autoSkip: true, maxTicksLimit: 12 }, grid: { display: false } },
        y: { grid: gridOpt(), title: { display: true, text: 'Number of posts', color: COLORS.textDim, font: { size: 11 } } }
      }
    }
  });
})();

function lerpColor3(c1, c2, c3, c4, t) {
  // t in [0,1] across 3 segments
  const stops = [c1, c2, c3, c4];
  const seg = Math.min(2, Math.floor(t * 3));
  const localT = (t * 3) - seg;
  return lerpColor(stops[seg], stops[seg + 1], localT);
}
function lerpColor(a, b, t) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bch = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r},${g},${bch})`;
}
function hexToRgb(hex) {
  const v = hex.replace('#', '');
  return {
    r: parseInt(v.substring(0, 2), 16),
    g: parseInt(v.substring(2, 4), 16),
    b: parseInt(v.substring(4, 6), 16)
  };
}

// ----------------------------------------------------------------------
// 01 — Bucket interaction metrics (grouped bar)
// ----------------------------------------------------------------------
(function bucketMetricsChart() {
  const order = ['low', 'medium', 'high', 'viral'];
  const met = {};
  D.perf_bucket_metrics.forEach(d => met[d.performance_bucket_label] = d);

  new Chart(document.getElementById('chart-bucket-metrics'), {
    type: 'bar',
    data: {
      labels: ['Likes', 'Saves', 'Shares', 'Comments'],
      datasets: order.map(key => ({
        label: key,
        data: [met[key].avg_likes, met[key].avg_saves, met[key].avg_shares, met[key].avg_comments],
        backgroundColor: COLORS[key],
        borderRadius: 3
      }))
    },
    options: {
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, boxHeight: 12 } },
        tooltip: tooltipBase
      },
      scales: {
        x: { grid: { display: false } },
        y: { type: 'logarithmic', grid: gridOpt(), title: { display: true, text: 'Avg. per post (log scale)', color: COLORS.textDim, font: { size: 11 } } }
      }
    }
  });
})();

// ----------------------------------------------------------------------
// 02 — Category & media type charts
// ----------------------------------------------------------------------
(function categoryChart() {
  const data = D.content_category;
  new Chart(document.getElementById('chart-category'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.content_category),
      datasets: [{
        data: data.map(d => d.avg_engagement),
        backgroundColor: COLORS.medium,
        borderRadius: 4,
        barThickness: 16
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: Object.assign({}, tooltipBase, {
          callbacks: { label: (ctx) => `${fmt2(ctx.parsed.x)}% avg. engagement · ${fmtInt(data[ctx.dataIndex].posts)} posts` }
        })
      },
      scales: {
        x: { min: 3.8, max: 4.4, grid: gridOpt(), title: { display: true, text: 'Avg. engagement rate (%)', color: COLORS.textDim, font: { size: 11 } } },
        y: { grid: { display: false } }
      }
    }
  });
})();

(function mediaTypeChart() {
  const data = D.media_type.slice().sort((a, b) => b.avg_engagement - a.avg_engagement);
  const labelMap = { reel: 'Reel', carousel: 'Carousel', image: 'Image' };
  new Chart(document.getElementById('chart-mediatype'), {
    type: 'bar',
    data: {
      labels: data.map(d => labelMap[d.media_type]),
      datasets: [{
        data: data.map(d => d.avg_engagement),
        backgroundColor: [COLORS.viral, COLORS.high, COLORS.medium],
        borderRadius: 6,
        barThickness: 60
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: Object.assign({}, tooltipBase, {
          callbacks: { label: (ctx) => `${fmt2(ctx.parsed.y)}% avg. engagement · ${fmtInt(data[ctx.dataIndex].posts)} posts` }
        })
      },
      scales: {
        x: { grid: { display: false } },
        y: { min: 4.1, max: 4.3, grid: gridOpt(), title: { display: true, text: 'Avg. engagement rate (%)', color: COLORS.textDim, font: { size: 11 } } }
      }
    }
  });
})();

// ----------------------------------------------------------------------
// 02 — Viral rate by category
// ----------------------------------------------------------------------
(function viralRateChart() {
  const data = D.cat_viral_rate;
  new Chart(document.getElementById('chart-viralrate'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.content_category),
      datasets: [{
        data: data.map(d => d.viral_rate),
        backgroundColor: COLORS.viral,
        borderRadius: 4,
        barThickness: 14
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: Object.assign({}, tooltipBase, {
          callbacks: { label: (ctx) => `${fmt2(ctx.parsed.x)}% of posts went viral` }
        })
      },
      scales: {
        x: { min: 22, max: 27, grid: gridOpt(), title: { display: true, text: '% of posts in "viral" bucket', color: COLORS.textDim, font: { size: 11 } } },
        y: { grid: { display: false } }
      }
    }
  });
})();

// ----------------------------------------------------------------------
// 02 — Top / bottom combos tables
// ----------------------------------------------------------------------
(function combosTables() {
  const mediaLabel = { reel: 'Reel', carousel: 'Carousel', image: 'Image' };

  function buildTable(el, rows, cls) {
    let html = '<thead><tr><th>Format × Category</th><th class="num">Eng.</th></tr></thead><tbody>';
    rows.forEach(r => {
      html += `<tr><td>${mediaLabel[r.media_type]} · ${r.content_category}</td>` +
              `<td class="num"><span class="pill ${cls}">${fmt2(r.avg_engagement)}%</span></td></tr>`;
    });
    html += '</tbody>';
    el.innerHTML = html;
  }
  buildTable(document.getElementById('table-top-combos'), D.top_combos.slice(0, 5), 'viral');
  buildTable(document.getElementById('table-bottom-combos'), D.bottom_combos.slice(0, 5), 'low');
})();

// ----------------------------------------------------------------------
// 03 — Heatmap
// ----------------------------------------------------------------------
(function heatmap() {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayShort = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };

  // build lookup
  const lookup = {};
  D.heatmap.forEach(d => { lookup[`${d.day_of_week}_${d.post_hour}`] = d.avg_engagement; });

  const values = D.heatmap.map(d => d.avg_engagement);
  const min = Math.min(...values), max = Math.max(...values);

  const el = document.getElementById('heatmap');
  // header row
  el.appendChild(document.createElement('div')).className = 'corner';
  for (let h = 0; h < 24; h++) {
    const c = document.createElement('div');
    c.className = 'hh';
    c.textContent = h;
    el.appendChild(c);
  }
  // rows
  days.forEach(day => {
    const label = document.createElement('div');
    label.className = 'dlabel';
    label.textContent = dayShort[day];
    el.appendChild(label);
    for (let h = 0; h < 24; h++) {
      const v = lookup[`${day}_${h}`];
      const t = (v - min) / (max - min);
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.background = lerpColor3(COLORS.low, COLORS.medium, COLORS.high, COLORS.viral, t);
      cell.title = `${day} ${h}:00 — ${fmt2(v)}% avg. engagement`;
      el.appendChild(cell);
    }
  });
})();

// ----------------------------------------------------------------------
// 03 — Day of week & hour charts
// ----------------------------------------------------------------------
(function dayChart() {
  const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const byDay = {};
  D.day_of_week.forEach(d => byDay[d.day_of_week] = d);
  const data = order.map(d => byDay[d]);

  new Chart(document.getElementById('chart-day'), {
    type: 'bar',
    data: {
      labels: order.map(d => d.slice(0, 3)),
      datasets: [{
        data: data.map(d => d.avg_engagement),
        backgroundColor: COLORS.medium,
        borderRadius: 4,
        barThickness: 28
      }]
    },
    options: {
      plugins: { legend: { display: false }, tooltip: Object.assign({}, tooltipBase, { callbacks: { label: (ctx) => `${fmt2(ctx.parsed.y)}% avg. engagement` } }) },
      scales: {
        x: { grid: { display: false } },
        y: { min: 4.0, max: 4.35, grid: gridOpt() }
      }
    }
  });
})();

(function hourChart() {
  const data = D.post_hour;
  new Chart(document.getElementById('chart-hour'), {
    type: 'line',
    data: {
      labels: data.map(d => d.post_hour + ':00'),
      datasets: [{
        data: data.map(d => d.avg_engagement),
        borderColor: COLORS.viral,
        backgroundColor: 'rgba(255,93,60,0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 2
      }]
    },
    options: {
      plugins: { legend: { display: false }, tooltip: Object.assign({}, tooltipBase, { callbacks: { label: (ctx) => `${fmt2(ctx.parsed.y)}% avg. engagement` } }) },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } },
        y: { min: 4.0, max: 4.4, grid: gridOpt() }
      }
    }
  });
})();

// ----------------------------------------------------------------------
// 04 — Correlation chart
// ----------------------------------------------------------------------
(function correlationChart() {
  const c = D.correlation_engagement;
  const items = [
    ['Likes', c.likes],
    ['Saves', c.saves],
    ['Shares', c.shares],
    ['Comments', c.comments],
    ['Follower count', c.follower_count],
    ['Hashtag count', c.hashtags_count],
    ['Caption length', c.caption_length],
    ['Has CTA', c.has_call_to_action],
    ['Impressions', c.impressions],
    ['Reach', c.reach]
  ].sort((a, b) => b[1] - a[1]);

  new Chart(document.getElementById('chart-correlation'), {
    type: 'bar',
    data: {
      labels: items.map(d => d[0]),
      datasets: [{
        data: items.map(d => d[1]),
        backgroundColor: items.map(d => d[1] >= 0 ? COLORS.medium : COLORS.viral),
        borderRadius: 4,
        barThickness: 16
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: Object.assign({}, tooltipBase, { callbacks: { label: (ctx) => `r = ${ctx.parsed.x.toFixed(3)}` } })
      },
      scales: {
        x: { min: -0.05, max: 0.55, grid: gridOpt(), title: { display: true, text: 'Correlation coefficient (r)', color: COLORS.textDim, font: { size: 11 } } },
        y: { grid: { display: false } }
      }
    }
  });
})();

// ----------------------------------------------------------------------
// 04 — Caption length, hashtags, CTA, follower tier
// ----------------------------------------------------------------------
(function captionChart() {
  const data = D.caption_bin;
  new Chart(document.getElementById('chart-caption'), {
    type: 'line',
    data: {
      labels: data.map(d => d.caption_bin),
      datasets: [{
        data: data.map(d => d.avg_engagement),
        borderColor: COLORS.high,
        backgroundColor: 'rgba(240,185,78,0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: COLORS.high
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: Object.assign({}, tooltipBase, { callbacks: { label: (ctx) => `${fmt2(ctx.parsed.y)}% avg. engagement · ${fmtInt(data[ctx.dataIndex].posts)} posts` } })
      },
      scales: {
        x: { grid: { display: false }, title: { display: true, text: 'Caption length (characters)', color: COLORS.textDim, font: { size: 11 } } },
        y: { grid: gridOpt() }
      }
    }
  });
})();

(function hashtagChart() {
  const data = D.hashtag_bin;
  new Chart(document.getElementById('chart-hashtags'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.hashtag_bin),
      datasets: [{
        data: data.map(d => d.avg_engagement),
        backgroundColor: COLORS.medium,
        borderRadius: 4,
        barThickness: 24
      }]
    },
    options: {
      plugins: { legend: { display: false }, tooltip: Object.assign({}, tooltipBase, { callbacks: { label: (ctx) => `${fmt2(ctx.parsed.y)}%` } }) },
      scales: {
        x: { grid: { display: false } },
        y: { min: 4.0, max: 4.3, grid: gridOpt() }
      }
    }
  });
})();

(function ctaChart() {
  const data = D.cta;
  const map = { 0: 'No CTA', 1: 'Has CTA' };
  new Chart(document.getElementById('chart-cta'), {
    type: 'bar',
    data: {
      labels: data.map(d => map[d.has_call_to_action]),
      datasets: [{
        data: data.map(d => d.avg_engagement),
        backgroundColor: [COLORS.low, COLORS.viral],
        borderRadius: 6,
        barThickness: 50
      }]
    },
    options: {
      plugins: { legend: { display: false }, tooltip: Object.assign({}, tooltipBase, { callbacks: { label: (ctx) => `${fmt2(ctx.parsed.y)}% · ${fmtInt(data[ctx.dataIndex].posts)} posts` } }) },
      scales: {
        x: { grid: { display: false } },
        y: { min: 4.0, max: 4.3, grid: gridOpt() }
      }
    }
  });
})();

(function followersChart() {
  const data = D.follower_bin;
  new Chart(document.getElementById('chart-followers'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.follower_bin),
      datasets: [{
        data: data.map(d => d.avg_engagement),
        backgroundColor: COLORS.high,
        borderRadius: 4,
        barThickness: 24
      }]
    },
    options: {
      plugins: { legend: { display: false }, tooltip: Object.assign({}, tooltipBase, { callbacks: { label: (ctx) => `${fmt2(ctx.parsed.y)}%` } }) },
      scales: {
        x: { grid: { display: false } },
        y: { min: 4.0, max: 4.3, grid: gridOpt() }
      }
    }
  });
})();

// ----------------------------------------------------------------------
// 05 — Account leaderboard table
// ----------------------------------------------------------------------
(function accountsTable() {
  const el = document.getElementById('table-accounts');
  let html = '<thead><tr><th>#</th><th>Account</th><th>Type</th><th class="num">Followers</th><th class="num">Posts</th><th class="num">Avg. Eng.</th></tr></thead><tbody>';
  D.account_summary.forEach((a, i) => {
    const typeLabel = a.account_type === 'brand' ? 'Brand' : 'Creator';
    html += `<tr>
      <td class="mono">${i + 1}</td>
      <td>${typeLabel} ${String(a.account_id).padStart(2,'0')}</td>
      <td><span class="pill ${a.account_type === 'brand' ? 'high' : 'medium'}">${a.account_type}</span></td>
      <td class="num">${fmtInt(a.follower_count)}</td>
      <td class="num">${fmtInt(a.posts)}</td>
      <td class="num">${fmt2(a.avg_engagement)}%</td>
    </tr>`;
  });
  html += '</tbody>';
  el.innerHTML = html;
})();

// ----------------------------------------------------------------------
// 05 — Monthly trend chart
// ----------------------------------------------------------------------
(function monthlyChart() {
  const data = D.monthly_trend;
  new Chart(document.getElementById('chart-monthly'), {
    data: {
      labels: data.map(d => d.month),
      datasets: [
        {
          type: 'bar',
          label: 'Posts',
          data: data.map(d => d.posts),
          backgroundColor: 'rgba(132,173,155,0.35)',
          yAxisID: 'y1',
          borderRadius: 3,
          order: 2
        },
        {
          type: 'line',
          label: 'Avg. engagement (%)',
          data: data.map(d => d.avg_engagement),
          borderColor: COLORS.viral,
          backgroundColor: COLORS.viral,
          yAxisID: 'y',
          tension: 0.3,
          pointRadius: 3,
          order: 1
        }
      ]
    },
    options: {
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, boxHeight: 12 } },
        tooltip: tooltipBase
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 60, minRotation: 60 } },
        y: { position: 'left', min: 3.8, max: 4.5, grid: gridOpt(), title: { display: true, text: 'Avg. engagement (%)', color: COLORS.textDim, font: { size: 11 } } },
        y1: { position: 'right', min: 0, max: 3500, grid: { display: false }, title: { display: true, text: 'Posts', color: COLORS.textDim, font: { size: 11 } } }
      }
    }
  });
})();
