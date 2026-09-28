/**
 * Per-game server rules: generate an outcome, derive the public view
 * (never unrevealed data), apply player actions, decide when a game is
 * resolved, evaluate its luck, and list the collectibles it awards.
 */
import * as cardPack from '../games/cardPack.ts';
import * as coinStreak from '../games/coinStreak.ts';
import * as dailySummon from '../games/dailySummon.ts';
import * as dice from '../games/dice.ts';
import * as fallingStar from '../games/fallingStar.ts';
import * as gardenOfChance from '../games/gardenOfChance.ts';
import * as gemBreaker from '../games/gemBreaker.ts';
import * as luckyFishing from '../games/luckyFishing.ts';
import * as luckyNumber from '../games/luckyNumber.ts';
import * as threeChests from '../games/threeChests.ts';
import * as wishingWell from '../games/wishingWell.ts';
import type { GameId } from '../catalog.ts';
import type { Rng } from '../rng.ts';
import { itemName } from '../collections.ts';
import type { GameAction, GameView, ResultSummary, StartInput } from './api.ts';
import type { ItemType } from '../collections.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
/** A saved outcome; its shape depends on the game and may include hidden data. */
export type Outcome = any;

export interface OwnedItem {
  type: ItemType;
  itemId: string;
  tier: string;
  details?: Record<string, unknown>;
}

export interface GenerateContext {
  rng: Rng;
  owned: (type: ItemType) => Set<string>;
  newCardPriority: boolean;
  input?: StartInput;
}

export function generate(game: GameId, ctx: GenerateContext): Outcome {
  const { rng } = ctx;
  switch (game) {
    case 'dice-of-destiny':
      return dice.rollDice(rng);
    case 'mystery-card-pack':
      return cardPack.openPack(rng, { owned: ctx.owned('card'), newCardPriority: ctx.newCardPriority });
    case 'daily-summon':
      return dailySummon.summon(rng, ctx.owned('character'));
    case 'lucky-fishing':
      return luckyFishing.cast(rng);
    case 'coin-streak':
      return { run: coinStreak.generateRun(rng), flips: [] };
    case 'falling-star':
      return fallingStar.dropStar(rng);
    case 'three-chests':
      return { ...threeChests.fillChests(rng), pick: null };
    case 'wishing-well': {
      const wish = ctx.input?.wish;
      if (!wish) throw new Error('Choose a wish first');
      return wishingWell.tossCoin(rng, wish);
    }
    case 'gem-breaker':
      return gemBreaker.breakGeode(rng);
    case 'lucky-number':
      return { secret: luckyNumber.newSecret(rng), guesses: [] } satisfies luckyNumber.LuckyNumberState;
    case 'garden-of-chance':
      return gardenOfChance.plantSeed(rng);
  }
}

export function toView(game: GameId, o: Outcome): GameView {
  switch (game) {
    case 'dice-of-destiny':
      return { game, dice: o.dice, combination: dice.classifyDice(o.dice) };
    case 'mystery-card-pack':
      return { game, cards: o.cards, podium: cardPack.podium(o), newCardPriority: o.newCardPriority };
    case 'daily-summon':
      return { game, pulls: o.pulls };
    case 'lucky-fishing':
      return { game, catch: o };
    case 'coin-streak': {
      const misses = o.flips.filter((f: { hit: boolean }) => !f.hit).length;
      return { game, flips: o.flips, misses, over: misses >= coinStreak.LIVES };
    }
    case 'falling-star':
      return { game, slot: o.slot, entry: o.entry };
    case 'three-chests':
      // Contents stay hidden until the pick.
      return { game, pick: o.pick, chests: o.pick === null ? [null, null, null] : o.chests };
    case 'wishing-well':
      return { game, wish: o.wish, curioId: o.curioId, tier: o.tier };
    case 'gem-breaker':
      return { game, find: o };
    case 'lucky-number': {
      const state = o as luckyNumber.LuckyNumberState;
      const digits = luckyNumber.digitCount(state.secret);
      const guesses = state.guesses.map((g) => ({
        guess: g,
        feedback: (g === state.secret ? 'correct' : state.secret > g ? 'higher' : 'lower') as luckyNumber.GuessFeedback,
      }));
      const revealed = luckyNumber.revealedDigits(state.secret, state.guesses);
      return {
        game,
        digits,
        guesses,
        revealed,
        solved: state.guesses.includes(state.secret),
      };
    }
    case 'garden-of-chance':
      return { game, bloom: o };
  }
}

export function isResolved(game: GameId, o: Outcome): boolean {
  switch (game) {
    case 'coin-streak':
      return o.flips.length === o.run.hits.length;
    case 'three-chests':
      return o.pick !== null;
    case 'lucky-number':
      return o.guesses.includes(o.secret);
    default:
      return true;
  }
}

function plural(n: number, word: string, many = `${word}s`) {
  return `${n} ${n === 1 ? word : many}`;
}

const pickLuck = (r: { score: number; label: ResultSummary['label']; probability: number }) => ({
  score: r.score,
  label: r.label,
  probability: r.probability,
});

export function evaluate(game: GameId, o: Outcome): ResultSummary {
  switch (game) {
    case 'dice-of-destiny': {
      const r = dice.evaluateDice(o);
      return { ...r, headline: r.combination };
    }
    case 'mystery-card-pack': {
      const r = cardPack.evaluatePack(o);
      const best = r.podium.map((i) => o.cards[i].rarity).join(' · ');
      return { score: r.score, label: r.label, probability: r.probability, headline: `Podium: ${best}` };
    }
    case 'daily-summon': {
      const r = dailySummon.evaluateSummon(o);
      const top = dailySummon.starProfile(o.pulls.map((p: dailySummon.SummonPull) => p.stars)).slice(0, 3);
      return { ...r, headline: `Best pulls: ${top.map((s) => `${s}★`).join(' ')}` };
    }
    case 'lucky-fishing': {
      const r = luckyFishing.evaluateCatch(o);
      const c = o as luckyFishing.FishingOutcome;
      const headline =
        c.kind === 'junk'
          ? itemName('fish', c.itemId)
          : `${luckyFishing.TRAIT_NAMES[c.trait] === 'Plain' ? '' : `${luckyFishing.TRAIT_NAMES[c.trait]} `}${luckyFishing.SIZE_CLASSES[c.sizeClass]} ${itemName('fish', c.speciesId)}, ${c.length} cm`;
      return { ...r, headline };
    }
    case 'coin-streak': {
      const k = coinStreak.correctCalls(o.run);
      return { ...coinStreak.evaluateStreak(k), headline: plural(k, 'correct call') };
    }
    case 'falling-star': {
      const r = fallingStar.evaluateFallingStar(o);
      return { ...r, headline: r.tier };
    }
    case 'three-chests': {
      const r = threeChests.evaluateChests(o, o.pick);
      return { ...r, headline: `${threeChests.TREASURES[r.tier]} · beat ${r.beaten} of 2 chests` };
    }
    case 'wishing-well':
      return { ...wishingWell.evaluateWish(o), headline: itemName('curio', o.curioId) };
    case 'gem-breaker': {
      const r = gemBreaker.evaluateGem(o);
      const g = o as gemBreaker.GemOutcome;
      const headline =
        g.kind === 'hollow'
          ? 'A hollow, dusty geode'
          : `${gemBreaker.GEM_PURITIES[g.purity]} ${gemBreaker.GEM_SIZES[g.size]} ${itemName('gem', g.mineralId)}, ${g.carats} ct`;
      return { ...r, headline };
    }
    case 'lucky-number': {
      const n = o.guesses.length;
      return {
        // Scored when the game finished (see GameEngine.finish); older saved games fall back to the simulation.
        ...pickLuck((o.scoring as luckyNumber.LuckyNumberScoring | undefined) ?? luckyNumber.scoreLuckyNumber(n)),
        headline: `Solved in ${plural(n, 'guess', 'guesses')} — ${
          o.scoring?.source === 'players' ? 'recent players average' : 'the average is'
        } ${((o.scoring?.mean as number | undefined) ?? luckyNumber.REFERENCE_MEAN).toFixed(1)}`,
      };
    }
    case 'garden-of-chance': {
      const r = gardenOfChance.evaluateBloom(o);
      const b = o as gardenOfChance.GardenOutcome;
      const headline =
        b.kind === 'weed' ? itemName('plant', b.plantId) : [...b.mutations, itemName('plant', b.plantId)].join(' ');
      return { ...r, headline };
    }
  }
}

export function itemsOf(game: GameId, o: Outcome): OwnedItem[] {
  switch (game) {
    case 'mystery-card-pack':
      return o.cards.map((c: cardPack.PackCard) => ({ type: 'card', itemId: c.cardId, tier: c.rarity }));
    case 'daily-summon':
      return o.pulls.map((p: dailySummon.SummonPull) => ({
        type: 'character',
        itemId: p.characterId,
        tier: dailySummon.STAR_TIERS[p.stars - 1],
      }));
    case 'lucky-fishing': {
      const c = o as luckyFishing.FishingOutcome;
      return c.kind === 'junk'
        ? [{ type: 'fish', itemId: c.itemId, tier: 'Junk' }]
        : [{ type: 'fish', itemId: c.speciesId, tier: c.type, details: { length: c.length, trait: c.trait } }];
    }
    case 'wishing-well':
      return [{ type: 'curio', itemId: o.curioId, tier: o.tier }];
    case 'gem-breaker': {
      const g = o as gemBreaker.GemOutcome;
      return g.kind === 'hollow'
        ? []
        : [{ type: 'gem', itemId: g.mineralId, tier: g.tier, details: { size: g.size, carats: g.carats, purity: g.purity } }];
    }
    case 'garden-of-chance': {
      const b = o as gardenOfChance.GardenOutcome;
      return b.kind === 'weed'
        ? [{ type: 'plant', itemId: b.plantId, tier: 'Weed' }]
        : [{ type: 'plant', itemId: b.plantId, tier: b.tier, details: { mutations: b.mutations } }];
    }
    default:
      return [];
  }
}

export function mutationRarity(mutations: readonly string[]): number {
  return gardenOfChance.MUTATIONS.reduce((p, m, i) => {
    const q = gardenOfChance.MUTATION_ODDS[i] / 100;
    return p * (mutations.includes(m) ? q : 1 - q);
  }, 1);
}

/** Applies a player action to a saved outcome in place. */
export function applyAction(game: GameId, o: Outcome, action: GameAction): void {
  if (game === 'coin-streak' && action.type === 'flip') {
    if (isResolved(game, o)) throw new Error('The run has ended');
    if (action.call !== 'heads' && action.call !== 'tails') throw new Error('Call heads or tails');
    const index = o.flips.length;
    const face = coinStreak.flipFace(o.run, index, action.call);
    o.flips.push({ call: action.call, face, hit: o.run.hits[index] });
  } else if (game === 'three-chests' && action.type === 'pick') {
    if (o.pick !== null) throw new Error('A chest has already been picked');
    if (![0, 1, 2].includes(action.chest)) throw new Error('Pick chest 1, 2, or 3');
    o.pick = action.chest;
  } else if (game === 'lucky-number' && action.type === 'guess') {
    luckyNumber.checkGuess(o, action.value);
  } else {
    throw new Error('That action does not apply to this game');
  }
}
