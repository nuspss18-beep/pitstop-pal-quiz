let stock = {
  perry: 70,
  ping: 70,
  ola: 70,
  ty: 70,
  sky: 70,
  tobi: 70,
  iggy: 70
};

let distributed = {
  perry: 0,
  ping: 0,
  ola: 0,
  ty: 0,
  sky: 0,
  tobi: 0,
  iggy: 0
};

// MAIN FUNCTION
function assignPal(resultType) {
  // If preferred type still has stock → give it
  if (stock[resultType] > 0) {
    stock[resultType]--;
    distributed[resultType]++;
    return resultType;
  }

  // Otherwise → find the least distributed available type
  let available = Object.keys(stock)
    .filter(type => stock[type] > 0)
    .sort((a, b) => distributed[a] - distributed[b]);

  if (available.length === 0) {
    return null; // no stock left
  }

  let chosen = available[0];
  stock[chosen]--;
  distributed[chosen]++;

  return chosen;
}

// Admin reset
function resetStock(newStock) {
  stock = { ...newStock };

  distributed = {};
  for (let key in newStock) {
    distributed[key] = 0;
  }
}

function getStats() {
  return { stock, distributed };
}

module.exports = {
  assignPal,
  resetStock,
  getStats
};