#!/usr/bin/env python3
"""Independently compute basic strategy and compare it with strategy.js.

Rules: 8 decks, dealer stands on soft 17, dealer peeks for blackjack,
double on any two cards, double after split, split aces get one card,
no resplit, no surrender.

Every two-card hand is evaluated against every dealer upcard using the shoe
with those three cards removed. A fast pass computes the whole chart (the
player's later hit cards are removed from the player's draws but not from the
dealer's). Any cell decided by less than CLOSE_CALL is then recomputed exactly
(every card drawn by anyone is removed). Hard and soft totals are weighted
across all two-card combinations that make them.

Run:  python3 tools/verify_strategy.py [--decks N]   (default 8; ~15 seconds)
"""
import json, re, sys
from functools import lru_cache
from pathlib import Path

DECKS = int(sys.argv[sys.argv.index('--decks') + 1]) if '--decks' in sys.argv else 8
CLOSE_CALL = 0.004          # 0.4% of a bet
RANKS = range(1, 11)        # 1 = ace, 10 = any ten-value card
FULL = tuple([4 * DECKS] * 9 + [16 * DECKS])
UPS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 1]
COLS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A']


def rem(shoe, r):
    s = list(shoe); s[r - 1] -= 1; return tuple(s)


def add(total, soft, r):
    total += r
    if r == 1 and not soft and total + 10 <= 21:
        total += 10; soft = True
    if total > 21 and soft:
        total -= 10; soft = False
    return total, soft


@lru_cache(maxsize=None)
def dealer_dist(shoe, total, soft, ncards, up):
    """Probabilities of dealer finishing on 17,18,19,20,21,bust."""
    out = [0.0] * 6
    if total >= 17:
        out[5 if total > 21 else total - 17] = 1.0
        return tuple(out)
    draws = [(r, shoe[r - 1]) for r in RANKS if shoe[r - 1]
             # dealer peeked: the hole card can't give the dealer blackjack
             and not (ncards == 1 and ((up == 1 and r == 10) or (up == 10 and r == 1)))]
    n = sum(c for _, c in draws)
    for r, c in draws:
        t, s = add(total, soft, r)
        d = dealer_dist(rem(shoe, r), t, s, ncards + 1, up)
        for i in range(6):
            out[i] += c / n * d[i]
    return tuple(out)


class Evaluator:
    def __init__(self, base_shoe, up, exact):
        self.base, self.up, self.exact = base_shoe, up, exact
        self.cache = {}

    def dealer(self, shoe):
        t, s = add(0, False, self.up)
        return dealer_dist(shoe if self.exact else self.base, t, s, 1, self.up)

    def stand(self, shoe, total):
        if total > 21:
            return -1.0
        d = self.dealer(shoe)
        ev = d[5]
        for i, v in enumerate(range(17, 22)):
            ev += d[i] if total > v else (-d[i] if total < v else 0)
        return ev

    def best(self, shoe, total, soft):
        key = (shoe, total, soft)
        if key not in self.cache:
            if total > 21:
                v = -1.0
            else:
                v = self.stand(shoe, total)
                if total < 21:
                    v = max(v, self.hit(shoe, total, soft))
            self.cache[key] = v
        return self.cache[key]

    def _draw(self, shoe, total, soft, f):
        n = sum(shoe)
        return sum(shoe[r - 1] / n * f(rem(shoe, r), *add(total, soft, r))
                   for r in RANKS if shoe[r - 1])

    def hit(self, shoe, total, soft):
        return self._draw(shoe, total, soft, self.best)

    def double(self, shoe, total, soft):
        return 2 * self._draw(shoe, total, soft, lambda sh, t, s: self.stand(sh, t))

    def split(self, shoe, card):
        def play(sh, t, s):
            if card == 1:
                return self.stand(sh, t)         # split aces: one card only
            return max(self.best(sh, t, s), self.double(sh, t, s))
        t, s = add(0, False, card)
        return 2 * self._draw(shoe, t, s, play)


def hand_evs(c1, c2, up, exact):
    shoe = rem(rem(rem(FULL, c1), c2), up)
    ev = Evaluator(shoe, up, exact)
    t, s = add(*add(0, False, c1), c2)
    out = {'S': ev.stand(shoe, t), 'H': ev.hit(shoe, t, s), 'D': ev.double(shoe, t, s)}
    if c1 == c2:
        out['P'] = ev.split(shoe, c1)
    return t, s, out


def cell_code(evs):
    best = max(evs, key=evs.get)
    if best == 'D':
        no_double = {k: v for k, v in evs.items() if k != 'D'}
        return 'D' if max(no_double, key=no_double.get) == 'H' else 'Ds'
    return best


def margin(evs):
    v = sorted(evs.values(), reverse=True)
    return v[0] - v[1]


def compute(exact_cells=None):
    """Returns {(table, row, col): evs}. exact_cells limits which are exact."""
    combos = {}
    for c1 in RANKS:
        for c2 in RANKS:
            if c2 < c1:
                continue
            t, s = add(*add(0, False, c1), c2)
            if c1 == c2:
                key = ('pairs', 'A' if c1 == 1 else str(c1))
            elif s and t == 21:
                continue                          # blackjack
            else:
                key = ('soft' if s else 'hard', str(t))
            weight = FULL[c1 - 1] * FULL[c2 - 1] * (1 if c1 == c2 else 2)
            combos.setdefault(key, []).append((c1, c2, weight))
    result = {}
    for ui, up in enumerate(UPS):
        for (table, row), hands in combos.items():
            cell = (table, row, COLS[ui])
            if exact_cells is not None and cell not in exact_cells:
                continue
            exact = exact_cells is not None
            sums, wsum = {}, 0
            for c1, c2, w in hands:
                _, _, evs = hand_evs(c1, c2, up, exact)
                wsum += w
                for k, v in evs.items():
                    sums[k] = sums.get(k, 0) + w * v
            result[cell] = {k: v / wsum for k, v in sums.items()}
    return result


def load_site_chart():
    js = (Path(__file__).resolve().parent.parent / 'strategy.js').read_text()
    chart = {}
    for name, table in (('HARD_TOTALS', 'hard'), ('SOFT_TOTALS', 'soft'), ('PAIRS', 'pairs')):
        body = re.search(name + r'\s*=\s*\{(.*?)\};', js, re.S).group(1)
        for key, arr in re.findall(r"'?(\w+)'?\s*:\s*\[([^\]]*)\]", body):
            chart[(table, key)] = re.findall(r"'(\w+)'", arr)
    return chart


def site_cell(chart, table, row, col):
    if table == 'hard':                           # site groups 5-8 and 17+
        row = str(min(max(int(row), 8), 17))
    return chart[(table, row)][COLS.index(col)]


def main():
    print(f'{DECKS} decks. Fast pass over every cell...', flush=True)
    fast = compute()
    close = {c for c, evs in fast.items() if margin(evs) < CLOSE_CALL}
    print(f'Exact recheck of {len(close)} close calls...', flush=True)
    final = dict(fast)
    final.update(compute(exact_cells=close))

    chart = load_site_chart()
    problems = 0
    for (table, row, col), evs in sorted(final.items()):
        want, have = cell_code(evs), site_cell(chart, table, row, col)
        if want != have:
            problems += 1
            print(f'MISMATCH {table} {row} vs {col}: site={have} computed={want} '
                  + ' '.join(f'{k}={v:+.4f}' for k, v in sorted(evs.items(), key=lambda x: -x[1])))
    print('\nClosest calls (all match the site):' if not problems else '\nClosest calls:')
    for cell in sorted(close, key=lambda c: margin(final[c])):
        table, row, col = cell
        print(f'  {table:5} {row:>2} vs {col:>2}: {cell_code(final[cell]):2} by {margin(final[cell]) * 100:.3f}% of a bet')
    print(f'\n{len(final)} cells checked, {problems} mismatches.')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
