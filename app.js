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

const PAIR_ROWS = ['A', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
const PAIR_LABELS = ['Pair of Aces', 'Pair of 10s', 'Pair of 9s', 'Pair of 8s', 'Pair of 7s',
  'Pair of 6s', 'Pair of 5s', 'Pair of 4s', 'Pair of 3s', 'Pair of 2s'];

buildTable(document.getElementById('hard-table'), HARD_ROWS, HARD_LABELS, HARD_TOTALS);
buildTable(document.getElementById('soft-table'), SOFT_ROWS, SOFT_LABELS, SOFT_TOTALS);
buildTable(document.getElementById('pair-table'), PAIR_ROWS, PAIR_LABELS, PAIRS);

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
    text = `always ${ACTION_NAMES[segments[0].action].toLowerCase()}`;
  } else {
    text = segments
      .map(s => `${ACTION_NAMES[s.action].toLowerCase()} vs ${s.label}`)
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
const SUITS = [
  { sym: '♠', red: false }, { sym: '♣', red: false },
  { sym: '♥', red: true }, { sym: '♦', red: true },
];

function rankValue(rank) {
  if (rank === 'A') return 11;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return parseInt(rank, 10);
}

function pairKey(rank) {
  if (rank === 'J' || rank === 'Q' || rank === 'K') return '10';
  return rank;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeCardEl(rank, suit, extraClass) {
  const el = document.createElement('div');
  el.className = 'card' + (suit.red ? ' red' : '') + (extraClass ? ' ' + extraClass : '');
  el.textContent = rank + suit.sym;
  return el;
}

let current = null;
let score = { correct: 0, total: 0 };

function generateQuestion() {
  let r1, r2, handType, value;

  while (true) {
    r1 = randomFrom(RANKS);
    r2 = randomFrom(RANKS);

    if (r1 === r2) {
      handType = 'pair';
      value = pairKey(r1);
      break;
    }
    const hasAce = r1 === 'A' || r2 === 'A';
    if (hasAce) {
      const other = r1 === 'A' ? r2 : r1;
      const total = 11 + rankValue(other);
      if (total === 21) continue; // natural blackjack, skip
      handType = 'soft';
      value = total;
      break;
    }
    handType = 'hard';
    value = rankValue(r1) + rankValue(r2);
    break;
  }

  const dealerCard = randomFrom(DEALER_COLS);
  const dealerRankDisplay = dealerCard; // '2'..'10','A'

  current = {
    r1, r2, handType, value, dealerCard,
    playerSuits: [randomFrom(SUITS), randomFrom(SUITS)],
    dealerSuit: randomFrom(SUITS),
  };

  renderQuestion();
}

function totalLabel() {
  if (current.handType === 'pair') return 'Pair of ' + current.value + 's';
  if (current.handType === 'soft') return 'Soft ' + current.value;
  return 'Hard ' + current.value;
}

function renderQuestion() {
  const dealerEl = document.getElementById('dealer-card');
  dealerEl.innerHTML = '';
  dealerEl.appendChild(makeCardEl(current.dealerCard, current.dealerSuit));

  const playerEl = document.getElementById('player-cards');
  playerEl.innerHTML = '';
  playerEl.appendChild(makeCardEl(current.r1, current.playerSuits[0]));
  playerEl.appendChild(makeCardEl(current.r2, current.playerSuits[1]));

  document.getElementById('player-total').textContent = totalLabel();
  document.getElementById('feedback').textContent = '';
  document.getElementById('next-btn').style.display = 'none';
  document.querySelectorAll('.choice-btn').forEach(b => {
    b.disabled = false;
    b.classList.remove('correct', 'wrong');
  });
}

document.querySelectorAll('.choice-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    const chosen = btn.dataset.choice;
    const correct = getCorrectAction(current.handType, current.value, current.dealerCard);
    const isRight = chosen === correct;

    score.total++;
    if (isRight) score.correct++;
    document.getElementById('score').textContent = `${score.correct} / ${score.total}`;

    document.querySelectorAll('.choice-btn').forEach(b => {
      b.disabled = true;
      if (b.dataset.choice === correct) b.classList.add('correct');
      else if (b.dataset.choice === chosen) b.classList.add('wrong');
    });

    const feedback = document.getElementById('feedback');
    feedback.textContent = isRight
      ? 'Correct!'
      : `Not quite — correct play is ${ACTION_NAMES[correct]}.`;
    feedback.style.color = isRight ? 'var(--good)' : 'var(--bad)';

    document.getElementById('next-btn').style.display = 'inline-block';
  });
});

document.getElementById('next-btn').addEventListener('click', generateQuestion);

generateQuestion();
