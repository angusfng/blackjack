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

buildTable(
  document.getElementById('hard-table'),
  [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
  ['8-', '9', '10', '11', '12', '13', '14', '15', '16', '17+'],
  HARD_TOTALS
);

buildTable(
  document.getElementById('soft-table'),
  [13, 14, 15, 16, 17, 18, 19, 20],
  ['A,2', 'A,3', 'A,4', 'A,5', 'A,6', 'A,7', 'A,8', 'A,9'],
  SOFT_TOTALS
);

buildTable(
  document.getElementById('pair-table'),
  ['A', '10', '9', '8', '7', '6', '5', '4', '3', '2'],
  ['A,A', '10,10', '9,9', '8,8', '7,7', '6,6', '5,5', '4,4', '3,3', '2,2'],
  PAIRS
);

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
