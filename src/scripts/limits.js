const LIMIT_KEY = 'tuka-bg-uses';
const DAILY_LIMIT = 3;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getStoredUses() {
  try {
    const raw = localStorage.getItem(LIMIT_KEY);
    if (!raw) return { date: getTodayKey(), count: 0 };
    const parsed = JSON.parse(raw);
    if (parsed.date !== getTodayKey()) {
      return { date: getTodayKey(), count: 0 };
    }
    return parsed;
  } catch {
    return { date: getTodayKey(), count: 0 };
  }
}

function getRemainingUses() {
  const used = getStoredUses();
  return Math.max(0, DAILY_LIMIT - used.count);
}

function consumeUse() {
  const used = getStoredUses();
  const next = { date: used.date, count: used.count + 1 };
  localStorage.setItem(LIMIT_KEY, JSON.stringify(next));
  return next;
}

function initLimits() {
  // Inicialização — força limpeza se for novo dia
  const used = getStoredUses();
  localStorage.setItem(LIMIT_KEY, JSON.stringify(used));
}
