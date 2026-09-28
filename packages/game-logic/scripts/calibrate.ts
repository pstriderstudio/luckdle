/**
 * Calibration check (TODO.md §4): every game's expected score is 50, but
 * games differ in spread. This works out, exactly (scores binned to 0.1):
 *   1. each game's score distribution and spread;
 *   2. the daily-score distribution of every possible five-game board;
 *   3. how often each board reaches the daily Charmed label (top 20%) and
 *      the top-100 leaderboard for different numbers of players;
 *   4. how much Lucky Number skill changes the expected score.
 * A Monte Carlo run cross-checks the exact results.
 *
 * Run: npm run calibrate            (prints a Markdown report)
 *      npm run calibrate -- --json  (prints the raw numbers)
 */
import {
  BOARDS,
  GAME_IDS,
  GAMES,
  type GameId,
  SAMPLE_SCORE,
  seededRng,
  dailySummon,
  dice,
  cardPack,
  luckyFishing,
  gemBreaker,
  gardenOfChance,
  fallingStar,
  wishingWell,
  threeChests,
  coinStreak,
  luckyNumber,
} from '../src/index.ts';

const BIN = 10; // bins per score point (0.1 resolution)
const GAME_BINS = 100 * BIN + 1;

type Dist = Float64Array; // probability per bin

function fromGroups(groups: { score: number; probability: number }[]): Dist {
  const d = new Float64Array(GAME_BINS);
  for (const g of groups) d[Math.round(g.score * BIN)] += g.probability;
  return normalise(d);
}

function normalise(d: Dist): Dist {
  const total = d.reduce((s, x) => s + x, 0);
  return d.map((x) => x / total);
}

function coinStreakGroups() {
  return Array.from({ length: 90 }, (_, k) => coinStreak.evaluateStreak(k));
}

/** Score distribution for a Lucky Number strategy, given guess counts over all 10,000 secrets. */
function luckyNumberGroups(counts: Record<number, number>) {
  const total = Object.values(counts).reduce((s, c) => s + c, 0);
  return Object.entries(counts).map(([g, c]) => ({ score: luckyNumber.evaluateLuckyNumber(Number(g)).score, probability: c / total }));
}

export const GAME_DISTS: Record<GameId, Dist> = {
  'dice-of-destiny': fromGroups(dice.diceTable()),
  'mystery-card-pack': fromGroups(cardPack.packTable()),
  'daily-summon': fromGroups(dailySummon.summonTable()),
  'lucky-fishing': fromGroups(luckyFishing.fishingTable()),
  'gem-breaker': fromGroups(gemBreaker.gemTable()),
  'garden-of-chance': fromGroups(gardenOfChance.gardenTable()),
  'falling-star': fromGroups(fallingStar.fallingStarTable()),
  'wishing-well': fromGroups(wishingWell.wishingWellTable()),
  'three-chests': fromGroups(threeChests.chestsTable()),
  'coin-streak': fromGroups(coinStreakGroups()),
  'lucky-number': fromGroups(luckyNumberGroups(luckyNumber.REFERENCE_GUESS_COUNTS)),
};

function mean(d: Dist, scale = BIN): number {
  let m = 0;
  for (let i = 0; i < d.length; i++) m += (i / scale) * d[i];
  return m;
}

function sd(d: Dist, scale = BIN): number {
  const m = mean(d, scale);
  let v = 0;
  for (let i = 0; i < d.length; i++) v += (i / scale - m) ** 2 * d[i];
  return Math.sqrt(v);
}

function convolve(a: Dist, b: Dist): Dist {
  const out = new Float64Array(a.length + b.length - 1);
  const nzB: number[] = [];
  for (let j = 0; j < b.length; j++) if (b[j] > 0) nzB.push(j);
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    if (ai === 0) continue;
    for (const j of nzB) out[i + j] += ai * b[j];
  }
  return out;
}

function combinations<T>(items: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [first, ...rest] = items;
  return [...combinations(rest, k - 1).map((c) => [first, ...c]), ...combinations(rest, k)];
}

const memo = new Map<string, Dist>();

/** Distribution of the summed scores of some games (catalog order), sharing partial sums. */
function sumOf(games: GameId[], dists: Record<GameId, Dist> = GAME_DISTS): Dist {
  const key = games.join('|');
  const hit = dists === GAME_DISTS ? memo.get(key) : undefined;
  if (hit) return hit;
  const d = games.length === 1 ? dists[games[0]] : convolve(sumOf(games.slice(0, -1), dists), dists[games[games.length - 1]]);
  if (dists === GAME_DISTS) memo.set(key, d);
  return d;
}

/** Daily-score distributions (sum of five scores, index = sum × BIN) for every board. */
function boardDistributions(): Map<string, Dist> {
  const boards = new Map<string, Dist>();
  for (const board of combinations([...GAME_IDS], 5)) boards.set(board.join('|'), sumOf(board));
  return boards;
}

/** P(sum ≥ cutoffIndex). */
function tail(d: Dist, cutoff: number): number {
  let p = 0;
  for (let i = Math.max(0, Math.ceil(cutoff)); i < d.length; i++) p += d[i];
  return p;
}

/** Smallest sum index whose upper tail in the mixture is ≤ q. */
function mixtureCutoff(boards: Dist[], q: number): number {
  const len = boards[0].length;
  const mix = new Float64Array(len);
  for (const b of boards) for (let i = 0; i < len; i++) mix[i] += b[i] / boards.length;
  let upper = 0;
  for (let i = len - 1; i >= 0; i--) {
    if (upper + mix[i] > q) return i + 1;
    upper += mix[i];
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Lucky Number strategies

type Strategy = (secret: number, rng: ReturnType<typeof seededRng>) => number;

function playStrategy(pick: (candidates: number[], rng: ReturnType<typeof seededRng>) => number, useRevealed: boolean, useExclusions: boolean): Strategy {
  return (secret, rng) => {
    const d = luckyNumber.digitCount(secret);
    const s = String(secret);
    const { min, max } = luckyNumber.digitRange(d);
    let candidates: number[] = [];
    for (let n = min; n <= max; n++) candidates.push(n);
    for (let count = 1; ; count++) {
      const guess = pick(candidates, rng);
      if (guess === secret) return count;
      const g = String(guess);
      const higher = secret > guess;
      candidates = candidates.filter((n) => {
        if (higher ? n <= guess : n >= guess) return false;
        const ns = String(n);
        for (let i = 0; i < d; i++) {
          if (useRevealed && g[i] === s[i] && ns[i] !== s[i]) return false;
          if (useExclusions && g[i] !== s[i] && ns[i] === g[i]) return false;
        }
        return true;
      });
    }
  };
}

const middle = (c: number[]) => c[Math.floor((c.length - 1) / 2)];
const randomPick = (c: number[], rng: ReturnType<typeof seededRng>) => c[rng.int(c.length)];

export const LUCKY_NUMBER_STRATEGIES: Record<string, Strategy> = {
  'Reference: middle guess, uses higher/lower + revealed digits': playStrategy(middle, true, false),
  'Expert: also rules out unrevealed digits': playStrategy(middle, true, true),
  'Casual: random possible number (uses hints + revealed digits)': playStrategy(randomPick, true, false),
  'Ignores revealed digits: middle guess from higher/lower only': playStrategy(middle, false, false),
};

function strategyCounts(strategy: Strategy): Record<number, number> {
  const rng = seededRng(7);
  const counts: Record<number, number> = {};
  for (let secret = 0; secret <= luckyNumber.MAX_SECRET; secret++) {
    const g = strategy(secret, rng);
    counts[g] = (counts[g] ?? 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Report

const fmt = (x: number, d = 1) => x.toFixed(d);
const pct = (x: number, d = 1) => `${(100 * x).toFixed(d)}%`;
const name = (g: GameId) => GAMES[g].name;

function main() {
  const json = process.argv.includes('--json');
  const out: string[] = [];
  const results: Record<string, unknown> = {};

  // 1. Games
  const games = GAME_IDS.map((g) => {
    const d = GAME_DISTS[g];
    return {
      game: g,
      mean: mean(d),
      sd: sd(d),
      pAtLeast90: tail(d, 90 * BIN),
      pAtMost10: 1 - tail(d, 10 * BIN + 1),
    };
  }).sort((a, b) => b.sd - a.sd);
  results.games = games;
  out.push('## 1. Game score spreads', '', '| Game | Mean | Std. dev. | P(score ≥ 90) | P(score ≤ 10) |', '| --- | --- | --- | --- | --- |');
  for (const g of games) out.push(`| ${name(g.game)} | ${fmt(g.mean, 2)} | ${fmt(g.sd)} | ${pct(g.pAtLeast90)} | ${pct(g.pAtMost10)} |`);

  // 2. Boards
  const boards = boardDistributions();
  const boardList = [...boards.entries()].map(([key, d]) => ({ games: key.split('|') as GameId[], d }));
  const all = boardList.map((b) => b.d);
  const scale = BIN * 5; // sum index → daily score
  const levels = [
    { key: 'charmed', label: 'Charmed (top 20%)', q: 0.2 },
    { key: 'top100of1000', label: 'Top 100 of 1,000 (top 10%)', q: 0.1 },
    { key: 'top100of10000', label: 'Top 100 of 10,000 (top 1%)', q: 0.01 },
    { key: 'top100of100000', label: 'Top 100 of 100,000 (top 0.1%)', q: 0.001 },
  ];
  const cutoffs = Object.fromEntries(levels.map((l) => [l.key, mixtureCutoff(all, l.q)]));
  const rows = boardList.map((b) => ({
    games: b.games,
    sd: sd(b.d, scale),
    rates: Object.fromEntries(levels.map((l) => [l.key, tail(b.d, cutoffs[l.key]) / l.q])),
  }));
  results.cutoffs = Object.fromEntries(levels.map((l) => [l.key, cutoffs[l.key] / scale]));
  out.push(
    '',
    '## 2. Daily score by board',
    '',
    `All ${rows.length} possible boards, each assumed equally common. Daily-score cut-offs for the whole field: ` +
      levels.map((l) => `${l.label} ≥ ${fmt(cutoffs[l.key] / scale, 2)}`).join('; ') +
      '.',
    '',
    'Each rate below is relative to the field (1.00× = the average board).',
    '',
    '| Level | Lowest board | Median board | Highest board | Highest ÷ lowest |',
    '| --- | --- | --- | --- | --- |',
  );
  const levelSummary: Record<string, unknown> = {};
  for (const l of levels) {
    const sorted = [...rows].sort((a, b) => a.rates[l.key] - b.rates[l.key]);
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    const med = sorted[Math.floor(sorted.length / 2)];
    levelSummary[l.key] = { lowest: lo, median: med.rates[l.key], highest: hi };
    out.push(`| ${l.label} | ${fmt(lo.rates[l.key], 2)}× | ${fmt(med.rates[l.key], 2)}× | ${fmt(hi.rates[l.key], 2)}× | ${fmt(hi.rates[l.key] / lo.rates[l.key], 1)} |`);
  }
  results.levels = levelSummary;
  const sdSorted = [...rows].sort((a, b) => a.sd - b.sd);
  out.push(
    '',
    `Daily-score spread by board: std. dev. from ${fmt(sdSorted[0].sd, 1)} (${sdSorted[0].games.map(name).join(', ')}) ` +
      `to ${fmt(sdSorted[sdSorted.length - 1].sd, 1)} (${sdSorted[sdSorted.length - 1].games.map(name).join(', ')}).`,
    '',
  );
  for (const key of ['top100of10000', 'charmed']) {
    const l = levels.find((x) => x.key === key)!;
    const sorted = [...rows].sort((a, b) => b.rates[key] - a.rates[key]);
    out.push(`### ${l.label}: most and least favoured boards`, '', '| Board | Rate |', '| --- | --- |');
    for (const r of [...sorted.slice(0, 3), ...sorted.slice(-3)]) out.push(`| ${r.games.map(name).join(', ')} | ${fmt(r.rates[key], 2)}× |`);
    out.push('');
  }

  // Per-game effect: average rate of boards with vs without the game.
  out.push('### Effect of including each game', '', '| Game | Charmed rate with / without | Top-1% rate with / without |', '| --- | --- | --- |');
  const perGame = GAME_IDS.map((g) => {
    const avg = (key: string, has: boolean) => {
      const sel = rows.filter((r) => r.games.includes(g) === has);
      return sel.reduce((s, r) => s + r.rates[key], 0) / sel.length;
    };
    return { game: g, charmed: avg('charmed', true) / avg('charmed', false), top1: avg('top100of10000', true) / avg('top100of10000', false) };
  }).sort((a, b) => b.top1 - a.top1);
  results.perGame = perGame;
  for (const p of perGame) out.push(`| ${name(p.game)} | ${fmt(p.charmed, 2)}× | ${fmt(p.top1, 2)}× |`);

  // 3. Monte Carlo cross-check.
  const rng = seededRng(2026);
  const trials = 200_000;
  let hits = 0;
  let sumMean = 0;
  for (let i = 0; i < trials; i++) {
    const board = combinations([...GAME_IDS], 5)[rng.int(462)];
    const score = board.reduce((s, g) => s + SAMPLE_SCORE[g](rng), 0) / 5;
    sumMean += score;
    if (score >= cutoffs.top100of1000 / scale) hits++;
  }
  results.monteCarlo = { meanDailyScore: sumMean / trials, top10Share: hits / trials };
  out.push(
    '',
    `Monte Carlo cross-check (${trials.toLocaleString('en-US')} simulated days, random boards): mean daily score ${fmt(sumMean / trials, 2)}; ` +
      `share at or above the top-10% cut-off ${pct(hits / trials, 2)} (exact: 10% up to binning).`,
  );

  // 4. Lucky Number skill.
  out.push(
    '',
    '## 3. Lucky Number skill',
    '',
    'Rates are for boards that include Lucky Number, relative to the field (all other players assumed to play like the reference player).',
    '',
    '| Strategy | Mean guesses | Expected score | Expected daily score | Charmed rate | Top-1% rate | Top-0.1% rate |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  );
  const others = GAME_IDS.filter((g) => g !== 'lucky-number');
  const fours = combinations(others, 4);
  const strategies: Record<string, unknown> = {};
  for (const [label, strategy] of Object.entries(LUCKY_NUMBER_STRATEGIES)) {
    const counts = strategyCounts(strategy);
    const total = Object.values(counts).reduce((s, c) => s + c, 0);
    const meanGuesses = Object.entries(counts).reduce((s, [g, c]) => s + Number(g) * c, 0) / total;
    const expected = luckyNumberGroups(counts).reduce((s, g) => s + g.score * g.probability, 0);
    const lnDist = fromGroups(luckyNumberGroups(counts));
    const rate = (key: string, q: number) =>
      fours.reduce((s, four) => s + tail(convolve(sumOf(four), lnDist), cutoffs[key]), 0) / fours.length / q;
    const r = { charmed: rate('charmed', 0.2), top1: rate('top100of10000', 0.01), top01: rate('top100of100000', 0.001) };
    strategies[label] = { meanGuesses, expected, rates: r, counts };
    out.push(
      `| ${label} | ${fmt(meanGuesses, 2)} | ${fmt(expected, 1)} | ${fmt(50 + (expected - 50) / 5, 1)} | ${fmt(r.charmed, 2)}× | ${fmt(r.top1, 2)}× | ${fmt(r.top01, 2)}× |`,
    );
  }
  results.luckyNumber = strategies;

  console.log(json ? JSON.stringify(results, null, 2) : out.join('\n'));
}

main();
