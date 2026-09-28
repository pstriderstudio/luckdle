# Luckdle — living project to-do list

This document tracks the product ideas, agreed decisions, and implementation work as the project develops. An idea in the backlog is not a commitment to build it. Add implementation details when the related product decision is made; keep unresolved choices explicit.

## Agreed direction

- Build a daily website where visitors test their luck through games of chance.
- After completing or skipping tarot, show a game-selection board. Returning visitors go directly to the game-board experience.
- Provide several browseable boards grouped by game type. Dice, cards, and chance are example categories; finalize categories after choosing the game list.
- Free users can choose five games per day to make their own personal board. Each chosen game gets one attempt per day; unplayed picks can be swapped until played; everyone shares one global daily reset (see section 4).
- Game boards do not display results. Decide how results are presented separately; do not assume score or outcome previews on game panels.
- Provide a collection section showing the cards and gacha characters the user has pulled. Collections, boards, and daily results are stored on a server under an anonymous player created on first visit; signing in is optional and adds cross-device sync and a leaderboard name.
- Score every game on one shared 0–100 luck scale: the percentage of that game's possible results ranked below yours, plus half of those that tie with it. Equal results get equal scores; no hidden tie-breakers.
- Pair every game's luck score with one of five plain-language luck labels, worst to best: **Jinxed**, **Unlucky**, **Fair Luck**, **Lucky**, **Charmed**. Each game sets its own cut-offs over its ranked results so that every label occurs, choosing the cut points that bring the label frequencies as close to 20% each as the game's outcomes allow. Equal results always share a label, so a label covers a different score range in each game. The tarot outlook uses the same five words.
- Give dice outcomes both a plain-language luck label and a numerical luck score. After users finish their games for the day, compare their daily luck with other users. The scoring scale, aggregation, and comparison presentation remain to be designed.
- Greet first-time visitors on the home page with a tarot fortune before they enter the other games.
- Tarot is a skippable, one-time introduction for first-time visitors. It cannot be revisited or requested again after completion or skipping.
- Start with fully authored reading content, assembled from authored interpretations and connecting passages. AI-composed readings are outside the initial scope.
- Use five outlook levels, shared with the games: **Jinxed**, **Unlucky**, **Fair Luck**, **Lucky**, and **Charmed**. Tarot shares only the words; it stays separate from game odds, rewards, scores, and reports.
- Keep tarot separate from the games: it does not change game odds, rewards, or scores, and does not appear in daily game reports.
- Present a broader welcome to the site through text only, with no narration. Visitors proceed at their own pace; no target duration or timed progression.
- Make tarot feel like a real reading, with more substance than a straightforward card pick.
- Develop a three-card spread: **the atmosphere**, **the obstacle**, and **the guidance**.
- Use the ritual: welcome → three mouse/touch up-and-down shuffles (no cut) → select and reveal atmosphere → select and reveal obstacle → select and reveal guidance → combined reading → five-level outlook → games.
- Let players select their cards from a face-down grid containing all 78 cards, with one continuous scrollable grid on mobile; no smaller subset or pagination.
- Connect authored interpretations using theme tags and authored relationship passages. Determine the outlook using position-aware weighted values, with atmosphere and obstacle contributing more than guidance; let outcome frequencies emerge from the deck and rules.
- Remember completion or skipping in the browser without requiring an account. Resume the same unfinished reading after an interruption; completing or skipping dismisses the introduction permanently in that browser's stored state.
- Use the full 78-card tarot deck, with upright and reversed orientations, using Rider–Waite–Smith-based meanings and Labyrinthos as the interpretation reference. Author original copy from these meanings.
- Use placeholder artwork while developing the games; defer art direction until the games are finished.
- Develop the experience one piece at a time, starting with tarot.
- Keep this list up to date as decisions are made, and clarify uncertain ideas before treating them as requirements.

## 1. Tarot introduction

### Product decisions

- [x] Decide the spread: three cards representing **the atmosphere**, **the obstacle**, and **the guidance**.
- [x] Decide the ritual and interactions: welcome → three mouse/touch up-and-down shuffles, without a cut → select and reveal each card individually → combined reading → five-level outlook → games.
- [x] Decide card selection: players select cards from a face-down grid.
- [x] Choose the deck scope: full 78-card tarot deck.
- [x] Include reversed cards using established upright and reversed interpretations.
- [x] Select a consistent interpretation reference/tradition: Rider–Waite–Smith-based meanings using Labyrinthos; reversals are contextual, not automatically negative.
- [x] Include all 78 cards in the selection grid.
- [x] Use one continuous scrollable grid on mobile, with readable, tappable cards.
- [x] Connect card meanings through theme tags and authored relationship passages responding to all three spread positions.
- [x] Define the five outlook labels: Jinxed, Unlucky, Fair Luck, Lucky, Charmed, shared with the games. This replaces the earlier Bad luck / Minor bad luck / Neutral / Minor good luck / Good luck wording.
- [x] Determine the outlook using values specific to card, orientation, and position, weighted toward atmosphere and obstacle with a smaller contribution from guidance. Exact values, weights, and thresholds remain implementation work. This mapping is an original product rule, not a standard tarot score.
- [x] Let the deck and interpretation rules determine outlook frequency; inspect the resulting distribution without targeting fixed percentages.
- [x] Keep the fortune separate from games, with no effect on their odds, rewards, or scores.
- [x] Use text only, without spoken narration.
- [x] Let visitors progress at their own pace, with no target duration or timed progression.
- [x] Make tarot a one-time introduction for first-time visitors, with a skip option and no revisit or new-reading option.
- [x] Frame the reading as a broader welcome to the site, rather than a daily prediction.
- [x] Select and reveal one card with its interpretation before choosing the next; show the combined reading after all three.
- [x] Recognize first-time visitors using browser storage, without requiring an account. A new browser or cleared storage appears as a first visit.
- [x] Save temporary progress and resume the same unfinished reading after closing or refreshing. Mark the introduction complete when the visitor leaves the final reading for the games, or skipped when they explicitly skip.

### Implementation work to define after those decisions

- [ ] Document the approved reading flow and screen states.
- [ ] Implement three up-and-down deck shuffles using mouse/touch drag gestures, with visible progress from 0/3 to 3/3 and no cut step. Define gesture travel thresholds and count complete cycles without counting tiny movements or duplicate pointer events. Provide an equivalent keyboard-accessible control.
- [ ] Define card data: identifier, name, artwork, meanings, and any supported orientations or position-specific interpretations.
- [x] Choose a reading-generation approach: fully authored interpretations and connecting passages, assembled by rules.
- [ ] Author and review the 468 base card/orientation/position interpretations (78 × 2 × 3), using the chosen interpretation reference.
- [ ] Define relationship rules and author connecting passages so guidance responds to the atmosphere and obstacle.
- [ ] Review representative spreads, including mixed themes, reversed cards, and challenging guidance cards, for coherent meaning and natural prose.
- [ ] Specify card selection, randomization, duplicate prevention, and the relationship between player gestures and the final draw.
- [ ] Author card/orientation/position values, choose numerical weights and five-level thresholds so every label is reachable, and inspect the resulting outlook distribution. Use the same interpretations for scoring and prose; do not force preset outcome frequencies.
- [ ] Implement browser persistence for shuffle progress, deck order/orientations, selections, revealed cards, reading progress, and completed/skipped status so an interruption cannot redraw the spread. Completion or skipping routes future visits directly to the games; no history/replay route or daily reset. Discard temporary reading data after completion or skipping while retaining the dismissal status.
- [ ] Keep authored content separate from reading assembly so the library and composition approach can be expanded later.
- [ ] Design the welcome, deck interactions, card reveals, combined reading, and transition into games.
- [ ] Support mobile, keyboard use, readable card meanings, and reduced-motion preferences.
- [ ] Implement and verify the agreed flow, including interrupted readings and repeat visits.

### Coherent reading approach

Fully authored content, theme-based connections, sequential reveals, and position-aware weighted outlook scoring are approved. Specific wording, theme rules, numerical values, and optional presentation details remain to be developed.

- Interpret each card through its orientation and spread position, then identify the relationship between all three: the atmosphere establishes the situation, the obstacle complicates it, and the guidance responds to that specific complication.
- Show a brief interpretation as each card is revealed, followed by one connected reading and a short thematic title.
- Preserve contradictions as meaningful tension: optimism can coexist with disrupted plans. Do not flatten the spread into three independent dictionary entries or a simple positive/negative average.
- Selected approach: authored position-specific interpretations plus relationship rules and connecting text. There are 468 base card/orientation/position entries (78 × 2 × 3), before relationship text. Prioritize a coherent first reading; extensive repeat-visit wording variants are not an initial requirement.
- Future possibility only: expand the authored library or composition approach. Recurring readings and replay are outside the current product scope.
- Proposed reading structure: short theme → atmosphere and obstacle connected in one thought → guidance addressing that tension → closing outlook consistent with the reading.
- Proposed content rules: keep obstacle position distinct from reversed orientation; use upright/reversed meanings as authored; avoid inventing specific personal events; let a challenging guidance card describe something to acknowledge or navigate.
- Use position-aware weighted outlook scoring, with atmosphere and obstacle contributing more than guidance. Guidance describes a response and should not automatically erase a difficult atmosphere or obstacle. Numerical weights and thresholds remain to be defined.
- Selected interpretation reference: [Labyrinthos card meanings](https://labyrinthos.co/blogs/tarot-card-meanings-list) and [Labyrinthos on reversals](https://labyrinthos.co/blogs/learn-tarot-with-labyrinthos-academy/how-to-interpret-reversed-tarot-cards), using Rider–Waite–Smith-based meanings and original authored prose.

### Resolved tarot choices

| Choice | Agreed behavior |
| --- | --- |
| Reading assembly | Theme tags and authored relationship passages connect the three interpretations. |
| Five-level outlook | Position-aware weighted values; atmosphere and obstacle contribute more than guidance. |
| Outlook frequency | Emerges from the deck and interpretation rules; inspect without prescribing percentages. |
| Reveal sequence | Select and reveal each card before choosing the next. |
| Shuffle interaction | Move the deck up and down with mouse/finger for three shuffles; no cuts. |
| All 78 cards on mobile | One continuous scrollable grid with comfortable tap targets. |
| Recognizing first-time visitors | Browser-stored completion/skip status, with no account requirement. |
| Interrupted introduction | Resume the same unfinished reading; completion occurs on leaving the final reading or explicitly skipping. |

### Remaining implementation proposals

- Proposed randomization default: uniformly shuffle all 78 unique cards, assign each an independent 50/50 upright/reversed orientation, then keep identities and orientations fixed through selection. Each selected card fills the next spread position; no duplicates. The reversal rate is an implementation proposal, not a claim about tarot convention.
- Proposed presentation default: original, welcoming, reflective text; a brief explanation per card and one final connected paragraph with the outlook. No audio or automatic advancement.

## 2. Game ideas backlog

The table tracks game candidates and their evolving rules. Approved details are recorded in each game's section. There is no separate launch set: games are designed one at a time.

Designed so far: Dice of Destiny, Mystery Card Pack, Daily Summon, Lucky Fishing, Coin Streak, Falling Star, Three Chests, The Wishing Well, and Gem Breaker. The remaining candidates are undesigned ideas.

| Candidate | Proposed player experience | Details to resolve before implementation |
| --- | --- | --- |
| Dice of Destiny | One tap rolls all five dice once, with no rerolls. | Agreed; see the Dice of Destiny section. |
| Mystery Card Pack | Open a larger trading-card-style booster with multiple rarities, an opening animation, and a rare card pulled upward and revealed. | Pack size, slot structure, scoring, rarity distribution, guarantees, variants, duplicates, and collection storage. |
| Daily Summon | A gacha-style 10-pull of characters from an original fantasy cast. | Agreed; see the Daily Summon section. Character writing and art remain. |
| Coin Streak | Call heads or tails before each flip and keep flipping until the second wrong call. | Agreed; see the Coin Streak section. |
| Falling Star | Make a wish: a star falls from the sky, bounces through pegs, and lands in a funnel of slots where the narrow centre is rarest. | Agreed; see the Falling Star section. |
| Three Chests | Pick one of three chests, then see what the other two held. | Agreed; see the Three Chests section. |
| Lucky Fishing | Make one cast and reveal a catch with a species, size, and unusual trait. | Agreed; see the Lucky Fishing section. Species writing and art remain. |
| The Wishing Well | Make a wish, toss a coin, and receive a whimsical object themed to your wish. | Agreed; see the Wishing Well section. Object writing remains. |
| Gem Breaker | Strike a geode three times to reveal a mineral with size and purity. | Agreed; see the Gem Breaker section. Mineral writing remains. |
| Cosmic Alignment | Reveal the alignment of three spinning celestial rings. | Random-stop interaction, alignment measurement, outcome tiers, and animation. |
| Lucky Number | Generate a number and discover rare patterns such as repeated digits or palindromes. | Number range, pattern definitions, overlapping patterns, and rarity calculation. |
| Garden of Chance | Plant a mystery seed and reveal a bloom with possible mutations. | Plant pool, mutation odds, reveal timing, garden persistence, and garden capacity. |

- [ ] Define each selected game's rules and outcome probabilities before implementing it.
- [ ] Make ordinary and unlucky outcomes entertaining through artwork, names, and copy.

### Dice of Destiny — agreed design

Five fair six-sided dice, one tap to roll them all, no rerolls, and combination-based luck. Rarer recognized combinations are luckier; no combination is lowest. The design is complete; implementation remains.

- [x] Choose the core format: a single roll of five dice, triggered together by one tap, with no keep/reroll or push-your-luck stage.
- [x] Choose dice count: five.
- [x] Die faces: five standard, fair six-sided dice.
- [x] Judge luck by combinations, with rarer recognized combinations ranked higher. No combination is lowest luck, and minimal combinations are low luck. Do not rank by the sum of dice.
- [x] Recognized combinations and ranking, highest to lowest: five of a kind → four of a kind → five-dice straight → full house → three of a kind → two pairs → one pair → no combination.
- [x] Require all five dice for a straight: 1–2–3–4–5 or 2–3–4–5–6, in any roll order. Four-dice straights do not count.
- [x] Keep results off the board. Where and how results are shown remains a separate decision.
- [x] Result display (result screen only, never the board): the dice tumble and settle after the tap (quick fades in reduced-motion mode), then show the five dice, the combination name with how often it occurs (e.g. “Full house — about 1 in 26 rolls”), then the luck label and score.
- [x] Decide interaction: one click/tap rolls all five dice once.
- [x] Decide attempts: one official roll per day when this game is one of the user's five daily selections, with the result saved and no reroll.
- [x] Give the dice result both a plain-language luck label and a numerical luck score, anchored by the actual combination to make the outcome understandable.
- [x] Use the shared 0–100 luck score (see Agreed direction). Scores follow the approved luck ranking, so No combination stays lowest.
- [x] Use the shared luck labels with dice cut-offs : No combination → Jinxed; One pair → Unlucky; Two pairs → Fair Luck; Three of a kind → Lucky; Full house → Charmed; Five-dice straight → Charmed; Four of a kind → Charmed; Five of a kind → Charmed. Frequencies: Jinxed 6.17% / Unlucky 46.30% / Fair Luck 23.15% / Lucky 15.43% / Charmed 8.95%.
- [x] No rewards: dice is a pure luck test. Collectibles come only from the card pack, Daily Summon, Lucky Fishing, The Wishing Well, and Gem Breaker.
- [ ] Implement roll generation, persistence, and board completion state; verify category probabilities by enumeration in tests.

#### Combination probabilities

Enumerated all 7,776 ordered rolls of five independent fair six-sided dice. These results assume only five-dice straights, with exact mutually exclusive categories: a full house does not count as three of a kind, and stronger repeated-value categories do not also count as a pair.

| Luck rank (highest first) | Category | Outcomes | Probability |
| --- | --- | --- | --- |
| 1 | Five of a kind | 6 | 0.0772% |
| 2 | Four of a kind | 150 | 1.9290% |
| 3 | Five-dice straight | 240 | 3.0864% |
| 4 | Full house | 300 | 3.8580% |
| 5 | Three of a kind | 1,200 | 15.4321% |
| 6 | Two pairs | 1,800 | 23.1481% |
| 7 | One pair | 3,600 | 46.2963% |
| 8 | No combination | 480 | 6.1728% |

No combination is deliberately lowest luck even though that category is less common than a pair. Rarity ranks recognized successful combinations, not every possible result category. This preserves the user's intended low luck for no/minimal combinations. Five-dice-only straights are approved; four-dice straights are excluded.

“About 1 in” for display: five of a kind 1,296 · four of a kind 52 · straight 32 · full house 26 · three of a kind 6.5 · two pairs 4.3 · one pair 2.2 · no combination 16.

Luck scores under the shared 0–100 method: No combination 3.1 · One pair 29.3 · Two pairs 64.0 · Three of a kind 83.3 · Full house 93.0 · Five-dice straight 96.5 · Four of a kind 99.0 · Five of a kind 99.96.

### Mystery Card Pack — next game for discussion

Agreed direction: a 12-card pack inspired by Yu-Gi-Oh!/Magic-style boosters with multiple rarities, a pack-opening animation, and a rare card pulled upward and revealed. Each pack contains 6 Common slots, 3 Uncommon slots, 2 wildcard slots of any rarity, and 1 guaranteed Rare-or-better slot, with approved independent slot odds below. A podium spotlights the three rarest cards from the current pack and those three determine its luck result. Pack ordering, the luck score, and labels are agreed (below). Artwork is still deferred.

- [x] Replace the five-card proposal with a 12-card trading-card-style booster.
- [x] Include multiple rarity tiers, a pack-opening animation, and a rare-card pull-up/reveal animation.
- [x] Choose the pack size: 12 cards.
- [x] Guarantee one Rare-or-better card in every pack. Additional Rare-or-better cards are possible through chance, not guaranteed; the other podium places may be lower rarity.
- [x] Define pack slots: 6 Common + 3 Uncommon + 2 wildcards that can yield any rarity + 1 guaranteed Rare-or-better. This is Luckdle's agreed format, not the distribution of a specific real-world product.
- [x] Show a podium of the three rarest cards pulled from the current pack and base the pack's luck result on those three. This is a result presentation outside the game-selection boards.
- [x] Define how the top three combine into the numerical luck score: rank by rarity only, so duplicate copies count like any other card of that rarity, packs with the same podium are separated by the rest of the pack (see the ordering below), and when fewer than three cards are Rare-or-better the fixed Uncommons fill the podium. Commons can never reach the podium.
- [x] Skip duplicate cards below Rare in the reveal experience, so as the collection fills the reveal increasingly focuses on Rare-or-better pulls. Rare-or-better duplicates are not skipped by this rule.
- [x] Count already-owned cards below Rare among the 12, keep the actual pack contents, and skip only their individual reveal. Do not replace or reroll them; ownership affects presentation, not pack contents or odds.
- [x] Finalize the rarity ladder: Common → Uncommon → Rare → Super Rare → Ultra Rare → Secret Rare.
- [x] Set separate probability distributions for each wildcard slot and the guaranteed Rare-or-better slot as listed below. Fixed Common and Uncommon slots retain their specified rarity.
- [x] Roll the two wildcard slots and guaranteed slot independently using the approved Luckdle odds below.

| Rarity | Each wildcard slot — agreed | Guaranteed slot — agreed |
| --- | --- | --- |
| Common | 65% | 0% |
| Uncommon | 25% | 0% |
| Rare | 7% | 75% |
| Super Rare | 2% | 20% |
| Ultra Rare | 0.9% | 4.5% |
| Secret Rare | 0.1% | 0.5% |

Under the approved odds, each wildcard has a 10% chance of Rare-or-better, so a pack contains exactly one/two/three Rare-or-better cards with probabilities 81%/18%/1%. At least one Secret Rare appears in 1 − (0.999² × 0.995) = 0.6989005% of packs (about 1 in 143). These are long-run probabilities, not guaranteed pull intervals.

- [x] Choose pack scoring priority: compare the highest rarity first, then the second-highest, then the third-highest (the podium). Packs with the same podium are then compared on the rest of the pack in the same way, highest rarity first. Only the guaranteed slot and two wildcards vary, so in practice a wildcard Uncommon beats a wildcard Common. Packs tie only when all 12 rarities match. Additive rarity points were rejected.
- [x] Derive the numerical luck score from the complete distribution of pack outcomes under the approved slot odds (table below). No hidden tie-breakers beyond the ordering above.
- [x] Use the shared luck labels with pack cut-offs as listed in the table. Frequencies: Jinxed 31.69% / Unlucky 24.38% / Fair Luck 14.51% / Lucky 14.95% / Charmed 14.48%.

#### How often each luck label occurs

Cut-offs are set per game so every label occurs, as close to 20% each as the game's outcomes allow. A few results cover large shares of outcomes, so frequencies are uneven.

| Game | Jinxed | Unlucky | Fair Luck | Lucky | Charmed |
| --- | --- | --- | --- | --- | --- |
| Dice of Destiny | 6.17% | 46.30% | 23.15% | 15.43% | 8.95% |
| Mystery Card Pack | 31.69% | 24.38% | 14.51% | 14.95% | 14.48% |

#### Pack outcomes, luck scores and labels

Exact distribution of all 52 distinct pack outcomes under the approved slot odds, best first. The fixed 6 Common and 3 Uncommon slots are the same in every pack, so an outcome is the sorted rarities of the guaranteed slot and two wildcards. Score = the shared 0–100 luck score. Abbreviations: C Common, U Uncommon, R Rare, SR Super Rare, UR Ultra Rare, ScR Secret Rare.

| Guaranteed slot + wildcards | Podium | Probability | About 1 in | Score | Label |
| --- | --- | --- | --- | --- | --- |
| ScR / ScR / ScR | ScR / ScR / ScR | 0.0000005% | 200,000,000 | 100.00 | Charmed |
| ScR / ScR / UR | ScR / ScR / UR | 0.0000135% | 7,407,407 | 100.00 | Charmed |
| ScR / ScR / SR | ScR / ScR / SR | 0.00004% | 2,500,000 | 100.00 | Charmed |
| ScR / ScR / R | ScR / ScR / R | 0.000145% | 689,655 | 100.00 | Charmed |
| ScR / ScR / U | ScR / ScR / U | 0.00025% | 400,000 | 100.00 | Charmed |
| ScR / ScR / C | ScR / ScR / U | 0.00065% | 153,846 | 100.00 | Charmed |
| ScR / UR / UR | ScR / UR / UR | 0.0001215% | 823,045 | 100.00 | Charmed |
| ScR / UR / SR | ScR / UR / SR | 0.00072% | 138,889 | 100.00 | Charmed |
| ScR / UR / R | ScR / UR / R | 0.00261% | 38,314 | 100.00 | Charmed |
| ScR / UR / U | ScR / UR / U | 0.0045% | 22,222 | 99.99 | Charmed |
| ScR / UR / C | ScR / UR / U | 0.0117% | 8,547 | 99.99 | Charmed |
| ScR / SR / SR | ScR / SR / SR | 0.001% | 100,000 | 99.98 | Charmed |
| ScR / SR / R | ScR / SR / R | 0.0072% | 13,889 | 99.97 | Charmed |
| ScR / SR / U | ScR / SR / U | 0.015% | 6,667 | 99.96 | Charmed |
| ScR / SR / C | ScR / SR / U | 0.039% | 2,564 | 99.94 | Charmed |
| ScR / R / R | ScR / R / R | 0.01295% | 7,722 | 99.91 | Charmed |
| ScR / R / U | ScR / R / U | 0.055% | 1,818 | 99.88 | Charmed |
| ScR / R / C | ScR / R / U | 0.143% | 699 | 99.78 | Charmed |
| ScR / U / U | ScR / U / U | 0.03125% | 3,200 | 99.69 | Charmed |
| ScR / U / C | ScR / U / U | 0.1625% | 615 | 99.59 | Charmed |
| ScR / C / C | ScR / U / U | 0.21125% | 473 | 99.41 | Charmed |
| UR / UR / UR | UR / UR / UR | 0.0003645% | 274,348 | 99.30 | Charmed |
| UR / UR / SR | UR / UR / SR | 0.00324% | 30,864 | 99.30 | Charmed |
| UR / UR / R | UR / UR / R | 0.011745% | 8,514 | 99.29 | Charmed |
| UR / UR / U | UR / UR / U | 0.02025% | 4,938 | 99.28 | Charmed |
| UR / UR / C | UR / UR / U | 0.05265% | 1,899 | 99.24 | Charmed |
| UR / SR / SR | UR / SR / SR | 0.009% | 11,111 | 99.21 | Charmed |
| UR / SR / R | UR / SR / R | 0.0648% | 1,543 | 99.17 | Charmed |
| UR / SR / U | UR / SR / U | 0.135% | 741 | 99.07 | Charmed |
| UR / SR / C | UR / SR / U | 0.351% | 285 | 98.83 | Charmed |
| UR / R / R | UR / R / R | 0.11655% | 858 | 98.59 | Charmed |
| UR / R / U | UR / R / U | 0.495% | 202 | 98.29 | Charmed |
| UR / R / C | UR / R / U | 1.287% | 78 | 97.40 | Charmed |
| UR / U / U | UR / U / U | 0.28125% | 356 | 96.61 | Charmed |
| UR / U / C | UR / U / U | 1.4625% | 68 | 95.74 | Charmed |
| UR / C / C | UR / U / U | 1.90125% | 53 | 94.06 | Charmed |
| SR / SR / SR | SR / SR / SR | 0.008% | 12,500 | 93.11 | Charmed |
| SR / SR / R | SR / SR / R | 0.086% | 1,163 | 93.06 | Charmed |
| SR / SR / U | SR / SR / U | 0.2% | 500 | 92.92 | Charmed |
| SR / SR / C | SR / SR / U | 0.52% | 192 | 92.56 | Charmed |
| SR / R / R | SR / R / R | 0.308% | 325 | 92.14 | Charmed |
| SR / R / U | SR / R / U | 1.45% | 69 | 91.26 | Charmed |
| SR / R / C | SR / R / U | 3.77% | 27 | 88.65 | Charmed |
| SR / U / U | SR / U / U | 1.25% | 80 | 86.14 | Charmed |
| SR / U / C | SR / U / U | 6.5% | 15 | 82.27 | Lucky |
| SR / C / C | SR / U / U | 8.45% | 12 | 74.79 | Lucky |
| R / R / R | R / R / R | 0.3675% | 272 | 70.38 | Fair Luck |
| R / R / U | R / R / U | 2.625% | 38 | 68.89 | Fair Luck |
| R / R / C | R / R / U | 6.825% | 15 | 64.16 | Fair Luck |
| R / U / U | R / U / U | 4.6875% | 21 | 58.41 | Fair Luck |
| R / U / C | R / U / U | 24.375% | 4 | 43.88 | Unlucky |
| R / C / C | R / U / U | 31.6875% | 3 | 15.84 | Jinxed |

The most common pack (R / C / C, 31.69%) is Jinxed with a score of 15.84. Scores near 100 are distinguished by the 1-in-N rarity rather than the rounded score.

- [x] Define the opening interaction and reveal sequence. Self-paced like tarot: nothing advances automatically, and every gesture has a click/tap and keyboard equivalent.
  1. **Before any animation:** generate and save all 12 cards, snapshot ownership, and add the cards to the collection once.
  2. **Sealed pack:** drag across the top edge to tear it open. Click, tap, or Enter also opens it.
  3. **Stack:** the cards come out as a face-down stack. Tap, click, or press Enter/Space to flip each card in pack order: 6 Commons → 3 Uncommons → 2 wildcards → the guaranteed Rare-or-better last. Wildcards are not sorted by rarity, so a wildcard can surprise mid-pack, even before the guaranteed card. First-time cards get a **New** badge. Already-owned cards below Rare are skipped and counted in a small tally (e.g. “4 already collected”).
  4. **Rare pulls:** whenever the next card is Rare-or-better, including a wildcard, it rises face-down out of the stack with a glow that grows with its rarity, then flips. Every Rare-or-better card gets its own moment. A **Reveal the rest** option speeds through the Commons and Uncommons but still stops for every rare moment.
  5. **Podium:** the three best cards move onto the podium. An already-owned Uncommon that qualifies appears with an **Owned** tag, without replaying its reveal.
  6. **Result:** show the luck label and score, then return to the board. Jinxed wording stays light and playful.
  - **Reduced motion:** the same order and steps, with quick fades instead of tearing, rising, and flipping.
- [ ] Build the reveal using placeholder cards; retain an accessible reduced-motion path. Pack contents should be fixed before reveals so animation timing does not change the outcome.
- [x] Make pulled cards persistent collectibles visible in the site's collection section alongside gacha characters.
- [x] Card list size: 150 cards — 60 Common, 40 Uncommon, 25 Rare, 15 Super Rare, 7 Ultra Rare, 3 Secret Rare. Within a rolled rarity, each card of that rarity is equally likely (unless a later rule changes this). Simulated collection pace for a player opening one pack every day (typical player / unluckiest 10%): all Commons and Uncommons ~47 / 68 packs, all Rares ~100 / 153, all Super Rares ~199 / 314, full set ~669 / 1,408. Secret Rares set the pace of completion.
- [x] Weekly streak reward: new-card priority. A streak counts consecutive game days (3 AM Eastern reset) on which the player completes at least one official game. From the 7th consecutive day until a day is missed, the rarity of each slot is still rolled with the normal odds, but the card within that rarity is chosen uniformly from cards the player does not own yet (counting cards already chosen earlier in the same pack as owned); if every card of that rarity is owned, choose from all of them. Rarity odds, luck scores, labels, and comparisons are unchanged because they depend only on rarity. Missing a day resets the streak to 0.
- [ ] Show the current streak and when new-card priority is active.
- [x] Daily Summon gets no streak reward for now; the reward applies to card packs only.
- [ ] Simulate collection pace with the streak reward. Rough estimate for a player on an unbroken streak: all Rares ~28 packs instead of ~100; full set ~13 months instead of ~22, limited by Secret Rare pulls.
- [x] Define collection storage: server-side, owned or not owned per card with no copy counts, so duplicates (including same-pack duplicates) add nothing. No special variants (foil, alternate art) at launch. Defer artwork direction until the games are finished.
- [x] Define daily attempts: one pack per day when this game is one of the user's five daily selections. The pack is saved before the reveal (see the opening sequence).

Reference examples: Konami lists [Supreme Darkness](https://www.yugioh-card.com/en/products/suda/) as a nine-card booster; Wizards' [Play Booster introduction](https://magic.wizards.com/en/news/making-magic/what-are-play-boosters) describes fourteen-card packs. Real products vary, so use these as structural inspiration rather than assuming one universal pack format.

### Daily Summon — agreed design

A daily gacha-style 10-pull from an original fantasy cast, separate in feel from the card pack: one dramatic multi-character summon rather than a stack of cards.

- [x] Format: one 10-pull per day when this game is one of the user's five daily selections. Pulls 1–9 are regular; pull 10 is guaranteed 4★ or better.
- [x] Star tiers: 1★ to 5★ (a separate ladder from card rarities).
- [x] Odds (classic): each regular pull 1★ 50% / 2★ 30% / 3★ 14% / 4★ 5% / 5★ 1%; the guaranteed pull 4★ 90% / 5★ 10%. All pulls are independent. About 17.8% of summons (roughly 1 in 6) contain at least one 5★.
- [x] No pity system and no streak reward for now; everyone has equal odds.
- [x] Roster: 60 characters — 20 at 1★, 15 at 2★, 12 at 3★, 8 at 4★, 5 at 5★ — each equally likely within its tier. Each has a name, title, and one-line bio; art deferred (placeholders/silhouettes). Simulated pace at one summon per day: full roster ~55 days typical, ~103 days for the unluckiest 10%. The 150-card set stays the long-term chase.
- [x] Collection: follows the agreed collection rules (owned or not owned, silhouettes for undiscovered characters, no variants).
- [x] Ranking and score: compare all ten stars highest first (best, then second-best, and so on); summons tie only when all ten tiers match. Uses the shared 0–100 luck score.
- [x] Labels: per-game cut-offs over the 935 possible outcomes, as close to 20% each as possible. Preliminary cut-offs (search on a 0.5% grid; implementation should confirm by exact search): Jinxed 19.1% (from 4★ + nine 1★ up to 4★ 3★ 2★ 2★ 1★…), Unlucky 18.3% (up to 4★ 3★ 3★ 2★ 2★ 1★…), Fair Luck 20.9% (up to 4★ 4★ 2★ 2★…), Lucky 20.8% (up to 4★ 4★ 4★ 3★ 2★ 2★ 1★…), Charmed 20.8% (from 4★ 4★ 4★ 3★ 2★ 2★ 2★ 1★ 1★ 1★ upward). Every summon containing a 5★ is Charmed. Most common single outcome: 4★ 3★ 2★ 2★ 2★ 1★ 1★ 1★ 1★ 1★ (5.4%).
- [x] Reveal, self-paced with click/tap/keyboard equivalents and a reduced-motion path of fades:
  1. **Before any animation:** generate and save all ten pulls, snapshot ownership, and add characters to the collection once. Resuming returns to the same point.
  2. **Portal:** trace a circle to charge the summoning portal (click, tap, or Enter also works). Its glow reflects the best tier in the batch.
  3. **Pulls in order:** reveal pulls 1–10 in pull order, so a high tier can surprise mid-batch; the guaranteed pull is last. Stars pop in one at a time. First-time characters get a **New** badge.
  4. **Duplicates:** already-owned 1★–3★ characters are skipped and tallied; every 4★ and 5★ gets its own spotlight. Within one summon, the first copy of a 1★–3★ character is revealed and later copies are skipped.
  5. **Finish:** a grid of all ten, with already-owned characters marked **Owned** (unlike packs, the grid shows skipped characters again, following gacha convention), then the luck label and score.
- [ ] Write the 60-character cast (names, titles, bios) and assign tiers.
- [ ] Confirm the label cut-offs by exact search and build the full outcome/score table in code rather than in this document.

### Lucky Fishing — agreed design

One cast per day when this game is one of the user's five daily selections. Pure luck, no skill: the catch is generated and saved before any animation.

- [x] Catch type per cast: Junk 15%, Common 45%, Uncommon 25%, Rare 11%, Legendary 3.5%, Mythic 0.5%. Pool: 37 fish (12 Common, 10 Uncommon, 8 Rare, 5 Legendary, 2 Mythic) plus 5 humorous junk items (e.g. old boot, tin can), each equally likely within its type.
- [x] Size class (fish only): Small 45%, Medium 32%, Large 17%, Huge 5%, Colossal 1%. Bigger is always rarer. Each species has its own length range; the class picks a band and a real length is shown.
- [x] Trait (fish only): Plain 88%, Marked 8% (e.g. Spotted), Strange 3% (e.g. Glowing), Wondrous 1% (e.g. Golden). Traits can appear on any fish.
- [x] Ranking: like dice, the rarer the exact catch, the luckier. Rank fish by the probability of their type × size class × trait (rarer first); equal probabilities tie. Junk is always lowest. Example: a Golden Colossal Common (about 1 in 22,000) outranks a plain small Mythic (about 1 in 505).
- [x] Score and labels: shared 0–100 luck score; per-game cut-offs: Jinxed = Junk (15.0%); Unlucky = small plain Common (17.8%); Fair Luck = medium plain Common through small plain Uncommon (22.6%); Lucky = medium plain Uncommon through large plain Uncommon (21.9%); Charmed = medium plain Rare or rarer, including any fish with a trait (22.7%). Result shows the catch, its “about 1 in N”, the label, and the score.
- [x] Cast interaction, self-paced with click/tap/keyboard equivalents and a reduced-motion path of fades: pull back and release to cast → the bobber waits briefly → “Bite!” → tap to reel in (no timing skill; the catch cannot escape) → the catch rises with a glow that grows with its type → name, length, and trait, with a **New** badge for a new species → label, score, and 1-in-N.
- [x] Collection: a Fish tab listing species caught (junk included) with silhouettes for missing ones. Unlike cards and characters, each species also shows personal bests: longest catch and rarest trait caught. Personal bests are derived from saved catches. No streak reward.
- [x] Pace: with one cast per day, a typical player completes the log in about 550 days (90%: about 1,190); the two Mythics are the long chase.
- [ ] Write the 37 species (names, length ranges, short descriptions), 5 junk items, and trait names for each trait level.

### Coin Streak — agreed design

- [x] Format: one run per day when this game is one of the user's five daily selections. The player calls heads or tails before every flip (the last call is remembered as the default) and taps to flip. The run ends on the **second** wrong call (two lives). Luck = total correct calls in the run.
- [x] Fair coin: every call has a 50% chance, so the call never changes the odds. The run length is generated and saved before the first flip (distribution below) and the flips are then shown to match or miss the player's calls accordingly, which is statistically identical to live flipping. Leaving mid-run resumes at the same flip.
- [x] Pacing: tap for each flip; never automatic. After a few flips a **Keep going** option speeds up the flips but still stops on each miss. No cap on streak length.
- [x] Probability of exactly k correct calls: (k + 1) / 2^(k+2). Shared 0–100 luck score: 100 × (1 − (k + 2) / 2^(k+1) + (k + 1) / 2^(k+3)).

| Correct calls | Probability | About 1 in | Score | Label |
| --- | --- | --- | --- | --- |
| 0 | 25% | 4 | 12.50 | Jinxed |
| 1 | 25% | 4 | 37.50 | Unlucky |
| 2 | 18.75% | 5.3 | 59.38 | Fair Luck |
| 3 | 12.5% | 8 | 75.00 | Lucky |
| 4 | 7.81% | 13 | 85.16 | Charmed |
| 5 | 4.69% | 21 | 91.41 | Charmed |
| 7 | 1.56% | 64 | 97.27 | Charmed |
| 10 | 0.27% | 372 | 99.55 | Charmed |
| 20 | 0.0005% | 199,729 | ~100 | Charmed |

- [x] Labels (per-game cut-offs): 0 Jinxed (25%), 1 Unlucky (25%), 2 Fair Luck (18.75%), 3 Lucky (12.5%), 4 or more Charmed (18.75%).
- [x] Result: the streak, its rarity (e.g. “5 correct calls — about 1 in 21 runs”), label, and score. No collectibles or rewards; reduced-motion path uses fades.
- [x] One-life sudden death was rejected because half of all runs would end on the first flip as Jinxed.

### Falling Star — agreed design

Renamed from Plinko / Falling Star. Reimagined so the centre is the prize rather than the most common landing.

- [x] Format: one star per day when this game is one of the user's five daily selections. The player taps **Make a wish**; the star streaks in from a random point along the top (no aiming), bounces through pegs, and settles into a slot.
- [x] Board: a funnel of 11 slots that narrow toward the centre. Outer to centre: Dust (2 slots), Spark (2), Glimmer (2), Shine (2), Radiant (2), Supernova (1, centre). Each slot's width is proportional to its probability, so the board honestly shows the odds.
- [x] Odds by tier (split evenly between a tier's two slots): Dust 25%, Spark 22%, Glimmer 20%, Shine 16%, Radiant 14%, Supernova 3% (about 1 in 33).
- [x] Outcome generated and saved before the drop; the bounce path is choreographed to reach that slot (not live physics), with near-misses around the narrow centre. Leaving mid-drop returns to the same result.
- [x] Score and labels (shared 0–100 score; per-game cut-offs): Dust 12.5 Jinxed (25%); Spark 36 Unlucky (22%); Glimmer 57 Fair Luck (20%); Shine 75 Lucky (16%); Radiant 90 and Supernova 98.5 Charmed (17% combined).
- [x] Result: the slot, its “about 1 in N”, label, and score. No collectibles or rewards; reduced-motion path uses fades.
- [x] A classic centre-heavy Galton board was rejected: its middle slots would make about 45% of single drops Jinxed.

### Three Chests — agreed design

- [x] Format: one pick per day when this game is one of the user's five daily selections. Three closed chests; the player picks one (tap/click or keys 1–3). Their chest opens first with a glow that grows with its tier, then the other two open one at a time.
- [x] Real but fair choice: all three chests are filled independently and saved before the pick, so every chest has the same odds. Contents are not sent to the browser until the pick is made, so they cannot be inspected early. Leaving before picking returns the same three closed chests; the game locks when a chest is picked.
- [x] Treasure tiers, drawn independently per chest: Cobwebs 25%, Copper 30%, Silver 22%, Gold 14%, Jewels 7%, Relic 2%. No collectibles.
- [x] Ranking: your treasure tier first, then how many of the other two chests it strictly beats (0–2). Picking the best chest therefore counts toward luck.
- [x] Labels (per-game cut-offs): Jinxed 25.0% / Unlucky 16.9% / Fair Luck 17.6% / Lucky 18.3% / Charmed 22.3%. Result shows the treasure, chests beaten, “about 1 in N”, label, and score; reduced-motion path uses fades.

| Your treasure | Other chests beaten | Probability | About 1 in | Score | Label |
| --- | --- | --- | --- | --- | --- |
| Relic | 2 | 1.921% | 52 | 99.04 | Charmed |
| Relic | 1 | 0.078% | 1,276 | 98.04 | Charmed |
| Relic | 0 | 0.001% | 125,000 | 98.00 | Charmed |
| Jewels | 2 | 5.797% | 17 | 95.10 | Charmed |
| Jewels | 1 | 1.147% | 87 | 91.63 | Charmed |
| Jewels | 0 | 0.057% | 1,764 | 91.03 | Charmed |
| Gold | 2 | 8.301% | 12 | 86.85 | Charmed |
| Gold | 1 | 4.959% | 20 | 80.22 | Charmed |
| Gold | 0 | 0.741% | 135 | 77.37 | Lucky |
| Silver | 2 | 6.655% | 15 | 73.67 | Lucky |
| Silver | 1 | 10.890% | 9 | 64.90 | Lucky |
| Silver | 0 | 4.455% | 22 | 57.23 | Fair Luck |
| Copper | 2 | 1.875% | 53 | 54.06 | Fair Luck |
| Copper | 1 | 11.250% | 9 | 47.50 | Fair Luck |
| Copper | 0 | 16.875% | 6 | 33.44 | Unlucky |
| Cobwebs | 0 | 25.000% | 4 | 12.50 | Jinxed |

### The Wishing Well — agreed design

- [x] Format: one coin per day when this game is one of the user's five daily selections. The player first chooses a wish: **Fortune, Love, Adventure, Wisdom, or Mischief**. The wish only chooses the theme of the object; the odds are identical for every wish.
- [x] Toss: flick the coin into the well (click/tap or Enter also works) → splash → ripples glow brighter for rarer tiers → the object floats up in a bubble with its name and a one-line description. Generated and saved before the toss; reduced-motion path uses fades.
- [x] Tiers (same for every wish): Soggy 25%, Ordinary 22%, Curious 20%, Enchanted 17%, Wondrous 13%, Legendary 3% (about 1 in 33). Tone: gently funny at the bottom (a damp sock, a bent spoon), magical at the top (a jar of bottled starlight).
- [x] Score and labels (shared score; per-game cut-offs): Soggy 12.5 Jinxed (25%); Ordinary 36 Unlucky (22%); Curious 57 Fair Luck (20%); Enchanted 75.5 Lucky (17%); Wondrous 90.5 and Legendary 98.5 Charmed (16% combined). Result shows the object, “about 1 in N”, label, and score.
- [x] Collection: a **Curios** tab with 60 objects (5 wishes × 6 tiers × 2 objects, equally likely within a wish and tier), following the agreed collection rules (owned or not, silhouettes for missing objects, no copies). The 10 Legendary objects are the long chase: at least ~330 tosses on average even with well-chosen wishes. No streak reward.
- [ ] Write the 60 objects (names and one-line descriptions) for each wish and tier.

### Gem Breaker — agreed design

Structured like Lucky Fishing (rarest exact find ranks highest) with a different interaction.

- [x] Format: one geode per day when this game is one of the user's five daily selections. Strike it three times (tap/click/Enter); each strike spreads cracks with light leaking through, brighter for rarer finds; the third strike splits it open. Generated and saved before the first strike; leaving mid-way resumes at the same strike; reduced-motion path uses fades.
- [x] Mineral: Hollow (empty, dusty geode) 15%, Common 42%, Uncommon 25%, Rare 12%, Precious 5%, Mythic 1%. Pool: 30 minerals (10 Common, 8 Uncommon, 6 Rare, 4 Precious, 2 Mythic), equally likely within a tier.
- [x] Size (minerals only; shown in carats): Chip 45%, Small 32%, Medium 17%, Large 5%, Giant 1%. Purity: Cloudy 60%, Clear 30%, Brilliant 9%, Flawless 1%.
- [x] Ranking: rank finds by the probability of mineral tier × size × purity (rarer first; equal probabilities tie). Hollow is always lowest.
- [x] Labels (per-game cut-offs): Jinxed = Hollow (15.0%); Unlucky = Common chip/small cloudy (19.4%); Fair Luck 21.5%; Lucky 21.7%; Charmed 22.3% (from a clear Rare chip or any find at least that rare). Result shows the gem, size, purity, “about 1 in N”, label, and score.
- [x] Collection: a **Gems** tab of 30 minerals (owned or not, silhouettes for missing), plus personal bests per mineral: largest size and purest grade found. Derived from saved finds. No streak reward. Pace at one geode per day: full tab ~283 days typical, ~597 for the unluckiest 10%.
- [ ] Write the 30 minerals (names, carat ranges, short descriptions).

### Collection section — agreed feature

- [x] Add a collection section where users can see cards and gacha characters they have pulled.
- [x] Organize the collection into separate Cards, Characters, Fish, Curios, and Gems tabs, with a rarity filter and a **New** marker on each newly collected item until it has been viewed.
- [x] Show undiscovered items as numbered silhouettes with their rarity, plus progress such as “37 / 120 collected”. Show no quantities (ownership only) and no variants at launch.
- [x] Store collections on a server under an anonymous player ID created on first visit and kept in the browser, with no account needed to play. Optional sign-in later links the anonymous player to an account for cross-device sync and a leaderboard name. Without signing in, clearing browser data loses the collection. The tarot introduction stays browser-only as agreed.
- [ ] Derive ownership from the player's saved official results (packs, later summons) rather than a separately awarded list, so an item is owned if any saved result contains it. Store stable item identifiers, item type, and rarity, plus the game day each item was first obtained. No copy counts.
- [ ] Ensure resuming a pack opening cannot award the same pack twice; preserve generated contents and apply ownership changes once. Agreed behavior: cards are saved and awarded before the wrapper opens; resuming returns to the same card in the reveal.
- [x] Check ownership for reveal skipping once, when the pack is generated. Within one pack, the first copy of a card below Rare is revealed (as New if unowned) and later copies are skipped.
- [ ] Keep game odds and comparison scores independent of collection maturity: determine the top three and the score from all 12 actual pulls, including any skipped duplicate reveals. An already-owned low-rarity card that qualifies for the podium appears there with an Owned tag, without replaying its individual reveal.

## 3. Game-selection boards and personal daily board

### Agreed direction

- [x] Make the board-based game selection screen the destination after tarot completion or skipping.
- [x] Provide multiple boards organized by game type; decide the actual grouping after the game list is selected.
- [x] Let free users choose five games per day and make their own board.
- [x] Do not show game results on the boards; decide result presentation separately.
- [x] Keep the supplied image as a layout reference: [game-board-reference.png](docs/references/game-board-reference.png). It shows distinct game panels arranged together on a shared board. Exact styling, panel sizes, and artwork remain deferred; continue using placeholders.

### Decisions to revisit after selecting the game list

- [ ] Finalize board categories and which games belong to each; dice, cards, and chance are examples rather than approved categories.
- [ ] Decide how users move between category boards and their personal board.
- [x] Players build their board as they go; they don't need to pick all five before playing.
- [x] Unplayed selections can be swapped any time that day. A game locks the moment its result is generated (tapping Roll, tearing open the pack).
- [ ] Decide whether yesterday's board carries forward or users choose a fresh board each day.
- [ ] Define what “make their own board” allows beyond choosing games: automatic arrangement, rearrangeable panels, or more customization.
- [x] Store the personal board's daily selections and progress on the server under the same anonymous player as collections and results; no account needed.
- [ ] Define any paid-user offering later; no paid features, pricing, or expanded limits have been specified.

### Implementation work once board behavior is settled

- [ ] Define a game catalog with stable identifiers, category membership, display names, and placeholder panels.
- [ ] Build category-board browsing, game selection, and a personal board showing the five selected games.
- [ ] Decide whether boards show availability/selection/completion indicators, then implement the approved states accessibly. Do not display outcomes, scores, or result previews on the boards.
- [ ] Persist daily selections and progress, enforce the five-game selection limit, and apply the agreed reset and swap rules.
- [ ] Make board navigation and selection usable on mobile and with a keyboard.
- [ ] Route completed/skipped tarot introductions into the board experience without counting tarot toward the five daily game choices.

## 4. Shared daily experience — proposals to revisit

- [x] Decide per-game attempt limits: one official attempt per selected game each day. Games not selected can be browsed on the boards but not played; there are no practice plays, so collections and comparisons only reflect official results.
- [x] Leaving mid-animation or mid-reveal never grants a redo: returning shows the same saved result.
- [x] Players receive independent results with equal odds; outcomes are not shared between players.
- [x] Use one global daily reset at the same moment for everyone, defining a single shared game day for results and comparisons.
- [x] Reset at 3:00 AM US Eastern time (America/New_York), following daylight saving: 07:00 UTC in summer, 08:00 UTC in winter. Each game day runs from one 3 AM reset to the next.
- [ ] Show a clear countdown to the next reset in the player's local time.
- [x] Collections and history begin anonymously on the server; an account is optional.
- [x] Compare users' daily luck with other users after they finish their games for the day. Keep the one-time tarot introduction separate.
- [ ] Define the daily report and comparison presentation. Proposed: a daily luck score with a percentile among other eligible players, such as “Luckier than 82% of players today”; wording is illustrative, not an actual result.
- [ ] Decide whether to show result rarity, such as “1 in 250,” and calculate it from the actual outcome distribution.
- [ ] Explore a shared daily theme across games.
- [ ] Design a compact share card for daily game results, excluding the one-time tarot reading.
- [x] Put every game on the shared 0–100 luck score, so each game's score measures the same thing and no game choice raises expected standing.
- [ ] Define a daily luck score from the completed game results and how unlike games are compared. A common scale alone does not guarantee comparable daily distributions: account for each selected game's odds, outcome ordering, ties, and differing score distributions before choosing an aggregation method.
- [ ] Define comparison eligibility, tie handling, and whether standings are live or final. Comparisons must use actual eligible user results, distinct from theoretical outcome rarity; provide a clear state when there are too few results. The cohort is everyone playing the same global game day.
- [x] Show both a personal percentile and a leaderboard after the user completes their games for the day. Exact layout, leaderboard identity/display names, and ranking rules remain to be defined.
- [ ] Once game rules are final, verify that choice of games does not systematically inflate daily standing; assess calibration across different five-game boards and any later paid-user game counts.

## 5. Technical foundation — not yet selected

- [ ] Choose the application stack and hosting once the initial scope is clear.
- [ ] Decide where random outcomes are generated and how official daily results are stored.
- [ ] Define shared result storage and player/day identity for cross-user daily comparisons, including one official result per allowed play and protection against duplicate submissions. Browser-only tarot tracking does not by itself supply cross-user game standings.
- [ ] Define the day identifier for daily games (one global game day, from the agreed reset) and persistence for both daily results and the one-time tarot introduction.
- [ ] Define loading, error, and recovery behavior for the approved features.
- [ ] Verify mobile layout, accessibility, daily limits, persistence, and outcome calculations for the initial release.

## 6. Deferred artwork work — after the games are finished

- [ ] Choose artwork direction and sources and record asset usage rights. Use placeholders throughout game development.

## Decision log

| Decision | Status |
| --- | --- |
| Daily luck website with multiple chance-based activities | Agreed |
| Game-selection boards after tarot completion or skipping | Agreed |
| Multiple boards grouped by game type | Agreed; categories deferred until the game list is chosen |
| Free users choose five games per day for their own board | Agreed |
| One official attempt per chosen game per day; no practice plays; unplayed picks swappable until played; no redo after leaving | Agreed |
| Independent results with equal odds; one global daily reset for everyone at 3:00 AM US Eastern (follows daylight saving) | Agreed |
| Game boards do not display results | Agreed; result presentation deferred |
| Dice game: one tap rolls all five dice once, with no rerolls | Agreed |
| Dice luck is based on combinations: rarer combinations are luckier, no/minimal combinations are low luck | Agreed |
| Dice: fair d6; ranking five of a kind → four of a kind → straight → full house → three of a kind → two pairs → one pair → no combination; result shows dice, combination, 1-in-N, label, score; no rewards | Agreed |
| Straights require all five dice: 1–5 or 2–6 | Agreed; no four-dice straights |
| Dice outcomes have both a readable luck label and numerical luck score | Agreed |
| Compare daily luck with other users after completing the day's games | Agreed; scoring and eligibility remain open |
| Daily comparison includes both a personal percentile and a leaderboard | Agreed; detailed presentation and ranking rules remain open |
| 12-card packs with trading-card-style rarities and pack-opening/rare-card pull-up animations | Agreed |
| Pack opening: tear to open, self-paced flips in pack order (wildcards unsorted, guaranteed card last), rarity-scaled glow on every rare pull, podium, then result | Agreed |
| Pack slots: 6 Common, 3 Uncommon, 2 any-rarity wildcards, 1 Rare-or-better | Agreed |
| Card rarities: Common, Uncommon, Rare, Super Rare, Ultra Rare, Secret Rare | Agreed |
| Independent wildcard odds: 65% / 25% / 7% / 2% / 0.9% / 0.1%; guaranteed-slot odds: 75% Rare / 20% Super / 4.5% Ultra / 0.5% Secret | Agreed |
| Each card pack guarantees one Rare-or-better card; additional rare pulls are chance-based | Agreed |
| Collection section for pulled cards and gacha characters | Agreed |
| Server-side storage under an anonymous player; optional sign-in for cross-device sync and leaderboard name | Agreed |
| Collection tracks ownership only (no copy counts), shows undiscovered silhouettes and progress, no card variants at launch | Agreed |
| Card list: 150 cards (60 C / 40 U / 25 R / 15 SR / 7 UR / 3 ScR), equal chance within a rarity | Agreed |
| Daily Summon: 10-pull (9 regular + 1 guaranteed 4★+), 1★–5★ with classic odds, 60-character roster, no pity, reveal in pull order ending in a 10-character grid | Agreed |
| 7-day play streak grants new-card priority (unowned cards first within the rolled rarity); rarity odds and scores unchanged | Agreed; card packs only — Daily Summon has no streak reward for now |
| Already-owned cards below Rare count among the 12 but skip their individual reveal, with no replacement | Agreed; pack odds remain unchanged |
| Top-three rarest cards from the current pack form a podium and determine pack luck | Agreed |
| Packs ranked by highest rarity first: podium, then the rest of the pack; ties only when all 12 rarities match | Agreed |
| Shared 0–100 luck score for every game: % of results ranked below yours, plus half of ties | Agreed |
| Shared luck labels Jinxed / Unlucky / Fair Luck / Lucky / Charmed, with per-game cut-offs so every label occurs | Agreed |
| Supplied game-menu image as a board-layout reference | Recorded; art direction remains deferred |
| First-time home-page tarot greeting with five fortune levels | Agreed |
| Tarot should feel like a reading rather than a simple card pick | Agreed |
| Work through one feature at a time, starting with tarot | Agreed |
| Three-card atmosphere / obstacle / guidance spread | Agreed |
| Three up-and-down mouse/touch shuffles, no cuts | Agreed; replaces the earlier cut step |
| Select and reveal each card before choosing the next | Agreed |
| Select from all 78 cards, with one continuous scrollable grid on mobile | Agreed |
| Full deck with reversals, Rider–Waite–Smith-based meanings, and Labyrinthos reference | Agreed |
| Placeholder artwork until the games are finished | Agreed |
| Fully authored readings connected through themes and relationship passages | Agreed; content and rules still need authoring |
| Position-aware weighted outlook scoring, with natural outcome frequencies | Agreed; numerical values and thresholds still need defining |
| Browser-only first-visit tracking and resuming interrupted readings | Agreed |
| Skippable one-time introduction for first-time visitors, with no revisit or new-reading option | Agreed |
| Broader welcome, text only, self-paced | Agreed |
| Tarot outlook uses the shared labels Jinxed / Unlucky / Fair Luck / Lucky / Charmed | Agreed; replaces Bad luck / Minor bad luck / Neutral / Minor good luck / Good luck |
| Tarot is separate from game odds, rewards, scores, and reports | Agreed |
| No separate launch set; games are designed one at a time | Agreed |
| Coin Streak: call every flip, run ends on the second miss, luck = correct calls, run length fixed before the first flip | Agreed |
| Gem Breaker: three strikes to crack a geode; mineral × size × purity, rarest find ranks highest; Gems tab with personal bests | Agreed |
| The Wishing Well: choose a wish theme, toss a coin, six object tiers, 60 collectible Curios | Agreed |
| Three Chests: fair pick of three independently filled chests; luck = your treasure, then chests beaten | Agreed |
| Falling Star: one wished star per day, funnel board with slot widths matching odds, rare narrow centre (Supernova 3%) | Agreed |
| Lucky Fishing: one cast/day; type, size class, and trait; rarest exact catch ranks highest, junk lowest; Fish tab with personal bests | Agreed |
