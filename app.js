// ---------- Storage helpers ----------
function storeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) { return fallback; }
}
function storeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
}

// ---------- Tabs ----------
function showTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === name));
  storeSet('bj-tab', name);
  window.scrollTo(0, 0);
}
document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));

// ---------- Chart definitions ----------
const TABLES = {
  hard: {
    data: HARD_TOTALS,
    rows: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    short: ['5–8', '9', '10', '11', '12', '13', '14', '15', '16', '17+'],
    name: k => (k === 8 ? 'Hard 5–8' : k === 17 ? 'Hard 17+' : `Hard ${k}`),
    groupName: (a, b) => (a === b ? TABLES.hard.name(a)
      : `Hard ${a === 8 ? 5 : a}–${b === 17 ? '17+' : b}`),
  },
  soft: {
    data: SOFT_TOTALS,
    rows: [13, 14, 15, 16, 17, 18, 19, 20],
    short: ['A,2', 'A,3', 'A,4', 'A,5', 'A,6', 'A,7', 'A,8', 'A,9'],
    name: k => `Soft ${k} (A,${k - 11})`,
    groupName: (a, b) => (a === b ? TABLES.soft.name(a)
      : `Soft ${a}–${b} (A,${a - 11} to A,${b - 11})`),
  },
  pair: {
    data: PAIRS,
    rows: ['A', '10', '9', '8', '7', '6', '5', '4', '3', '2'],
    short: ['A,A', '10,10', '9,9', '8,8', '7,7', '6,6', '5,5', '4,4', '3,3', '2,2'],
    name: k => (k === 'A' ? 'Pair of Aces' : `Pair of ${k}s`),
    groupName: (a, b) => (a === b ? TABLES.pair.name(a) : `Pair of ${a}s or ${b}s`),
  },
};

function rowKeyFor(handType, value) {
  if (handType === 'hard') return Math.min(Math.max(value, 8), 17);
  return value;
}

// "stand vs 2-6, hit vs 7-A"
function describeActions(actions) {
  const segs = [];
  for (let i = 0; i < actions.length;) {
    let j = i;
    while (j + 1 < actions.length && actions[j + 1] === actions[i]) j++;
    segs.push({ action: actions[i], label: i === j ? DEALER_COLS[i] : `${DEALER_COLS[i]}–${DEALER_COLS[j]}` });
    i = j + 1;
  }
  if (segs.length === 1) return `always ${ACTION_PHRASES[segs[0].action]}`;
  return segs.map(s => `${ACTION_PHRASES[s.action]} vs ${s.label}`).join(', ');
}

// Consecutive rows that play identically are listed together
function groupedRules(type) {
  const t = TABLES[type];
  const groups = [];
  t.rows.forEach(k => {
    const sig = t.data[k].join();
    const last = groups[groups.length - 1];
    if (last && last.sig === sig) last.keys.push(k);
    else groups.push({ sig, keys: [k], actions: t.data[k] });
  });
  return groups.map(g => ({
    keys: g.keys,
    label: t.groupName(g.keys[0], g.keys[g.keys.length - 1]),
    text: describeActions(g.actions),
  }));
}

function ruleFor(type, rowKey) {
  return groupedRules(type).find(g => g.keys.includes(rowKey));
}

function actionLong(code) {
  if (code === 'D') return 'Double (hit if you can’t double)';
  if (code === 'Ds') return 'Double (stand if you can’t double)';
  return ACTION_NAMES[code];
}

// ---------- Chart tab ----------
function buildTable(type) {
  const t = TABLES[type];
  const table = document.getElementById(`${type}-table`);
  const info = document.getElementById(`${type}-info`);
  const head = document.createElement('tr');
  head.innerHTML = '<th class="corner">You</th>' + DEALER_COLS.map(c => `<th>${c}</th>`).join('');
  table.appendChild(head);

  t.rows.forEach((k, ri) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<th>${t.short[ri]}</th>`;
    t.data[k].forEach((action, ci) => {
      const td = document.createElement('td');
      td.textContent = action;
      td.className = ACTION_CLASS[action];
      td.addEventListener('click', () => {
        document.querySelectorAll('td.picked').forEach(x => x.classList.remove('picked'));
        td.classList.add('picked');
        info.innerHTML = `<strong>${t.name(k)}</strong>, dealer shows <strong>${DEALER_COLS[ci]}</strong>: `
          + `<span class="${ACTION_CLASS[action]} swatch">${actionLong(action)}</span>`;
      });
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  info.textContent = 'Tap a square to see it in words.';

  document.getElementById(`${type}-rules`).innerHTML = groupedRules(type)
    .map(g => `<li><strong>${g.label}:</strong> ${g.text}</li>`).join('');
}
['hard', 'soft', 'pair'].forEach(buildTable);

document.querySelectorAll('.drill-btn').forEach(btn => btn.addEventListener('click', () => {
  setMode(btn.dataset.drill);
  showTab('practice');
}));

// ---------- Practice: cards ----------
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const TEN_RANKS = ['10', 'J', 'Q', 'K'];
const SUITS = [
  { sym: '♠', red: false }, { sym: '♣', red: false },
  { sym: '♥', red: true }, { sym: '♦', red: true },
];

const randomFrom = arr => arr[Math.floor(Math.random() * arr.length)];
const rankValue = r => (r === 'A' ? 11 : TEN_RANKS.includes(r) ? 10 : parseInt(r, 10));
const pairKey = r => (TEN_RANKS.includes(r) ? '10' : r);
const showRank = r => (r === '10' ? randomFrom(TEN_RANKS) : r);  // 10, J, Q or K

function makeCardEl(rank, suit) {
  const el = document.createElement('div');
  el.className = 'card' + (suit.red ? ' red' : '');
  el.textContent = rank + suit.sym;
  return el;
}

// ---------- Practice: progress ----------
const RECENT = 30;     // accuracy is measured over your last 30 answers
const GOAL = 0.9;
const MODES = {
  hard: 'Hard totals', soft: 'Soft totals', pair: 'Pairs', mixed: 'Mixed',
};

function freshStats() {
  return { recent: { hard: [], soft: [], pair: [], mixed: [] }, misses: {}, streak: 0, best: 0, total: 0 };
}
let stats = storeGet('bj-stats-v2', null);
if (!stats || !stats.recent) {
  stats = freshStats();
  const old = storeGet('bj-stats-v1', null);
  if (old && old.misses) stats.misses = old.misses;
}
let mode = storeGet('bj-mode', 'hard');
if (!MODES[mode]) mode = 'hard';

function accuracy(list) {
  if (!list.length) return null;
  return list.filter(Boolean).length / list.length;
}
function pct(x) { return `${Math.round(x * 100)}%`; }

function pushRecent(key, ok) {
  const list = stats.recent[key];
  list.push(ok ? 1 : 0);
  if (list.length > RECENT) list.shift();
}

function modeStatus(key) {
  const list = stats.recent[key];
  const acc = accuracy(list);
  if (acc === null) return { text: 'Not started', done: false };
  const done = list.length >= 20 && acc >= GOAL;
  return { text: `${pct(acc)} of last ${list.length}`, done };
}

// ---------- Start tab: learning plan ----------
const PLAN = [
  { key: 'hard', title: 'Hard totals', desc: 'The hands you’ll see most. Learn these first.', chart: 'hard' },
  { key: 'soft', title: 'Soft totals', desc: 'Hands with an Ace counting as 11.', chart: 'soft' },
  { key: 'pair', title: 'Pairs', desc: 'When to split.', chart: 'pairs' },
  { key: 'mixed', title: 'Mix it up', desc: 'Every kind of hand, like at a real table.', chart: null },
];

function renderPlan() {
  document.getElementById('plan').innerHTML = PLAN.map((p, i) => {
    const st = modeStatus(p.key);
    return `<div class="plan-step${st.done ? ' done' : ''}">
      <div class="plan-num">${st.done ? '✓' : i + 1}</div>
      <div class="plan-body">
        <div class="plan-title">${p.title}</div>
        <div class="plan-desc">${p.desc}</div>
        <div class="plan-status">${st.text}${st.done ? ' · goal reached' : ''}</div>
        <div class="plan-actions">
          ${p.chart ? `<button class="link-btn" data-chart="${p.chart}">Study chart</button>` : ''}
          <button class="link-btn" data-practice="${p.key}">Practice</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
document.getElementById('plan').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.practice) { setMode(b.dataset.practice); showTab('practice'); }
  if (b.dataset.chart) {
    showTab('chart');
    document.getElementById(b.dataset.chart).scrollIntoView();
  }
});

// ---------- Practice: dealing ----------
// Hands nearly everyone gets right; mostly skipped when "skip easy hands" is on
function isEasy(handType, value) {
  if (handType === 'hard') return value <= 8 || value >= 17;
  if (handType === 'soft') return value >= 19;
  return value === '10' || value === 'A' || value === '8';
}

function dealHard() {
  while (true) {
    const r1 = randomFrom(RANKS.slice(0, 12)), r2 = randomFrom(RANKS.slice(0, 12));
    if (pairKey(r1) === pairKey(r2)) continue;   // that's a pair (J+Q counts too)
    return { r1, r2, handType: 'hard', value: rankValue(r1) + rankValue(r2) };
  }
}
function dealSoft() {
  const other = String(2 + Math.floor(Math.random() * 8));  // A,2 .. A,9
  const [r1, r2] = Math.random() < 0.5 ? ['A', other] : [other, 'A'];
  return { r1, r2, handType: 'soft', value: 11 + parseInt(other, 10) };
}
function dealPair() {
  const key = randomFrom(TABLES.pair.rows);
  if (key === '10') {
    const r1 = randomFrom(TEN_RANKS);
    return { r1, r2: randomFrom(TEN_RANKS), handType: 'pair', value: '10' };
  }
  return { r1: key, r2: key, handType: 'pair', value: key };
}
function dealMixed() {
  while (true) {
    const r1 = randomFrom(RANKS), r2 = randomFrom(RANKS);
    if (pairKey(r1) === pairKey(r2)) return { r1, r2, handType: 'pair', value: pairKey(r1) };
    if (r1 === 'A' || r2 === 'A') {
      const total = 11 + rankValue(r1 === 'A' ? r2 : r1);
      if (total === 21) continue;   // blackjack: nothing to decide
      return { r1, r2, handType: 'soft', value: total };
    }
    return { r1, r2, handType: 'hard', value: rankValue(r1) + rankValue(r2) };
  }
}
const DEALERS = { hard: dealHard, soft: dealSoft, pair: dealPair, mixed: dealMixed };

// Cards that make a given hand (used to repeat a missed hand)
function cardsFor(handType, value) {
  if (handType === 'pair') return value === '10'
    ? { r1: randomFrom(TEN_RANKS), r2: randomFrom(TEN_RANKS) } : { r1: value, r2: value };
  if (handType === 'soft') {
    const other = showRank(String(value - 11));
    return Math.random() < 0.5 ? { r1: 'A', r2: other } : { r1: other, r2: 'A' };
  }
  const opts = [];
  for (let a = 2; a <= 10; a++) {
    const b = value - a;
    if (b >= 2 && b <= 10 && a !== b) opts.push([a, b]);
  }
  if (!opts.length) return null;   // e.g. hard 20 can't be two non-pair cards
  const [a, b] = randomFrom(opts);
  return { r1: showRank(String(a)), r2: showRank(String(b)) };
}

const missKey = (h, v, d) => `${h}|${v}|${d}`;
function parseMiss(key) {
  const [handType, raw, dealerCard] = key.split('|');
  return { handType, value: handType === 'pair' ? raw : parseInt(raw, 10), dealerCard };
}

function pickMiss() {
  const keys = Object.keys(stats.misses).filter(k => mode === 'mixed' || k.startsWith(mode + '|'));
  if (!keys.length) return null;
  const total = keys.reduce((n, k) => n + stats.misses[k], 0);
  let roll = Math.random() * total;
  for (const k of keys) { roll -= stats.misses[k]; if (roll <= 0) return parseMiss(k); }
  return parseMiss(keys[keys.length - 1]);
}

let current = null;

function nextHand() {
  const skipEasy = document.getElementById('tricky-toggle').checked;
  let hand, dealerCard;
  let miss = skipEasy && Math.random() < 0.25 ? pickMiss() : null;
  const missCards = miss && cardsFor(miss.handType, miss.value);
  if (!missCards) miss = null;
  if (miss) {
    hand = { ...miss, ...missCards };
    dealerCard = miss.dealerCard;
  } else {
    do { hand = DEALERS[mode](); } while (skipEasy && isEasy(hand.handType, hand.value) && Math.random() < 0.85);
    dealerCard = randomFrom(DEALER_COLS);
  }
  // Never repeat the exact same question twice in a row
  if (current && !miss && current.handType === hand.handType && current.value === hand.value
      && current.dealerCard === dealerCard) return nextHand();

  current = { ...hand, dealerCard, dealerShown: showRank(dealerCard), answered: false };
  renderHand();
}

function handLabel(handType, value) {
  if (handType === 'pair') return TABLES.pair.name(value);
  return `${handType === 'soft' ? 'Soft' : 'Hard'} ${value}`;
}

function renderHand() {
  const d = document.getElementById('dealer-card');
  d.innerHTML = '';
  d.appendChild(makeCardEl(current.dealerShown, randomFrom(SUITS)));
  const p = document.getElementById('player-cards');
  p.innerHTML = '';
  p.appendChild(makeCardEl(current.r1, randomFrom(SUITS)));
  p.appendChild(makeCardEl(current.r2, randomFrom(SUITS)));
  document.getElementById('player-total').textContent = handLabel(current.handType, current.value);

  document.querySelectorAll('.choice-btn').forEach(b => {
    b.classList.remove('correct', 'wrong');
    // Splitting is only possible with a pair
    b.disabled = b.dataset.choice === 'P' && current.handType !== 'pair';
  });
  document.getElementById('feedback').classList.remove('show', 'good', 'bad');
  document.getElementById('next-btn').hidden = true;
  renderQuizTop();
}

// A short "why" for the most common situations
function whyFor(handType, value, dealerCard, action) {
  const weak = ['2', '3', '4', '5', '6'].includes(dealerCard);
  if (handType === 'pair') {
    if (value === 'A') return 'Two hands that each start with 11 are far better than one soft 12.';
    if (value === '8') return '16 is the worst total. Two hands starting at 8 lose less.';
    if (value === '10') return '20 is a great hand. Don’t break it up.';
    if (value === '5') return 'A pair of 5s is just a 10. Play it like hard 10.';
  }
  if (handType === 'hard') {
    if (value >= 17) return 'Most cards would bust you. Stand and let the dealer try to beat you.';
    if (value >= 12 && action === 'S') return 'The dealer shows a weak card and busts often. Don’t risk busting first.';
    if (value >= 12 && !weak) return 'The dealer will probably reach 17 or more. Standing on 12–16 loses too often, so hit.';
    if (value >= 9 && value <= 11 && action === 'D') return 'You’re likely to get a strong hand with one card. Get more money on the table.';
  }
  if (handType === 'soft' && action === 'H') return 'A soft hand can’t bust on one card, so hitting is free to improve it.';
  return '';
}

function miniRow(type, rowKey, col) {
  return DEALER_COLS.map((c, i) => {
    const a = TABLES[type].data[rowKey][i];
    return `<div class="mini-cell ${ACTION_CLASS[a]}${c === col ? ' here' : ''}"><span>${c}</span>${a}</div>`;
  }).join('');
}

function answer(chosen) {
  if (!current || current.answered) return;
  current.answered = true;
  const { handType, value, dealerCard } = current;
  const chart = getChartAction(handType, value, dealerCard);
  const correct = getCorrectAction(handType, value, dealerCard);
  const ok = chosen === correct;
  const key = missKey(handType, value, dealerCard);

  pushRecent(handType, ok);
  if (mode === 'mixed') pushRecent('mixed', ok);
  stats.total++;
  stats.streak = ok ? stats.streak + 1 : 0;
  stats.best = Math.max(stats.best, stats.streak);
  if (ok) {
    if (stats.misses[key] && --stats.misses[key] <= 0) delete stats.misses[key];
  } else {
    stats.misses[key] = (stats.misses[key] || 0) + 1;
  }
  storeSet('bj-stats-v2', stats);

  document.querySelectorAll('.choice-btn').forEach(b => {
    b.disabled = true;
    if (b.dataset.choice === correct) b.classList.add('correct');
    else if (b.dataset.choice === chosen) b.classList.add('wrong');
  });

  const rowKey = rowKeyFor(handType, value);
  const rule = ruleFor(handType, rowKey);
  const why = whyFor(handType, value, dealerCard, correct);
  const fb = document.getElementById('feedback');
  fb.classList.add('show', ok ? 'good' : 'bad');
  document.getElementById('feedback-title').textContent =
    (ok ? 'Correct: ' : 'Not quite. The play is ') + actionLong(chart) + (ok ? '' : '.');
  document.getElementById('feedback-rule').innerHTML =
    `<strong>${rule.label}:</strong> ${rule.text}.` + (why ? `<div class="why">${why}</div>` : '');
  document.getElementById('feedback-row').innerHTML = miniRow(handType, rowKey, dealerCard);

  const next = document.getElementById('next-btn');
  next.hidden = false;
  next.focus({ preventScroll: true });
  renderQuizTop();
  renderProgress();
}

document.querySelectorAll('.choice-btn').forEach(b => b.addEventListener('click', () => answer(b.dataset.choice)));
document.getElementById('next-btn').addEventListener('click', nextHand);

function renderQuizTop() {
  const key = mode === 'mixed' ? 'mixed' : mode;
  const acc = accuracy(stats.recent[key]);
  document.getElementById('mode-score').textContent = acc === null
    ? `${MODES[mode]}: no answers yet`
    : `${MODES[mode]}: ${pct(acc)} of last ${stats.recent[key].length}`;
  document.getElementById('streak').textContent = stats.streak > 1 ? `Streak ${stats.streak}` : '';
}

function renderProgress() {
  document.getElementById('progress').innerHTML = Object.keys(MODES).map(k => {
    const st = modeStatus(k);
    return `<div class="progress-item${st.done ? ' done' : ''}">
      <div class="progress-name">${MODES[k]}</div><div class="progress-val">${st.text}</div></div>`;
  }).join('') + `<div class="progress-item"><div class="progress-name">Best streak</div>
      <div class="progress-val">${stats.best}</div></div>`;

  const top = Object.entries(stats.misses).sort((a, b) => b[1] - a[1]).slice(0, 5);
  document.getElementById('misses-panel').style.display = top.length ? 'block' : 'none';
  document.getElementById('misses-list').innerHTML = top.map(([k, n]) => {
    const { handType, value, dealerCard } = parseMiss(k);
    const a = getChartAction(handType, value, dealerCard);
    return `<li><strong>${handLabel(handType, value)} vs ${dealerCard}:</strong> ${ACTION_PHRASES[a]}`
      + ` <span class="miss-count">missed ${n}×</span></li>`;
  }).join('');
  renderPlan();
}

function setMode(m) {
  mode = m;
  storeSet('bj-mode', m);
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('active', c.dataset.mode === m);
    c.setAttribute('aria-checked', c.dataset.mode === m);
  });
  current = null;
  nextHand();
}
document.querySelectorAll('.chip').forEach(c => {
  c.setAttribute('role', 'radio');
  c.addEventListener('click', () => setMode(c.dataset.mode));
});

document.getElementById('reset-btn').addEventListener('click', () => {
  if (!confirm('Reset all your practice progress?')) return;
  stats = freshStats();
  storeSet('bj-stats-v2', stats);
  renderProgress();
  renderQuizTop();
});

// ---------- Init ----------
renderProgress();
setMode(mode);
showTab(storeGet('bj-tab', 'start'));
