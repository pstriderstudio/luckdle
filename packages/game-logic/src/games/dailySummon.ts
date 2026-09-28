/**
 * Daily Summon: a 10-pull (9 regular + 1 guaranteed 4★-or-better) from a
 * 60-character cast. Luck compares all ten stars, highest first.
 */
import { type CollectibleItem, itemsOfTier, placeholderPool } from '../items.ts';
import { type LuckResult, type RankedGroup, rankOutcomes } from '../luck.ts';
import { pickOne, pickWeighted, type Rng } from '../rng.ts';

export const STAR_TIERS = ['1★', '2★', '3★', '4★', '5★'] as const;
export type StarTier = (typeof STAR_TIERS)[number];

/** Percent odds for a regular pull, 1★ to 5★. */
export const REGULAR_ODDS = [50, 30, 14, 5, 1] as const;
/** Percent odds for the guaranteed tenth pull. */
export const GUARANTEED_ODDS = [0, 0, 0, 90, 10] as const;

export const CHARACTERS: CollectibleItem<StarTier>[] = placeholderPool('char', 'Character', [
  ['1★', 20],
  ['2★', 15],
  ['3★', 12],
  ['4★', 8],
  ['5★', 5],
]);

export interface SummonPull {
  characterId: string;
  /** Stars, 1–5. */
  stars: number;
  isNew: boolean;
  /** Already-owned (or repeated) 1★–3★ character: individual reveal skipped. */
  skipReveal: boolean;
}

export interface SummonOutcome {
  pulls: SummonPull[];
}

export function summon(rng: Rng, owned: ReadonlySet<string> = new Set()): SummonOutcome {
  const seen = new Set<string>();
  const pulls: SummonPull[] = [];
  for (let i = 0; i < 10; i++) {
    const tierIndex = pickWeighted(rng, i < 9 ? REGULAR_ODDS : GUARANTEED_ODDS);
    const character = pickOne(rng, itemsOfTier(CHARACTERS, STAR_TIERS[tierIndex]));
    const alreadyHad = owned.has(character.id) || seen.has(character.id);
    pulls.push({
      characterId: character.id,
      stars: tierIndex + 1,
      isNew: !alreadyHad,
      skipReveal: alreadyHad && tierIndex < 3,
    });
    seen.add(character.id);
  }
  return { pulls };
}

/** Stars sorted highest first. */
export function starProfile(stars: readonly number[]): number[] {
  return [...stars].sort((a, b) => b - a);
}

export function compareSummons(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

const FACTORIAL = [1];
for (let i = 1; i <= 10; i++) FACTORIAL.push(FACTORIAL[i - 1] * i);

/** Probability that nine regular pulls produce these tier counts (index 0 = 1★). */
function regularProbability(counts: number[]): number {
  let p = FACTORIAL[9];
  for (let t = 0; t < 5; t++) {
    p *= (REGULAR_ODDS[t] / 100) ** counts[t] / FACTORIAL[counts[t]];
  }
  return p;
}

let table: RankedGroup<number[]>[] | undefined;

/** Exact table of the 935 distinct summons. */
export function summonTable(): RankedGroup<number[]>[] {
  if (table) return table;
  const outcomes: { value: number[]; probability: number }[] = [];
  const counts = [0, 0, 0, 0, 0];
  const visit = (tier: number, remaining: number) => {
    if (tier === 4) {
      counts[4] = remaining;
      let probability = 0;
      for (let g = 3; g < 5; g++) {
        if (counts[g] === 0 || GUARANTEED_ODDS[g] === 0) continue;
        counts[g]--;
        probability += (GUARANTEED_ODDS[g] / 100) * regularProbability(counts);
        counts[g]++;
      }
      if (probability > 0) {
        const stars: number[] = [];
        for (let t = 4; t >= 0; t--) for (let k = 0; k < counts[t]; k++) stars.push(t + 1);
        outcomes.push({ value: stars, probability });
      }
      return;
    }
    for (let c = 0; c <= remaining; c++) {
      counts[tier] = c;
      visit(tier + 1, remaining - c);
    }
  };
  visit(0, 10);
  table = rankOutcomes(outcomes, compareSummons);
  return table;
}

export function evaluateSummon(outcome: SummonOutcome): LuckResult {
  const profile = starProfile(outcome.pulls.map((p) => p.stars));
  const group = summonTable().find((g) => compareSummons(g.outcomes[0], profile) === 0);
  if (!group) throw new Error('Invalid summon');
  return { score: group.score, label: group.label, probability: group.probability };
}
