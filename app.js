// ---------- Tabs ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ---------- Learn: render tables ----------
function buildTable(tableEl, rows, rowLabels, dataMap) {
  const thead = document.createElement('tr');
  thead.appendChild(document.createElement('th'));
  DEALER_COLS.forEach(c => {
    const th = document.createElement('th');
    th.textContent = c;
    thead.appendChild(th);
  });
  tableEl.appendChild(thead);

  rows.forEach((rowKey, i) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = rowLabels[i];
    tr.appendChild(th);
    dataMap[rowKey].forEach(action => {
      const td = document.createElement('td');
      td.textContent = action;
      td.classList.add(ACTION_CLASS[action]);
      tr.appendChild(td);
    });
    tableEl.appendChild(tr);
  });
}

const HARD_ROWS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const HARD_LABELS = ['8-', '9', '10', '11', '12', '13', '14', '15', '16', '17+'];

const SOFT_ROWS = [13, 14, 15, 16, 17, 18, 19, 20];
const SOFT_LABELS = ['Soft 13 (A,2)', 'Soft 14 (A,3)', 'Soft 15 (A,4)', 'Soft 16 (A,5)',
  'Soft 17 (A,6)', 'Soft 18 (A,7)', 'Soft 19 (A,8)', 'Soft 20 (A,9)'];
// Short labels keep the tables narrow on phones
const SOFT_TABLE_LABELS = ['A,2', 'A,3', 'A,4', 'A,5', 'A,6', 'A,7', 'A,8', 'A,9'];

const PAIR_ROWS = ['A', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
const PAIR_LABELS = ['Pair of Aces', 'Pair of 10s', 'Pair of 9s', 'Pair of 8s', 'Pair of 7s',
  'Pair of 6s', 'Pair of 5s', 'Pair of 4s', 'Pair of 3s', 'Pair of 2s'];
const PAIR_TABLE_LABELS = ['A,A', '10,10', '9,9', '8,8', '7,7', '6,6', '5,5', '4,4', '3,3', '2,2'];

buildTable(document.getElementById('hard-table'), HARD_ROWS, HARD_LABELS, HARD_TOTALS);
buildTable(document.getElementById('soft-table'), SOFT_ROWS, SOFT_TABLE_LABELS, SOFT_TOTALS);
buildTable(document.getElementById('pair-table'), PAIR_ROWS, PAIR_TABLE_LABELS, PAIRS);

// ---------- Learn: plain-English rule lists (derived from the same data) ----------
function summarizeRow(actions) {
  const segments = [];
  let i = 0;
  while (i < actions.length) {
    let j = i;
    while (j + 1 < actions.length && actions[j + 1] === actions[i]) j++;
    const label = i === j ? DEALER_COLS[i] : `${DEALER_COLS[i]}-${DEALER_COLS[j]}`;
    segments.push({ action: actions[i], label });
    i = j + 1;
  }
  return segments;
}

function rowToSentence(rowLabel, actions) {
  const segments = summarizeRow(actions);
  let text;
  if (segments.length === 1) {
    text = `always ${ACTION_PHRASES[segments[0].action]}`;
  } else {
    text = segments
      .map(s => `${ACTION_PHRASES[s.action]} vs ${s.label}`)
      .join(', ');
  }
  return `<li><strong>${rowLabel}:</strong> ${text}</li>`;
}

function renderRuleList(ulId, rows, rowLabels, dataMap) {
  const ul = document.getElementById(ulId);
  ul.innerHTML = rows.map((key, i) => rowToSentence(rowLabels[i], dataMap[key])).join('');
}

renderRuleList('hard-rules', HARD_ROWS, ['8 or less', '9', '10', '11', '12', '13', '14', '15', '16', '17 or more'], HARD_TOTALS);
renderRuleList('soft-rules', SOFT_ROWS, SOFT_LABELS, SOFT_TOTALS);
renderRuleList('pair-rules', PAIR_ROWS, PAIR_LABELS, PAIRS);

// ---------- Practice: quiz ----------
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const TEN_RANKS = ['10','J','Q','K'];
const SUITS = [
  { sym: '♠', red: false }, { sym: '♣', red: false },
  { sym: '♥', red: true }, { sym: '♦', red: true },
];
const STORAGE_KEY = 'bj-stats-v1';

function rankValue(rank) {
  if (rank === 'A') return 11;
  if (TEN_RANKS.includes(rank)) return 10;
  return parseInt(rank, 10);
}

function pairKey(rank) {
  return TEN_RANKS.includes(rank) ? '10' : rank;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeCardEl(rank, suit) {
  const el = document.createElement('div');
  el.className = 'card' + (suit.red ? ' red' : '');
  el.textContent = rank + suit.sym;
  return el;
}

// ----- Saved stats (score + per-situation misses) -----
function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.score && parsed.misses) return parsed;
    }
  } catch (e) { /* storage unavailable */ }
  return { score: { correct: 0, total: 0 }, misses: {} };
}

function saveStats() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch (e) { /* ignore */ }
}

let stats = loadStats();
let current = null;

function situationKey(handType, value, dealerCard) {
  return `${handType}|${value}|${dealerCard}`;
}

function parseSituation(key) {
  const [handType, raw, dealerCard] = key.split('|');
  const value = handType === 'pair' ? raw : parseInt(raw, 10);
  return { handType, value, dealerCard };
}

function handLabel(handType, value) {
  if (handType === 'pair') return value === 'A' ? 'Pair of Aces' : `Pair of ${value}s`;
  if (handType === 'soft') return `Soft ${value}`;
  return `Hard ${value}`;
}

// Hands nearly everyone gets right; skipped most of the time in "close calls" mode
function isTrivial(handType, value) {
  if (handType === 'hard') return value <= 8 || value >= 17;
  if (handType === 'soft') return value >= 19;
  if (handType === 'pair') return value === '10' || value === 'A' || value === '8';
  return false;
}

function randomHand() {
  while (true) {
    const r1 = randomFrom(RANKS);
    const r2 = randomFrom(RANKS);
    if (r1 === r2) return { r1, r2, handType: 'pair', value: pairKey(r1) };
    if (r1 === 'A' || r2 === 'A') {
      const other = r1 === 'A' ? r2 : r1;
      const total = 11 + rankValue(other);
      if (total === 21) continue; // natural blackjack, nothing to decide
      return { r1, r2, handType: 'soft', value: total };
    }
    return { r1, r2, handType: 'hard', value: rankValue(r1) + rankValue(r2) };
  }
}

// Build two cards that make the given situation (used to replay missed hands)
function cardsFor(handType, value) {
  if (handType === 'pair') {
    const r = value === '10' ? randomFrom(TEN_RANKS) : value;
    return { r1: r, r2: r };
  }
  if (handType === 'soft') {
    const other = value - 11 === 10 ? randomFrom(TEN_RANKS) : String(value - 11);
    return Math.random() < 0.5 ? { r1: 'A', r2: other } : { r1: other, r2: 'A' };
  }
  const options = [];
  for (let a = 2; a <= 10; a++) {
    const b = value - a;
    // Equal values would be a pair, except two different 10-value cards (e.g. J+Q)
    if (b >= 2 && b <= 10 && (a !== b || a === 10)) options.push([a, b]);
  }
  const [a, b] = randomFrom(options);
  if (a === 10 && b === 10) {
    const [t1, t2] = [...TEN_RANKS].sort(() => Math.random() - 0.5);
    return { r1: t1, r2: t2 };
  }
  const toRank = v => (v === 10 ? randomFrom(TEN_RANKS) : String(v));
  return { r1: toRank(a), r2: toRank(b) };
}

function pickMissedSituation() {
  const keys = Object.keys(stats.misses);
  if (!keys.length) return null;
  // Weight by how many times each was missed
  const total = keys.reduce((n, k) => n + stats.misses[k], 0);
  let roll = Math.random() * total;
  for (const k of keys) {
    roll -= stats.misses[k];
    if (roll <= 0) return parseSituation(k);
  }
  return parseSituation(keys[keys.length - 1]);
}

function generateQuestion() {
  const tricky = document.getElementById('tricky-toggle').checked;
  let hand, dealerCard;

  const missed = tricky && Math.random() < 0.25 ? pickMissedSituation() : null;
  if (missed) {
    hand = { ...missed, ...cardsFor(missed.handType, missed.value) };
    dealerCard = missed.dealerCard;
  } else {
    do {
      hand = randomHand();
    } while (tricky && isTrivial(hand.handType, hand.value) && Math.random() < 0.85);
    dealerCard = randomFrom(DEALER_COLS);
  }

  current = {
    ...hand,
    dealerCard,
    playerSuits: [randomFrom(SUITS), randomFrom(SUITS)],
    dealerSuit: randomFrom(SUITS),
  };
  renderQuestion();
}

function renderQuestion() {
  const dealerEl = document.getElementById('dealer-card');
  dealerEl.innerHTML = '';
  dealerEl.appendChild(makeCardEl(current.dealerCard, current.dealerSuit));

  const playerEl = document.getElementById('player-cards');
  playerEl.innerHTML = '';
  playerEl.appendChild(makeCardEl(current.r1, current.playerSuits[0]));
  playerEl.appendChild(makeCardEl(current.r2, current.playerSuits[1]));

  document.getElementById('player-total').textContent = handLabel(current.handType, current.value);
  document.getElementById('feedback').textContent = '';
  document.getElementById('next-btn').style.display = 'none';
  document.querySelectorAll('.choice-btn').forEach(b => {
    b.disabled = false;
    b.classList.remove('correct', 'wrong');
  });
}

function renderStats() {
  const { correct, total } = stats.score;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  document.getElementById('score').textContent =
    total > 0 ? `${correct} / ${total} (${pct}%)` : '0 / 0';

  const top = Object.entries(stats.misses).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const panel = document.getElementById('misses-panel');
  panel.style.display = top.length ? 'block' : 'none';
  document.getElementById('misses-list').innerHTML = top.map(([key, n]) => {
    const { handType, value, dealerCard } = parseSituation(key);
    const action = getChartAction(handType, value, dealerCard);
    return `<li><strong>${handLabel(handType, value)} vs ${dealerCard}:</strong> `
      + `${ACTION_PHRASES[action]} <span class="miss-count">missed ${n}×</span></li>`;
  }).join('');
}

document.querySelectorAll('.choice-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    const chosen = btn.dataset.choice;
    const { handType, value, dealerCard } = current;
    const chart = getChartAction(handType, value, dealerCard);
    const correct = getCorrectAction(handType, value, dealerCard);
    const isRight = chosen === correct;
    const key = situationKey(handType, value, dealerCard);

    stats.score.total++;
    if (isRight) {
      stats.score.correct++;
      // Getting a missed hand right works it back off the list
      if (stats.misses[key] && --stats.misses[key] <= 0) delete stats.misses[key];
    } else {
      stats.misses[key] = (stats.misses[key] || 0) + 1;
    }
    saveStats();
    renderStats();

    document.querySelectorAll('.choice-btn').forEach(b => {
      b.disabled = true;
      if (b.dataset.choice === correct) b.classList.add('correct');
      else if (b.dataset.choice === chosen) b.classList.add('wrong');
    });

    const fallback = chart === 'Ds' ? ' (stand if you can\'t double)'
      : chart === 'D' ? ' (hit if you can\'t double)' : '';
    const feedback = document.getElementById('feedback');
    feedback.textContent = isRight
      ? `Correct!${fallback ? ' ' + ACTION_NAMES[correct] + fallback + '.' : ''}`
      : `Not quite — correct play is ${ACTION_NAMES[correct]}${fallback}.`;
    feedback.style.color = isRight ? 'var(--good)' : 'var(--bad)';

    document.getElementById('next-btn').style.display = 'inline-block';
  });
});

document.getElementById('next-btn').addEventListener('click', generateQuestion);

document.getElementById('reset-btn').addEventListener('click', () => {
  if (!confirm('Reset your score and missed hands?')) return;
  stats = { score: { correct: 0, total: 0 }, misses: {} };
  saveStats();
  renderStats();
});

renderStats();
generateQuestion();
