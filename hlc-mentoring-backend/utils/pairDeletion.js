function pairMonth(pair) {
  const monthlyIdMonth = /^T(1[0-2]|[1-9])Q[1-4]\d{4}/i.exec(String(pair.monthlyId || ''));
  const legacyMonth = /^(0?[1-9]|1[0-2])/.exec(String(pair.monthlyCode || pair.pairCode || ''));
  const month = Number(monthlyIdMonth?.[1] || legacyMonth?.[1]);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
}

function pairsFromSelectedMonth(quarterPairs, selectedPair) {
  const selectedMonth = pairMonth(selectedPair);
  return quarterPairs.filter((pair) => {
    if (pair.monthlyId === selectedPair.monthlyId) return true;
    const month = pairMonth(pair);
    return selectedMonth !== null && month !== null && month >= selectedMonth;
  });
}

module.exports = { pairMonth, pairsFromSelectedMonth };
