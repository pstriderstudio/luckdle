# Luckdle — living project to-do list

This document tracks the product ideas, agreed decisions, and implementation work as the project develops. An idea in the backlog is not a commitment to build it. Add implementation details when the related product decision is made; keep unresolved choices explicit.

## Agreed direction

- Build a daily website where visitors test their luck through games of chance.
- After completing or skipping tarot, show a game-selection board. Returning visitors go directly to the game-board experience.
- Provide several browseable boards grouped by game type. Dice, cards, and chance are example categories; finalize categories after choosing the game list.
- Free users can choose five games per day to make their own personal board. Per-game attempt limits and board-editing rules are separate decisions that remain open.
- Game boards do not display results. Decide how results are presented separately; do not assume score or outcome previews on game panels.
- Provide a collection section showing the cards and gacha characters the user has pulled.
- Score every game on one shared 0–100 luck scale: the percentage of that game's possible results ranked below yours, plus half of those that tie with it. Equal results get equal scores; no hidden tie-breakers.
- Pair every game's luck score with one of five plain-language game luck labels, each covering an equal 20-point band: 0–19.99 **Jinxed**, 20–39.99 **Unlucky**, 40–59.99 **Even Odds**, 60–79.99 **Lucky**, 80–100 **Charmed**. Game labels use different words from the tarot outlook levels to keep tarot separate. The bands are agreed; the wording is a draft.
- Give dice outcomes both a plain-language luck label and a numerical luck score. After users finish their games for the day, compare their daily luck with other users. The scoring scale, aggregation, and comparison presentation remain to be designed.
- Greet first-time visitors on the home page with a tarot fortune before they enter the other games.
- Tarot is a skippable, one-time introduction for first-time visitors. It cannot be revisited or requested again after completion or skipping.
- Start with fully authored reading content, assembled from authored interpretations and connecting passages. AI-composed readings are outside the initial scope.
- Use five outlook levels: **Bad luck**, **Minor bad luck**, **Neutral**, **Minor good luck**, and **Good luck**. The repeated word in “minor good luck luck” is treated as a typo.
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
- [x] Define the five outlook labels: Bad luck, Minor bad luck, Neutral, Minor good luck, Good luck.
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
- [ ] Author card/orientation/position values, choose numerical weights and five-level thresholds, and inspect the resulting outlook distribution. Use the same interpretations for scoring and prose; do not force preset outcome frequencies.
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

The table tracks game candidates and their evolving rules. Approved details are recorded in each game's section; the complete launch selection is not yet settled.

Current discussion: work through the games individually. The dice game's core interaction and luck approach are agreed; exact scoring values and other open details remain tracked below. Next candidate: Mystery Card Pack.

| Candidate | Proposed player experience | Details to resolve before implementation |
| --- | --- | --- |
| Dice of Destiny | One tap rolls all five dice once, with no rerolls. | Dice faces, combination rules/rankings, result presentation outside the board, and rewards. |
| Mystery Card Pack | Open a larger trading-card-style booster with multiple rarities, an opening animation, and a rare card pulled upward and revealed. | Pack size, slot structure, scoring, rarity distribution, guarantees, variants, duplicates, and collection storage. |
| Daily Summon | Reveal one character from an original fantasy cast. | Character roster, rarity tiers, reveal sequence, duplicates, and collection progression. |
| Coin Streak | Flip until tails ends the run; measure the number of consecutive heads. | Manual versus automatic flips, outcome probabilities, scoring, and long-streak handling. |
| Plinko / Falling Star | Watch a dropped ball or star bounce through pegs into a reward slot. | Board layout, drop-point choice, outcome distribution, and physics versus a preselected outcome. |
| Three Chests | Choose a chest, then reveal its contents and those of the other two. | Reward pool, how contents are assigned, and reveal order. |
| Lucky Fishing | Make one cast and reveal a creature with a species, size, and unusual trait. | Species pool, size and trait distributions, rare combinations, and collection records. |
| The Wishing Well | Toss a coin into a well and receive a whimsical object. | Item pool, rarity, tone, reveal interaction, and whether objects persist. |
| Gem Breaker | Crack a geode to reveal a mineral with size and purity attributes. | Mineral pool, attribute distributions, cracking interaction, and collection display. |
| Cosmic Alignment | Reveal the alignment of three spinning celestial rings. | Random-stop interaction, alignment measurement, outcome tiers, and animation. |
| Lucky Number | Generate a number and discover rare patterns such as repeated digits or palindromes. | Number range, pattern definitions, overlapping patterns, and rarity calculation. |
| Garden of Chance | Plant a mystery seed and reveal a bloom with possible mutations. | Plant pool, mutation odds, reveal timing, garden persistence, and garden capacity. |

- [ ] Select launch games after defining the tarot experience. Suggested starting set: tarot, dice, a card pack, and fishing; not yet approved.
- [ ] Decide whether card packs and character summons offer enough distinct value to launch together.
- [ ] Define each selected game's rules and outcome probabilities before implementing it.
- [ ] Make ordinary and unlucky outcomes entertaining through artwork, names, and copy.

### Dice of Destiny — first game under discussion

Five dice, one tap to roll them all, no rerolls, and combination-based luck are agreed. Rarer recognized combinations are luckier; no combination or minimal combinations represent low luck. Exact categories and other rules below remain open or proposed.

- [x] Choose the core format: a single roll of five dice, triggered together by one tap, with no keep/reroll or push-your-luck stage.
- [x] Choose dice count: five.
- [ ] Confirm die faces and probabilities. Proposed: standard fair six-sided dice.
- [x] Judge luck by combinations, with rarer recognized combinations ranked higher. No combination is lowest luck, and minimal combinations are low luck. Do not rank by the sum of dice.
- [ ] Finalize the recognized combinations and their ranking. Proposed highest to lowest: five of a kind → four of a kind → five-dice straight → full house → three of a kind → two pairs → one pair → no combination.
- [x] Require all five dice for a straight: 1–2–3–4–5 or 2–3–4–5–6, in any roll order. Four-dice straights do not count.
- [x] Keep results off the board. Where and how results are shown remains a separate decision.
- [ ] Decide the result display outside the board. Proposed content: show the dice, name the combination, and show the probability of that exact result category once categories are precisely defined. Presentation remains undecided.
- [x] Decide interaction: one click/tap rolls all five dice once.
- [ ] Decide attempts. Proposed: one official roll when this game is one of the user's five daily selections, with the result saved and no reroll.
- [x] Give the dice result both a plain-language luck label and a numerical luck score, anchored by the actual combination to make the outcome understandable.
- [x] Use the shared 0–100 luck score (see Agreed direction). Scores follow the approved luck ranking, so No combination stays lowest.
- [x] Use the shared game luck labels (see Agreed direction). With the proposed ranking: No combination → Jinxed; One pair → Unlucky; Two pairs → Lucky; Three of a kind or better → Charmed.
- [ ] Decide any rewards separately; collectible rewards are not currently agreed.
- [ ] Once rules are approved, enumerate outcomes to verify category probabilities and implement roll generation, persistence, and board completion state.

#### Preliminary combination probabilities

Enumerated all 7,776 ordered rolls of five independent fair six-sided dice. These results assume only five-dice straights, with exact mutually exclusive categories: a full house does not count as three of a kind, and stronger repeated-value categories do not also count as a pair. Dice faces and the final category set remain to be confirmed.

| Proposed luck rank (highest first) | Category | Outcomes | Probability |
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

Luck scores under the shared 0–100 method, if the proposed ranking above is approved: No combination 3.1 · One pair 29.3 · Two pairs 64.0 · Three of a kind 83.3 · Full house 93.0 · Five-dice straight 96.5 · Four of a kind 99.0 · Five of a kind 99.96.

### Mystery Card Pack — next game for discussion

Agreed direction: a 12-card pack inspired by Yu-Gi-Oh!/Magic-style boosters with multiple rarities, a pack-opening animation, and a rare card pulled upward and revealed. Each pack contains 6 Common slots, 3 Uncommon slots, 2 wildcard slots of any rarity, and 1 guaranteed Rare-or-better slot, with approved independent slot odds below. A podium spotlights the three rarest cards from the current pack and those three determine its luck result. Podium ordering and the luck score are agreed (below); label thresholds remain open. Artwork is still deferred.

- [x] Replace the five-card proposal with a 12-card trading-card-style booster.
- [x] Include multiple rarity tiers, a pack-opening animation, and a rare-card pull-up/reveal animation.
- [x] Choose the pack size: 12 cards.
- [x] Guarantee one Rare-or-better card in every pack. Additional Rare-or-better cards are possible through chance, not guaranteed; the other podium places may be lower rarity.
- [x] Define pack slots: 6 Common + 3 Uncommon + 2 wildcards that can yield any rarity + 1 guaranteed Rare-or-better. This is Luckdle's agreed format, not the distribution of a specific real-world product.
- [x] Show a podium of the three rarest cards pulled from the current pack and base the pack's luck result on those three. This is a result presentation outside the game-selection boards.
- [x] Define how the top three combine into the numerical luck score: rank by rarity only, so duplicate copies count like any other card of that rarity, equal rarity triplets tie, and when fewer than three cards are Rare-or-better the fixed Uncommons fill the podium. Commons can never reach the podium.
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

- [x] Choose podium scoring priority: compare the highest rarity first, then the second-highest, then the third-highest. One Secret Rare outranks any pack without one; supporting pulls distinguish packs that share the same highest tier. Additive rarity points were rejected.
- [x] Derive the numerical luck score from the complete distribution of podium outcomes under the approved slot odds (table below). Equal rarity triplets tie; no hidden tie-breakers.
- [x] Use the shared game luck labels: R / U / U → Unlucky; R / R / U, R / R / R and SR / U / U → Lucky; every other podium → Charmed. Packs cannot be Jinxed because every pack contains a Rare.

#### How often each game luck label occurs

The score is a percentile, but these games have a few results that each cover a large share of outcomes, so labels do not appear 20% of the time each, and some never appear. The five-game daily score will be smoother, so every label can occur there.

| Game | Jinxed | Unlucky | Even Odds | Lucky | Charmed |
| --- | --- | --- | --- | --- | --- |
| Dice of Destiny (proposed ranking) | 6.17% | 46.30% | never | 23.15% | 24.38% |
| Mystery Card Pack | never | 60.75% | never | 26.02% | 13.23% |

#### Podium outcomes and luck scores

Exact distribution of all 34 podium outcomes under the approved slot odds, best first. Score = the shared 0–100 luck score. Abbreviations: U Uncommon, R Rare, SR Super Rare, UR Ultra Rare, ScR Secret Rare.

| Podium | Probability | About 1 in | Score |
| --- | --- | --- | --- |
| ScR / ScR / ScR | 0.0000005% | 200,000,000 | 100.00 |
| ScR / ScR / UR | 0.0000135% | 7,407,407 | 100.00 |
| ScR / ScR / SR | 0.00004% | 2,500,000 | 100.00 |
| ScR / ScR / R | 0.000145% | 689,655 | 100.00 |
| ScR / ScR / U | 0.0009% | 111,111 | 100.00 |
| ScR / UR / UR | 0.0001215% | 823,045 | 100.00 |
| ScR / UR / SR | 0.00072% | 138,889 | 100.00 |
| ScR / UR / R | 0.00261% | 38,314 | 100.00 |
| ScR / UR / U | 0.0162% | 6,173 | 99.99 |
| ScR / SR / SR | 0.001% | 100,000 | 99.98 |
| ScR / SR / R | 0.0072% | 13,889 | 99.97 |
| ScR / SR / U | 0.054% | 1,852 | 99.94 |
| ScR / R / R | 0.01295% | 7,722 | 99.91 |
| ScR / R / U | 0.198% | 505 | 99.81 |
| ScR / U / U | 0.405% | 247 | 99.50 |
| UR / UR / UR | 0.0003645% | 274,348 | 99.30 |
| UR / UR / SR | 0.00324% | 30,864 | 99.30 |
| UR / UR / R | 0.011745% | 8,514 | 99.29 |
| UR / UR / U | 0.0729% | 1,372 | 99.25 |
| UR / SR / SR | 0.009% | 11,111 | 99.21 |
| UR / SR / R | 0.0648% | 1,543 | 99.17 |
| UR / SR / U | 0.486% | 206 | 98.90 |
| UR / R / R | 0.11655% | 858 | 98.59 |
| UR / R / U | 1.782% | 56 | 97.65 |
| UR / U / U | 3.645% | 27 | 94.93 |
| SR / SR / SR | 0.008% | 12,500 | 93.11 |
| SR / SR / R | 0.086% | 1,163 | 93.06 |
| SR / SR / U | 0.72% | 139 | 92.66 |
| SR / R / R | 0.308% | 325 | 92.14 |
| SR / R / U | 5.22% | 19 | 89.38 |
| SR / U / U | 16.2% | 6 | 78.67 |
| R / R / R | 0.3675% | 272 | 70.38 |
| R / R / U | 9.45% | 11 | 65.47 |
| R / U / U | 60.75% | 2 | 30.38 |

The most common pack (R / U / U, 60.75%) scores about 30: a typical result sits below the middle because most results are ordinary. Scores near 100 are distinguished by the 1-in-N rarity rather than the rounded score.

- [ ] Define the opening interaction and reveal sequence. Proposed: open wrapper → reveal a stack → show new lower-rarity cards while skipping already-owned lower-rarity cards according to the agreed duplicate rule → spotlight Rare-or-better pulls → show the top-three podium and result. Preserve spotlight moments for additional rare pulls, and do not reintroduce skipped duplicate reveals at the end.
- [ ] Build the reveal using placeholder cards; retain an accessible reduced-motion path. Pack contents should be fixed before reveals so animation timing does not change the outcome.
- [x] Make pulled cards persistent collectibles visible in the site's collection section alongside gacha characters.
- [ ] Define collection storage, duplicate counts, same-pack duplicate handling, and whether special variants exist. Defer artwork direction until the games are finished.
- [ ] Define daily attempts, label/score mapping, and result persistence once the format is approved.

Reference examples: Konami lists [Supreme Darkness](https://www.yugioh-card.com/en/products/suda/) as a nine-card booster; Wizards' [Play Booster introduction](https://magic.wizards.com/en/news/making-magic/what-are-play-boosters) describes fourteen-card packs. Real products vary, so use these as structural inspiration rather than assuming one universal pack format.

### Collection section — agreed feature

- [x] Add a collection section where users can see cards and gacha characters they have pulled.
- [ ] Decide collection organization, such as separate Cards and Characters tabs, rarity filters, and newly collected markers.
- [ ] Decide whether to display only acquired items or also undiscovered slots, and how owned quantities and variants appear.
- [ ] Decide browser-local versus account-backed storage and cross-device behavior. Browser-only tarot tracking does not determine collection storage.
- [ ] Store stable item identifiers, item type, rarity, and ownership; define quantities and acquisition metadata after duplicate behavior is settled.
- [ ] Ensure resuming a pack opening cannot award the same pack twice; preserve generated contents and apply ownership changes once.
- [ ] Define exactly when ownership is checked for reveal skipping, including duplicates within a single pack.
- [ ] Keep game odds and comparison scores independent of collection maturity: determine the top three and the score from all 12 actual pulls, including any skipped duplicate reveals. Decide how the podium represents an already-owned low-rarity card if it qualifies, without replaying its individual reveal.

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
- [ ] Decide whether players select all five games before starting or build their board as they go.
- [ ] Decide whether unplayed selections can be swapped, and when a selected game becomes locked for that day.
- [ ] Decide whether yesterday's board carries forward or users choose a fresh board each day.
- [ ] Define what “make their own board” allows beyond choosing games: automatic arrangement, rearrangeable panels, or more customization.
- [ ] Decide personal-board persistence and account requirements separately from the browser-only tarot introduction.
- [ ] Define any paid-user offering later; no paid features, pricing, or expanded limits have been specified.

### Implementation work once board behavior is settled

- [ ] Define a game catalog with stable identifiers, category membership, display names, and placeholder panels.
- [ ] Build category-board browsing, game selection, and a personal board showing the five selected games.
- [ ] Decide whether boards show availability/selection/completion indicators, then implement the approved states accessibly. Do not display outcomes, scores, or result previews on the boards.
- [ ] Persist daily selections and progress, enforce the five-game selection limit, and apply the agreed reset and swap rules.
- [ ] Make board navigation and selection usable on mobile and with a keyboard.
- [ ] Route completed/skipped tarot introductions into the board experience without counting tarot toward the five daily game choices.

## 4. Shared daily experience — proposals to revisit

- [ ] Decide per-game attempt limits within the five selected daily games. Proposed: one official attempt per selected game each day; this is not yet approved.
- [ ] Decide whether players receive independent results with equal odds, shared daily outcomes, or another model.
- [ ] Decide daily reset rules and communicate the next reset clearly.
- [ ] Decide whether collections and history require an account or can begin anonymously.
- [x] Compare users' daily luck with other users after they finish their games for the day. Keep the one-time tarot introduction separate.
- [ ] Define the daily report and comparison presentation. Proposed: a daily luck score with a percentile among other eligible players, such as “Luckier than 82% of players today”; wording is illustrative, not an actual result.
- [ ] Decide whether to show result rarity, such as “1 in 250,” and calculate it from the actual outcome distribution.
- [ ] Explore a shared daily theme across games.
- [ ] Design a compact share card for daily game results, excluding the one-time tarot reading.
- [x] Put every game on the shared 0–100 luck score, so each game's score measures the same thing and no game choice raises expected standing.
- [ ] Define a daily luck score from the completed game results and how unlike games are compared. A common scale alone does not guarantee comparable daily distributions: account for each selected game's odds, outcome ordering, ties, and differing score distributions before choosing an aggregation method.
- [ ] Define comparison eligibility, daily cohort/reset boundary, tie handling, and whether standings are live or final. Comparisons must use actual eligible user results, distinct from theoretical outcome rarity; provide a clear state when there are too few results.
- [x] Show both a personal percentile and a leaderboard after the user completes their games for the day. Exact layout, leaderboard identity/display names, and ranking rules remain to be defined.
- [ ] Once game rules are final, verify that choice of games does not systematically inflate daily standing; assess calibration across different five-game boards and any later paid-user game counts.

## 5. Technical foundation — not yet selected

- [ ] Choose the application stack and hosting once the initial scope is clear.
- [ ] Decide where random outcomes are generated and how official daily results are stored.
- [ ] Define shared result storage and player/day identity for cross-user daily comparisons, including one official result per allowed play and protection against duplicate submissions. Browser-only tarot tracking does not by itself supply cross-user game standings.
- [ ] Define the day identifier for daily games and persistence for both daily results and the one-time tarot introduction.
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
| Free users choose five games per day for their own board | Agreed; attempt limits and board-editing rules remain open |
| Game boards do not display results | Agreed; result presentation deferred |
| Dice game: one tap rolls all five dice once, with no rerolls | Agreed |
| Dice luck is based on combinations: rarer combinations are luckier, no/minimal combinations are low luck | Agreed; exact categories/ranking remain proposed |
| Straights require all five dice: 1–5 or 2–6 | Agreed; no four-dice straights |
| Dice outcomes have both a readable luck label and numerical luck score | Agreed; exact labels and scale remain open |
| Compare daily luck with other users after completing the day's games | Agreed; scoring and eligibility remain open |
| Daily comparison includes both a personal percentile and a leaderboard | Agreed; detailed presentation and ranking rules remain open |
| 12-card packs with trading-card-style rarities and pack-opening/rare-card pull-up animations | Agreed |
| Pack slots: 6 Common, 3 Uncommon, 2 any-rarity wildcards, 1 Rare-or-better | Agreed |
| Card rarities: Common, Uncommon, Rare, Super Rare, Ultra Rare, Secret Rare | Agreed |
| Independent wildcard odds: 65% / 25% / 7% / 2% / 0.9% / 0.1%; guaranteed-slot odds: 75% Rare / 20% Super / 4.5% Ultra / 0.5% Secret | Agreed |
| Each card pack guarantees one Rare-or-better card; additional rare pulls are chance-based | Agreed |
| Collection section for pulled cards and gacha characters | Agreed; persistence and display details remain open |
| Already-owned cards below Rare count among the 12 but skip their individual reveal, with no replacement | Agreed; pack odds remain unchanged |
| Top-three rarest cards from the current pack form a podium and determine pack luck | Agreed |
| Podium ranked by highest rarity first, then second, then third; equal rarity triplets tie | Agreed |
| Shared 0–100 luck score for every game: % of results ranked below yours, plus half of ties | Agreed |
| Five game luck labels in equal 20-point bands, worded differently from tarot | Agreed; draft wording Jinxed / Unlucky / Even Odds / Lucky / Charmed |
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
| Bad luck / Minor bad luck / Neutral / Minor good luck / Good luck | Agreed |
| Tarot is separate from game odds, rewards, scores, and reports | Agreed |
| Launch with tarot, dice, card packs, and fishing | Proposed |
