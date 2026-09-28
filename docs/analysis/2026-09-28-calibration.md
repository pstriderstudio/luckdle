# Calibration check: boards, spreads, and Lucky Number skill

- Date: 2026-09-28
- Source: `npm run calibrate` (`packages/game-logic/scripts/calibrate.ts`); exact score distributions from the game tables, scores binned to 0.1, cross-checked by Monte Carlo.
- Covers TODO.md §4 “Verify calibration by simulation”.

## Summary

1. **Board choice is fair.** Every game's score is close to uniform on 0–100 (standard deviation 27–29; a perfectly uniform score is 28.9), so all 462 possible boards have almost the same daily-score distribution. The most and least favoured boards differ by at most 2% in how often they reach Charmed, 5%/−7% for the top 1%, and 8%/−10% for the top 0.1% — small next to day-to-day luck. No board change is needed.
2. **Lumpy games slightly lower your ceiling, not your average.** Dice of Destiny is the least spread (a single result, One pair, covers 46% of rolls), so boards with it reach the very top a little less often (0.97× for the top 1%). Boards heavy in rare-find games (Daily Summon, Gem Breaker, Lucky Fishing, Garden) reach it slightly more often (up to 1.05×). Expected daily score is 50 for every board.
3. **Lucky Number skill matters much more than board choice.** Lucky Number is scored against a simulated careful player, so how you play changes your expected score:
   - An expert who also rules out unrevealed digits averages **60** (+2 on the daily score) and reaches the top 1% about **1.2×** as often.
   - A casual player guessing any still-possible number averages **31** (−3.8 daily) and reaches the top 1% about **0.55×** as often.
   - A player who ignores revealed digits averages **5** (−9 daily) and almost never reaches the top 1% (**0.05×**).

   Most real players will probably play below the careful reference, so for them picking Lucky Number *lowers* expected standing — which conflicts with the agreed rule that no game choice should raise (or lower) expected standing.

## Decision needed: Lucky Number scoring

Options (not implemented):

- **A. Keep scoring against the simulated careful player** (current design). Skill is rewarded; typical players score below 50 and are nudged away from choosing it.
- **B. Score against real players' recent results** (e.g. guess counts from the last 30 game days), falling back to the simulation until there are enough plays. The average player then expects 50 again, while better-than-average play is still rewarded. Scores stay fixed at play time because the reference window is in the past.
- **C. Show Lucky Number's result but leave it out of the daily score** and leaderboard (or count it separately as a skill game).

Recommendation: **B**, because it restores the “no game choice changes expected standing” rule without removing the skill that makes Lucky Number different.

## Full results

### 1. Game score spreads

| Game | Mean | Std. dev. | P(score ≥ 90) | P(score ≤ 10) |
| --- | --- | --- | --- | --- |
| Daily Summon | 50.00 | 28.9 | 10.0% | 9.5% |
| Gem Breaker | 50.01 | 28.8 | 9.8% | 15.0% |
| Lucky Fishing | 50.00 | 28.7 | 9.8% | 15.0% |
| Three Chests | 49.99 | 28.5 | 9.0% | 0.0% |
| Lucky Number | 50.00 | 28.5 | 10.8% | 8.6% |
| Garden of Chance | 50.01 | 28.5 | 9.4% | 15.0% |
| Coin Streak | 50.01 | 28.3 | 10.9% | 0.0% |
| Falling Star | 50.00 | 28.3 | 17.0% | 0.0% |
| The Wishing Well | 50.00 | 28.3 | 16.0% | 0.0% |
| Mystery Card Pack | 50.00 | 28.2 | 9.5% | 0.0% |
| Dice of Destiny | 49.98 | 27.1 | 9.0% | 6.2% |

### 2. Daily score by board

All 462 possible boards, each assumed equally common. Daily-score cut-offs for the whole field: Charmed (top 20%) ≥ 60.94; Top 100 of 1,000 (top 10%) ≥ 66.56; Top 100 of 10,000 (top 1%) ≥ 79.00; Top 100 of 100,000 (top 0.1%) ≥ 86.68.

Each rate below is relative to the field (1.00× = the average board).

| Level | Lowest board | Median board | Highest board | Highest ÷ lowest |
| --- | --- | --- | --- | --- |
| Charmed (top 20%) | 0.98× | 1.00× | 1.01× | 1.0 |
| Top 100 of 1,000 (top 10%) | 0.98× | 1.00× | 1.02× | 1.0 |
| Top 100 of 10,000 (top 1%) | 0.93× | 1.00× | 1.05× | 1.1 |
| Top 100 of 100,000 (top 0.1%) | 0.90× | 1.00× | 1.08× | 1.2 |

Daily-score spread by board: std. dev. from 12.5 (Coin Streak, Dice of Destiny, Mystery Card Pack, Falling Star, The Wishing Well) to 12.8 (Lucky Number, Daily Summon, Three Chests, Lucky Fishing, Gem Breaker).

#### Top 100 of 10,000 (top 1%): most and least favoured boards

| Board | Rate |
| --- | --- |
| Daily Summon, Three Chests, Lucky Fishing, Gem Breaker, Garden of Chance | 1.05× |
| Mystery Card Pack, Daily Summon, Three Chests, Lucky Fishing, Gem Breaker | 1.04× |
| Mystery Card Pack, Daily Summon, Lucky Fishing, Gem Breaker, Garden of Chance | 1.04× |
| Lucky Number, Dice of Destiny, Lucky Fishing, Falling Star, The Wishing Well | 0.95× |
| Lucky Number, Coin Streak, Dice of Destiny, Falling Star, The Wishing Well | 0.95× |
| Lucky Number, Dice of Destiny, Garden of Chance, Falling Star, The Wishing Well | 0.93× |

#### Charmed (top 20%): most and least favoured boards

| Board | Rate |
| --- | --- |
| Daily Summon, Three Chests, Lucky Fishing, Gem Breaker, Garden of Chance | 1.01× |
| Lucky Number, Daily Summon, Lucky Fishing, Gem Breaker, Garden of Chance | 1.01× |
| Lucky Number, Daily Summon, Three Chests, Lucky Fishing, Gem Breaker | 1.01× |
| Coin Streak, Dice of Destiny, Garden of Chance, Falling Star, The Wishing Well | 0.98× |
| Lucky Number, Dice of Destiny, Mystery Card Pack, Falling Star, The Wishing Well | 0.98× |
| Coin Streak, Dice of Destiny, Three Chests, Falling Star, The Wishing Well | 0.98× |

#### Effect of including each game

| Game | Charmed rate with / without | Top-1% rate with / without |
| --- | --- | --- |
| Daily Summon | 1.00× | 1.02× |
| Gem Breaker | 1.00× | 1.01× |
| Lucky Fishing | 1.00× | 1.01× |
| Three Chests | 1.00× | 1.01× |
| Garden of Chance | 1.00× | 1.01× |
| Mystery Card Pack | 1.00× | 1.00× |
| Coin Streak | 1.00× | 1.00× |
| Lucky Number | 1.00× | 0.99× |
| Falling Star | 1.00× | 0.99× |
| The Wishing Well | 1.00× | 0.99× |
| Dice of Destiny | 0.99× | 0.97× |

Monte Carlo cross-check (200,000 simulated days, random boards): mean daily score 50.02; share at or above the top-10% cut-off 9.96% (exact: 10% up to binning).

### 3. Lucky Number skill

Rates are for boards that include Lucky Number, relative to the field (all other players assumed to play like the reference player).

| Strategy | Mean guesses | Expected score | Expected daily score | Charmed rate | Top-1% rate | Top-0.1% rate |
| --- | --- | --- | --- | --- | --- | --- |
| Reference: middle guess, uses higher/lower + revealed digits | 6.82 | 50.0 | 50.0 | 1.00× | 0.99× | 0.99× |
| Expert: also rules out unrevealed digits | 6.14 | 59.9 | 52.0 | 1.18× | 1.20× | 1.14× |
| Casual: random possible number (uses hints + revealed digits) | 8.68 | 31.2 | 46.2 | 0.66× | 0.55× | 0.55× |
| Ignores revealed digits: middle guess from higher/lower only | 11.82 | 4.6 | 40.9 | 0.22× | 0.05× | 0.05× |
