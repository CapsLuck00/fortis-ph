// ─── FortisPH — Live Interest Ticker ───────────────────

/**
 * startInterestTicker
 * @param {number} currentBalance - Starting balance from server
 * @param {number} ratePerSecond - Interest rate per second (e.g. 0.000035)
 * @param {string} displayElementId - ID of the DOM element to update
 * @returns {object} - { stop, updateBalance }
 */
function startInterestTicker(currentBalance, ratePerSecond, displayElementId) {
  let balance = parseFloat(currentBalance) || 0;
  const rate = parseFloat(ratePerSecond) || 0.000035;
  const el = document.getElementById(displayElementId);

  if (!el) {
    console.warn('[Interest] Display element not found:', displayElementId);
    return { stop: () => {}, updateBalance: () => {} };
  }

  const updateDisplay = () => {
    el.textContent = formatPHP(balance);
  };

  updateDisplay();

  const interval = setInterval(() => {
    const earned = balance * rate;
    balance += earned;
    updateDisplay();
  }, 1000);

  return {
    stop: () => clearInterval(interval),
    updateBalance: (newBalance) => {
      balance = parseFloat(newBalance) || balance;
      updateDisplay();
    }
  };
}

/**
 * startSimpleTicker - for landing page cosmetic counter
 * @param {string} displayElementId
 * @param {number} startValue - Large starting number
 * @param {number} incrementPerSecond
 */
function startSimpleTicker(displayElementId, startValue, incrementPerSecond) {
  let val = parseFloat(startValue);
  const el = document.getElementById(displayElementId);
  if (!el) return;

  const update = () => {
    el.textContent = '₱' + Math.floor(val).toLocaleString('en-PH');
  };

  update();
  setInterval(() => {
    val += incrementPerSecond * (0.8 + Math.random() * 0.4); // slight randomness
    update();
  }, 1000);
}
