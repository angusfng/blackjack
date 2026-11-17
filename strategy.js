// Basic strategy data: dealer upcards in column order 2,3,4,5,6,7,8,9,10,A
// Actions: H=Hit, S=Stand, D=Double (hit if doubling isn't allowed),
// Ds=Double (stand if doubling isn't allowed), P=Split
const DEALER_COLS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];

const HARD_TOTALS = {
  8:  ['H','H','H','H','H','H','H','H','H','H'],
  9:  ['H','D','D','D','D','H','H','H','H','H'],
  10: ['D','D','D','D','D','D','D','D','H','H'],
  11: ['D','D','D','D','D','D','D','D','D','H'],
  12: ['H','H','S','S','S','H','H','H','H','H'],
  13: ['S','S','S','S','S','H','H','H','H','H'],
  14: ['S','S','S','S','S','H','H','H','H','H'],
  15: ['S','S','S','S','S','H','H','H','H','H'],
  16: ['S','S','S','S','S','H','H','H','H','H'],
  17: ['S','S','S','S','S','S','S','S','S','S'],
};

// Keyed by total, hand shown as A+card
const SOFT_TOTALS = {
  13: ['H','H','H','D','D','H','H','H','H','H'], // A,2
  14: ['H','H','H','D','D','H','H','H','H','H'], // A,3
  15: ['H','H','D','D','D','H','H','H','H','H'], // A,4
  16: ['H','H','D','D','D','H','H','H','H','H'], // A,5
  17: ['H','D','D','D','D','H','H','H','H','H'], // A,6
  18: ['S','Ds','Ds','Ds','Ds','S','S','H','H','H'], // A,7
  19: ['S','S','S','S','S','S','S','S','S','S'], // A,8
  20: ['S','S','S','S','S','S','S','S','S','S'], // A,9
};

// Keyed by pair rank label
const PAIRS = {
  'A':  ['P','P','P','P','P','P','P','P','P','P'],
  '10': ['S','S','S','S','S','S','S','S','S','S'],
  '9':  ['P','P','P','P','P','S','P','P','S','S'],
  '8':  ['P','P','P','P','P','P','P','P','P','P'],
  '7':  ['P','P','P','P','P','P','H','H','H','H'],
  '6':  ['P','P','P','P','P','H','H','H','H','H'],
  '5':  ['D','D','D','D','D','D','D','D','H','H'],
  '4':  ['H','H','H','P','P','H','H','H','H','H'],
  '3':  ['P','P','P','P','P','P','H','H','H','H'],
  '2':  ['P','P','P','P','P','P','H','H','H','H'],
};

const ACTION_NAMES = { H: 'Hit', S: 'Stand', D: 'Double', Ds: 'Double', P: 'Split' };
// Longer wording for the plain-English rule lists
const ACTION_PHRASES = { H: 'hit', S: 'stand', D: 'double', Ds: 'double (or stand if you can\'t)', P: 'split' };
const ACTION_CLASS = { H: 'act-h', S: 'act-s', D: 'act-d', Ds: 'act-d', P: 'act-p' };

function colIndex(dealerCard) {
  return DEALER_COLS.indexOf(dealerCard);
}

// Chart action for a hand (may be 'Ds'). handType: 'hard' | 'soft' | 'pair'
// value: hard total number, soft total number, or pair rank string
function getChartAction(handType, value, dealerCard) {
  const idx = colIndex(dealerCard);
  if (handType === 'hard') {
    const total = Math.min(Math.max(value, 8), 17);
    return HARD_TOTALS[total][idx];
  }
  if (handType === 'soft') {
    const total = Math.min(Math.max(value, 13), 20);
    return SOFT_TOTALS[total][idx];
  }
  if (handType === 'pair') {
    return PAIRS[value][idx];
  }
  throw new Error('unknown hand type');
}

// Button the player should press in the quiz (both doubles map to 'D')
function getCorrectAction(handType, value, dealerCard) {
  const a = getChartAction(handType, value, dealerCard);
  return a === 'Ds' ? 'D' : a;
}
