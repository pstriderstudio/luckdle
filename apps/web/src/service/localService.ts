/**
 * Playtest game service: outcomes are generated in this browser with the
 * shared game logic and kept in localStorage. Not cheat-proof — it exists so
 * the site can be played and judged before the Supabase service is wired up.
 * Playtest controls let one browser move to the next game day or reset.
 */
import {
  cardPack,
  coinStreak,
  carryOver,
  dailyLabel,
  dailyScore,
  dailySummon,
  dice,
  fallingStar,
  type GameId,
  gameDayOf,
  isGameId,
  GAMES_PER_DAY,
  gardenOfChance,
  gemBreaker,
  luckyFishing,
  luckyNumber,
  newCardPriorityActive,
  nextReset,
  percentile,
  type PersonalBoard,
  addPick,
  clearBoard,
  moveSlot,
  removePick,
  swapPick,
  type Rng,
  secureRng,
  seededRng,
  shareCard,
  shiftGameDay,
  simulatedField,
  streakLength,
  threeChests,
  wishingWell,
} from '@luckdle/game-logic';
import type {
  CollectionEntry,
  DailyReport,
  GameAction,
  GameService,
  GameSession,
  GameView,
  ItemType,
  Progress,
  ResultSummary,
  Snapshot,
  StartInput,
} from './types.ts';
import { itemName } from '../items.ts';

const STORAGE_KEY = 'luckdle.playtest.v1';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Outcome = any;

interface StoredResult {
  outcome: Outcome;
  progress: Progress;
  completed: boolean;
  createdAt: string;
}

interface StoredDay {
  board: PersonalBoard;
  results: Partial<Record<GameId, StoredResult>>;
}

interface Stored {
  version: 1;
  dayOffset: number;
  days: Record<string, StoredDay>;
  viewed: string[];
}

interface OwnedItem {
  type: ItemType;
  itemId: string;
  tier: string;
  details?: Record<string, unknown>;
}

const empty = (): Stored => ({ version: 1, dayOffset: 0, days: {}, viewed: [] });

// ---------------------------------------------------------------------------
// Per-game rules: generate, public view, resolution, evaluation, items.

interface GenerateContext {
  rng: Rng;
  owned: (type: ItemType) => Set<string>;
  newCardPriority: boolean;
  input?: StartInput;
}

function generate(game: GameId, ctx: GenerateContext): Outcome {
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

function toView(game: GameId, o: Outcome): GameView {
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
      return {
        game,
        digits: luckyNumber.digitCount(state.secret),
        guesses: state.guesses.map((g) => ({
          guess: g,
          feedback: g === state.secret ? 'correct' : state.secret > g ? 'higher' : 'lower',
        })),
        revealed: luckyNumber.revealedDigits(state.secret, state.guesses),
        solved: state.guesses.includes(state.secret),
      };
    }
    case 'garden-of-chance':
      return { game, bloom: o };
  }
}

function isResolved(game: GameId, o: Outcome): boolean {
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

function evaluate(game: GameId, o: Outcome): ResultSummary {
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
        ...luckyNumber.evaluateLuckyNumber(n),
        headline: `Solved in ${plural(n, 'guess', 'guesses')} — the average is ${luckyNumber.REFERENCE_MEAN.toFixed(1)}`,
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

function itemsOf(game: GameId, o: Outcome): OwnedItem[] {
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

function mutationRarity(mutations: readonly string[]): number {
  return gardenOfChance.MUTATIONS.reduce((p, m, i) => {
    const q = gardenOfChance.MUTATION_ODDS[i] / 100;
    return p * (mutations.includes(m) ? q : 1 - q);
  }, 1);
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Removes boards and results for games no longer in the catalog (e.g. Cosmic Alignment). */
function dropRetiredGames(stored: Stored): Stored {
  for (const day of Object.values(stored.days)) {
    day.board = day.board.filter((slot) => isGameId(slot.game));
    for (const game of Object.keys(day.results)) {
      if (!isGameId(game)) delete (day.results as Record<string, unknown>)[game];
    }
  }
  return stored;
}

// ---------------------------------------------------------------------------

export class LocalGameService implements GameService {
  private state: Stored;
  private fieldCache = new Map<string, number[]>();
  private rng = secureRng();

  constructor(private readonly clock: () => Date = () => new Date()) {
    this.state = this.load();
  }

  private load(): Stored {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Stored;
        if (parsed.version === 1) return dropRetiredGames(parsed);
      }
    } catch {
      // Unreadable storage: start fresh.
    }
    return empty();
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Storage unavailable; state lasts for this visit only.
    }
  }

  private today(): string {
    return shiftGameDay(gameDayOf(this.clock()), this.state.dayOffset);
  }

  /** Today's record, carrying yesterday's (most recent) board over when first seen. */
  private day(): StoredDay {
    const today = this.today();
    let day = this.state.days[today];
    if (!day) {
      const previous = Object.keys(this.state.days)
        .filter((d) => d < today)
        .sort()
        .pop();
      day = { board: previous ? carryOver(this.state.days[previous].board) : [], results: {} };
      this.state.days[today] = day;
      this.save();
    }
    return day;
  }

  private ownedItems(): Map<string, OwnedItem & { firstGameDay: string; all: OwnedItem[] }> {
    const owned = new Map<string, OwnedItem & { firstGameDay: string; all: OwnedItem[] }>();
    for (const gameDay of Object.keys(this.state.days).sort()) {
      const results = this.state.days[gameDay].results;
      for (const [game, result] of Object.entries(results) as [GameId, StoredResult][]) {
        for (const item of itemsOf(game, result.outcome)) {
          const key = `${item.type}:${item.itemId}`;
          const existing = owned.get(key);
          if (existing) existing.all.push(item);
          else owned.set(key, { ...item, firstGameDay: gameDay, all: [item] });
        }
      }
    }
    return owned;
  }

  private playedDays(): string[] {
    return Object.entries(this.state.days)
      .filter(([, d]) => Object.values(d.results).some((r) => r?.completed))
      .map(([gameDay]) => gameDay);
  }

  private session(game: GameId): GameSession {
    const stored = this.day().results[game];
    if (!stored) throw new Error('This game has not been started today');
    return {
      gameId: game,
      view: toView(game, stored.outcome),
      progress: stored.progress,
      completed: stored.completed,
      result: stored.completed ? evaluate(game, stored.outcome) : null,
    } as GameSession;
  }

  private report(day: StoredDay, gameDay: string): DailyReport | null {
    if (day.board.length !== GAMES_PER_DAY) return null;
    const rows = day.board.map((slot) => {
      const r = day.results[slot.game];
      if (!r?.completed) return null;
      const summary = evaluate(slot.game, r.outcome);
      return { gameId: slot.game, score: summary.score, label: summary.label };
    });
    if (rows.some((r) => r === null)) return null;
    const complete = rows as NonNullable<(typeof rows)[number]>[];
    const score = dailyScore(complete.map((r) => r.score));
    let field = this.fieldCache.get(gameDay);
    if (!field) {
      field = simulatedField(seededRng(hashString(gameDay)), 1000);
      this.fieldCache.set(gameDay, field);
    }
    const pct = percentile(score, field);
    const label = dailyLabel(pct);
    return {
      gameDay,
      dailyScore: score,
      percentile: pct,
      label,
      simulatedField: true,
      final: false,
      rows: complete,
      shareText: shareCard({ gameDay, dailyScore: score, dailyLabel: label, gameLabels: complete.map((r) => r.label) }),
    };
  }

  async snapshot(): Promise<Snapshot> {
    const gameDay = this.today();
    const day = this.day();
    const played = this.playedDays();
    const streakEnd = played.includes(gameDay) ? gameDay : shiftGameDay(gameDay, -1);
    const viewed = new Set(this.state.viewed);
    const collection: CollectionEntry[] = [...this.ownedItems().values()].map((item) => {
      const entry: CollectionEntry = {
        type: item.type,
        itemId: item.itemId,
        tier: item.tier,
        firstGameDay: item.firstGameDay,
        isNew: !viewed.has(`${item.type}:${item.itemId}`),
      };
      const details = item.all.map((i) => i.details).filter(Boolean) as Record<string, any>[];
      if (details.length > 0) {
        if (item.type === 'fish') {
          entry.best = {
            length: Math.max(...details.map((d) => d.length)),
            trait: Math.max(...details.map((d) => d.trait)),
          };
        } else if (item.type === 'gem') {
          const largest = [...details].sort((a, b) => b.size - a.size || b.carats - a.carats)[0];
          entry.best = { size: largest.size, carats: largest.carats, purity: Math.max(...details.map((d) => d.purity)) };
        } else if (item.type === 'plant') {
          const rarest = [...details].sort((a, b) => mutationRarity(a.mutations) - mutationRarity(b.mutations))[0];
          entry.best = { mutations: rarest.mutations };
        }
      }
      return entry;
    });
    const sessions: Snapshot['sessions'] = {};
    for (const game of Object.keys(day.results) as GameId[]) sessions[game] = this.session(game);
    return {
      gameDay,
      nextReset: nextReset(this.clock()).toISOString(),
      board: day.board.map((s) => ({ ...s, played: Boolean(day.results[s.game]) })),
      sessions,
      streak: streakLength(played, streakEnd),
      newCardPriority: newCardPriorityActive(
        played.filter((d) => d < gameDay),
        gameDay,
      ),
      collection,
      report: this.report(day, gameDay),
      playtest: { dayOffset: this.state.dayOffset },
    };
  }

  private updateBoard(fn: (b: PersonalBoard) => PersonalBoard) {
    const day = this.day();
    const withPlayed = day.board.map((s) => ({ ...s, played: Boolean(day.results[s.game]) }));
    day.board = fn(withPlayed);
    this.save();
  }

  async addPick(game: GameId) {
    this.updateBoard((b) => addPick(b, game));
  }

  async removePick(game: GameId) {
    this.updateBoard((b) => removePick(b, game));
  }

  async movePick(from: number, to: number) {
    this.updateBoard((b) => moveSlot(b, from, to));
  }

  async swapPick(out: GameId, into: GameId) {
    this.updateBoard((b) => swapPick(b, out, into));
  }

  async clearBoard() {
    this.updateBoard(clearBoard);
  }

  async start(game: GameId, input?: StartInput): Promise<GameSession> {
    const day = this.day();
    if (day.results[game]) return this.session(game);
    // Playing a game adds it to the board (one of today's five picks).
    if (!day.board.some((s) => s.game === game)) this.updateBoard((b) => addPick(b, game));
    const today = this.today();
    const ownedByType = (type: ItemType) =>
      new Set([...this.ownedItems().values()].filter((i) => i.type === type).map((i) => i.itemId));
    const outcome = generate(game, {
      rng: this.rng,
      owned: ownedByType,
      newCardPriority: newCardPriorityActive(
        this.playedDays().filter((d) => d < today),
        today,
      ),
      input,
    });
    day.results[game] = { outcome, progress: {}, completed: false, createdAt: this.clock().toISOString() };
    day.board = day.board.map((s) => (s.game === game ? { ...s, played: true } : s));
    this.save();
    return this.session(game);
  }

  async act(game: GameId, action: GameAction): Promise<GameSession> {
    const stored = this.day().results[game];
    if (!stored) throw new Error('This game has not been started today');
    const o = stored.outcome;
    if (game === 'coin-streak' && action.type === 'flip') {
      if (isResolved(game, o)) throw new Error('The run has ended');
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
    this.save();
    return this.session(game);
  }

  async saveProgress(game: GameId, progress: Progress) {
    const stored = this.day().results[game];
    if (!stored) return;
    stored.progress = progress;
    this.save();
  }

  async finish(game: GameId): Promise<GameSession> {
    const stored = this.day().results[game];
    if (!stored) throw new Error('This game has not been started today');
    if (!isResolved(game, stored.outcome)) throw new Error('This game is not finished yet');
    stored.completed = true;
    this.save();
    return this.session(game);
  }

  async markViewed(items: { type: ItemType; itemId: string }[]) {
    const viewed = new Set(this.state.viewed);
    for (const i of items) viewed.add(`${i.type}:${i.itemId}`);
    this.state.viewed = [...viewed];
    this.save();
  }

  playtest = {
    nextDay: async () => {
      this.state.dayOffset += 1;
      this.save();
    },
    resetToday: async () => {
      delete this.state.days[this.today()];
      this.save();
    },
    resetAll: async () => {
      this.state = empty();
      this.fieldCache.clear();
      this.save();
    },
  };
}
