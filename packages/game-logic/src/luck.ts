/**
 * The shared 0–100 luck score and the five luck labels used by every game.
 *
 * Score = 100 × (share of the game's results ranked below yours + ½ × share
 * that tie with yours). Shares are probability-weighted.
 */

export const LUCK_LABELS = ['Jinxed', 'Unlucky', 'Fair Luck', 'Lucky', 'Charmed'] as const;
export type LuckLabel = (typeof LUCK_LABELS)[number];

/** One distinct result of a game (or a set of results that tie in luck). */
export interface RankedGroup<T> {
  /** Results in this tie group. */
  outcomes: T[];
  /** Total probability of the group. */
  probability: number;
  /** Probability of all results ranked strictly below this group. */
  below: number;
  /** Shared 0–100 luck score. */
  score: number;
  /** Luck label under the game's cut-offs. */
  label: LuckLabel;
}

export interface WeightedOutcome<T> {
  value: T;
  probability: number;
}

/**
 * Groups outcomes into luck tie groups, lowest luck first, and computes each
 * group's score. `compare` must return < 0 when `a` is less lucky than `b`
 * and 0 when they tie. Labels come from `labelIndexes` (one per group) or,
 * when omitted, from {@link optimalLabelCutoffs}.
 */
export function rankOutcomes<T>(
  outcomes: WeightedOutcome<T>[],
  compare: (a: T, b: T) => number,
  labelIndexes?: (groups: { outcomes: T[]; probability: number }[]) => number[],
): RankedGroup<T>[] {
  const sorted = [...outcomes].sort((a, b) => compare(a.value, b.value));
  const raw: { outcomes: T[]; probability: number }[] = [];
  for (const o of sorted) {
    const last = raw[raw.length - 1];
    if (last && compare(last.outcomes[0], o.value) === 0) {
      last.outcomes.push(o.value);
      last.probability += o.probability;
    } else {
      raw.push({ outcomes: [o.value], probability: o.probability });
    }
  }
  const total = raw.reduce((s, g) => s + g.probability, 0);
  if (Math.abs(total - 1) > 1e-9) {
    throw new Error(`Outcome probabilities sum to ${total}, expected 1`);
  }
  const labels = labelIndexes ? labelIndexes(raw) : optimalLabelCutoffs(raw.map((g) => g.probability));
  if (labels.length !== raw.length) throw new Error('One label index is required per group');
  let below = 0;
  return raw.map((g, i) => {
    const group: RankedGroup<T> = {
      outcomes: g.outcomes,
      probability: g.probability,
      below,
      score: 100 * (below + g.probability / 2),
      label: LUCK_LABELS[labels[i]],
    };
    below += g.probability;
    return group;
  });
}

/**
 * Chooses per-game label cut-offs over tie groups (lowest luck first): each
 * label covers a contiguous, non-empty run of groups, ties always share a
 * label, and the label frequencies are as close to 20% each as possible
 * (minimum sum of squared differences from 20%). Returns a label index
 * (0 = Jinxed … 4 = Charmed) for every group.
 */
export function optimalLabelCutoffs(groupProbabilities: number[]): number[] {
  const n = groupProbabilities.length;
  const k = LUCK_LABELS.length;
  if (n < k) throw new Error(`Need at least ${k} distinct results so every label occurs`);
  const prefix = [0];
  for (const p of groupProbabilities) prefix.push(prefix[prefix.length - 1] + p);
  const cost = (from: number, to: number) => (prefix[to] - prefix[from] - 1 / k) ** 2;
  // best[j][i]: minimum cost of splitting the first i groups into j labels.
  const best: number[][] = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(Infinity));
  const choice: number[][] = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(-1));
  best[0][0] = 0;
  for (let j = 1; j <= k; j++) {
    for (let i = j; i <= n - (k - j); i++) {
      for (let s = j - 1; s < i; s++) {
        const c = best[j - 1][s] + cost(s, i);
        if (c < best[j][i] - 1e-15) {
          best[j][i] = c;
          choice[j][i] = s;
        }
      }
    }
  }
  const labels = new Array<number>(n);
  let end = n;
  for (let j = k; j >= 1; j--) {
    const start = choice[j][end];
    for (let i = start; i < end; i++) labels[i] = j - 1;
    end = start;
  }
  return labels;
}

/** Label frequencies of a ranked table, Jinxed first. */
export function labelFrequencies(groups: { probability: number; label: LuckLabel }[]): Record<LuckLabel, number> {
  const freq = Object.fromEntries(LUCK_LABELS.map((l) => [l, 0])) as Record<LuckLabel, number>;
  for (const g of groups) freq[g.label] += g.probability;
  return freq;
}

/** “About 1 in N” for a probability. */
export function oneIn(probability: number): number {
  return 1 / probability;
}

/** Label for a score using explicit lower bounds (Unlucky, Fair Luck, Lucky, Charmed). */
export function labelFromThresholds(value: number, lowerBounds: [number, number, number, number]): LuckLabel {
  let index = 0;
  for (const bound of lowerBounds) if (value >= bound) index++;
  return LUCK_LABELS[index];
}

/** Finds the tie group containing an outcome. */
export function findGroup<T>(groups: RankedGroup<T>[], value: T, compare: (a: T, b: T) => number): RankedGroup<T> {
  // Groups are sorted ascending; binary search on the comparator.
  let lo = 0;
  let hi = groups.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = compare(groups[mid].outcomes[0], value);
    if (c === 0) return groups[mid];
    if (c < 0) lo = mid + 1;
    else hi = mid - 1;
  }
  throw new Error('Outcome is not part of this game\'s distribution');
}

/** The evaluated luck of one saved result. */
export interface LuckResult {
  score: number;
  label: LuckLabel;
  /** Probability of this exact (tie-group) result; “about 1 in N” = 1 / probability. */
  probability: number;
}
