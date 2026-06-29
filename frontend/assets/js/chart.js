// ─── FortisPH — TradingView Lightweight Charts Setup ───

let chartInstance = null;
let seriesInstance = null;
let wsInstance = null;

/**
 * initChart
 * @param {string} containerId - DOM element ID for chart
 * @param {string} providerSlug - e.g. 'jili', 'evolution'
 * @param {Array} initialCandles - Pre-loaded candle data from REST API
 */
function initChart(containerId, providerSlug, initialCandles = []) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('[Chart] Container not found:', containerId);
    return;
  }

  // Destroy existing chart
  if (chartInstance) {
    chartInstance.remove();
    chartInstance = null;
    seriesInstance = null;
  }

  // Close existing WebSocket
  if (wsInstance && wsInstance.readyState !== WebSocket.CLOSED) {
    wsInstance.close();
    wsInstance = null;
  }

  // Create chart with dark theme
  chartInstance = LightweightCharts.createChart(container, {
    width: container.clientWidth,
    height: container.clientHeight || 400,
    layout: {
      background: { type: 'solid', color: '#111827' },
      textColor: '#94a3b8'
    },
    grid: {
      vertLines: { color: '#1e293b' },
      horzLines: { color: '#1e293b' }
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: { color: '#f5c842', width: 1, style: LightweightCharts.LineStyle.Dashed },
      horzLine: { color: '#f5c842', width: 1, style: LightweightCharts.LineStyle.Dashed }
    },
    rightPriceScale: {
      borderColor: '#1e293b',
      textColor: '#64748b'
    },
    timeScale: {
      borderColor: '#1e293b',
      textColor: '#64748b',
      timeVisible: true,
      secondsVisible: true
    }
  });

  // Candlestick series
  seriesInstance = chartInstance.addCandlestickSeries({
    upColor: '#10b981',
    downColor: '#ef4444',
    borderUpColor: '#10b981',
    borderDownColor: '#ef4444',
    wickUpColor: '#10b981',
    wickDownColor: '#ef4444'
  });

  // Load initial candles
  if (initialCandles && initialCandles.length > 0) {
    const formatted = initialCandles.map(c => ({
      time: Math.floor(new Date(c.candle_timestamp).getTime() / 1000),
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close)
    })).sort((a, b) => a.time - b.time);

    // Remove duplicates by time
    const unique = [];
    const seen = new Set();
    formatted.forEach(c => {
      if (!seen.has(c.time)) {
        seen.add(c.time);
        unique.push(c);
      }
    });

    seriesInstance.setData(unique);
    chartInstance.timeScale().fitContent();
  }

  // Resize observer
  const resizeObserver = new ResizeObserver(() => {
    if (chartInstance && container) {
      chartInstance.applyOptions({ width: container.clientWidth });
    }
  });
  resizeObserver.observe(container);

  // WebSocket connection
  connectChartWs(providerSlug);

  return { chart: chartInstance, series: seriesInstance };
}

function connectChartWs(providerSlug) {
  const wsUrl = getWsUrl();

  wsInstance = new WebSocket(wsUrl);

  wsInstance.onopen = () => {
    console.log(`[Chart WS] Connected — subscribing to ${providerSlug}`);
    wsInstance.send(JSON.stringify({ subscribe: providerSlug }));
  };

  wsInstance.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.type === 'subscribed') {
        console.log('[Chart WS] Subscribed to:', msg.provider);
        return;
      }

      if (msg.open && msg.close && msg.high && msg.low && msg.timestamp) {
        const candle = {
          time: Math.floor(new Date(msg.timestamp).getTime() / 1000),
          open: parseFloat(msg.open),
          high: parseFloat(msg.high),
          low: parseFloat(msg.low),
          close: parseFloat(msg.close)
        };

        if (seriesInstance) {
          seriesInstance.update(candle);
        }

        // Update price display if element exists
        const priceEl = document.getElementById('current-price');
        if (priceEl) {
          priceEl.textContent = parseFloat(msg.close).toFixed(2);
          priceEl.className = 'price-tag ' + (msg.close >= msg.open ? 'price-up' : 'price-down');
        }

        // Dispatch custom event for other listeners
        window.dispatchEvent(new CustomEvent('newCandle', { detail: msg }));
      }
    } catch (err) {
      console.error('[Chart WS] Parse error:', err);
    }
  };

  wsInstance.onclose = () => {
    console.log('[Chart WS] Disconnected — reconnecting in 3s...');
    setTimeout(() => {
      if (wsInstance && wsInstance.readyState === WebSocket.CLOSED) {
        connectChartWs(providerSlug);
      }
    }, 3000);
  };

  wsInstance.onerror = (err) => {
    console.error('[Chart WS] Error:', err);
  };
}

function switchProvider(providerSlug, containerId) {
  apiFetch(`/api/chart/${providerSlug}/candles`)
    .then(res => {
      if (res && res.ok) {
        initChart(containerId, providerSlug, res.data.candles || []);
      }
    });
}

function destroyChart() {
  if (wsInstance) {
    wsInstance.onclose = null;
    wsInstance.close();
    wsInstance = null;
  }
  if (chartInstance) {
    chartInstance.remove();
    chartInstance = null;
    seriesInstance = null;
  }
}
