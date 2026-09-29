# Wild Rivers — Bot Strategy

This file describes an automated player policy for Wild Rivers. It is strategy guidance, not an additional rule. Use the state transitions and scoring in [rules.md](rules.md) as the source of truth.

## What the bot is optimizing

The bot wants to turn collected pearls into points. A pearl on the Alpaca is temporary and scores nothing at game end; it must reach a compatible Villager space. The bot should therefore evaluate pearls together with:

- the Villagers it owns and the colors/spaces they can still accept;
- the Villager tile bonuses that are realistically achievable;
- the six-slot Alpaca limit and any Alpaca goal not yet claimed;
- Camp-card and Fairy resources needed for later actions;
- the current placement order and the next round’s turn order;
- opportunities to recruit a valuable Villager before another player takes it.

Raw pearl value is only a starting point. A low-value pearl that completes a scoring condition or frees a critical Alpaca space can be more useful than an unsupported high-value pearl.

## State the bot should track

Maintain at least:

- current round and phase;
- each player’s Camp hand by type, Camp market, deck and discard;
- current turn-track order, including each player’s remaining tokens;
- every legal board slot and its cost, row, left-to-right order, and downstream route;
- visible pearls in each active channel and the Lake;
- token placements and their within-section priority;
- each player’s Alpaca occupancy and color counts;
- Villager spaces, socket colors, recruitment rewards, scoring formula, and whether each bonus condition is met or still possible;
- the common Starting Villager definition cloned identically for every player; initial turn order is tracked separately;
- available Fairies by type;
- claimed and unclaimed Alpaca goals;
- random seed/state for the pearl bag, Villager deck, Fairy supply, and Camp deck.

All pearl colors behind the Floodgate are public before placement. The remaining bag composition is also knowable if the application tracks every draw.

## Action evaluation

For each legal placement, estimate:

**placement value = pearl value + Villager/storage value + Fairy value + card value + turn-order value + denial value − card cost**

### Pearl value

Estimate which pearls are likely to be available at the token when Collection reaches it. Include:

- the currently visible pearls on channels that can reach that section;
- any upstream tokens expected to take one pearl and then release the rest;
- already placed opponent tokens that may intercept pearls first;
- the chance an opponent places into a relevant slot before the bot’s next placement;
- the color compatibility and spare space on the bot’s Villagers.

For every likely pearl, use its printed end-game value only if it can probably be stored on a Villager. Discount it if the bot has no matching open space or must first recruit a compatible Villager. Include additional value for completing a Villager ability or an Alpaca goal.

At the start of a game, pearl rarity and value are:

| Color | Count | Raw points | Initial bag share |
|---|---:|---:|---:|
| Green | 17 | 1 | 26.2% |
| Blue | 15 | 2 | 23.1% |
| Pink | 13 | 3 | 20.0% |
| Purple | 11 | 4 | 16.9% |
| White | 9 | 5 | 13.8% |

Update these probabilities as pearls are drawn. The pearl bag is sampled without replacement. The expected raw value of a random pearl at the start is 175/65, or about 2.69 points, before storage and tile bonuses.

### Villager and storage value

Score a Village placement for more than the tile’s printed bonus:

- Value its added compatible spaces, especially if the Alpaca is filling or current Villagers have too few spaces for the colors likely to arrive.
- Value its Camp-card reward immediately.
- Evaluate its bonus using current tableau state and plausible future collections.
- Treat general-collection abilities as easier to realize because they do not require that tile to be full.
- Discount a personal-collection ability if the bot lacks enough rounds or suitable pearls to fill it.
- Prefer a tile whose colors, ability, and card reward support an existing plan over a tile with a nominally larger but unreachable bonus.

The public Villager display is temporary and is not replenished after a recruitment until the next Preparation. The bot should compare the cost of an early Village slot with the risk that the desired tile will be taken.

### Alpaca space and goal value

An Alpaca holds six pearls. Before taking pearls, reserve space for likely future collections. The Lake can offer several pearls at once, but the bot can leave some there or exchange Alpaca pearls for Lake pearls.

For each unclaimed Alpaca goal, value the four-point reward and the likelihood that the bot can complete it before another player. Keep the required color set on the Alpaca long enough to claim the goal, then deliver pearls to Villagers. Do not leave pearls on the Alpaca after a round without a concrete goal or capacity reason; they occupy space and have zero end-game value.

### Camp-card and Fairy value

Any Camp card can pay any placement cost. Spending a card also removes it from a pair that could activate an action. The bot should compare the cost of a higher/upstream slot with the pair-action opportunity it gives up.

- Keep useful matching pairs when their expected action value exceeds the benefit of spending the cards for a placement.
- Use a **Banner** pair when moving an unplaced token to the top of the turn track gives a needed immediate turn or changes access to a contested slot.
- Use a **Lantern** pair to take the Fairy with the highest current value, considering its timing and the remaining game.
- Use a **Provisions** pair to rescue or improve an already placed token without paying the destination cost. The move is especially useful when an opponent’s placement changes the expected pearls, when access to the Lake or Village changes, or when a better downstream/upstream position becomes available.
- Use a **Fishing Net** pair on a river section with an extra pearl worth taking and enough Alpaca capacity or exchange flexibility.
- Use a **Shamisen** pair after a recruitment when another face-up Villager is valuable and a later Village slot remains to be resolved.
- A **Bonfire Fairy** is a flexible Camp card, including one half of a matching pair.
- A **Cloud Fairy** saves all Camp-card cost for one placement, so prefer using it on an expensive river or priority Village slot.
- A **River Fairy** adds one pearl at a river collection. Use it where a second pearl is available and useful.
- A **Mushroom Fairy** can make a mismatched Villager socket wild. Use it to store a pearl that would otherwise remain stranded on the Alpaca.
- A **Breeze Fairy** can move up to three pearls from the Alpaca or between Villagers. It is most valuable when it frees Alpaca space or makes a tile bonus achievable.

### Turn-order value

The order in which tokens resolve in Collection determines their placement at the bottom of the turn track for next round. Earlier resolved tokens are placed farther down the track; later resolved tokens sit above them and act earlier next round. Thus a token that resolves later this round can improve the player’s first-turn access in the next round.

Include that reversal in the placement value:

- Early river sections often give better pearl selection now but usually resolve earlier, pushing that token later in next round’s order.
- Downstream sections and the Lake may resolve later, improving next-round priority.
- A Village token’s order is determined by its left-to-right Village slot scan.
- Banner pairs can change the order of still-unplaced tokens during Exploration.

Do not optimize turn order in isolation. A small initiative gain is not worth giving away a high-value pearl or a needed Villager.

### Denial value

Add a modest value for occupying a scarce slot before an opponent, especially:

- a section with a high-value visible pearl that can be intercepted;
- an earlier Village slot when only one tile suits a rival’s tableau;
- a position that stops a rival’s token from collecting multiple pearls at a lower section.

Do not count a pearl as both collected by the bot and denied to an opponent.

## Practical decision policy

At each Exploration turn:

1. Enumerate empty legal slots and calculate their printed card cost/reward.
2. Estimate pearl outcomes after currently placed tokens and likely opponent placements.
3. Estimate Villager, Fairy, card-pair, Alpaca-goal, and turn-order effects.
4. Choose the placement with the highest total marginal score, including future storage.
5. Pay with cards that least reduce useful matching pairs. If possible, retain a pair that can still be played after receiving the placement’s card reward.
6. Collect all Fairies triggered by a new river placement.
7. After placement and card payment/reward, choose available matching pairs in a sequence that preserves later options. Recompute the board after Provisions or Banner.
8. During Collection, choose pearl colors that maximize score and complete goals while preserving enough Alpaca capacity for later tokens.
9. At the Lake, take the best pearls that fit; exchange pearls if doing so improves the tableau or a goal.
10. Recruit the best available Villager in slot order and take its Camp reward.
11. Before delivering pearls, claim any eligible Alpaca goal. Then move pearls from Alpaca to compatible Villager spaces, prioritizing immediate points, achievable tile bonuses, and clearing Alpaca space.

## Pearl choice tie-breaks

When two pearls have similar estimated value, prefer the one that:

1. fills a Villager space and scores immediately at game end;
2. completes a personal-collection tile condition;
3. completes or advances a high-value general-collection condition;
4. completes an unclaimed Alpaca goal before a rival;
5. is harder to obtain later, based on remaining bag counts and visible rival needs;
6. uses Alpaca capacity more efficiently.

If the bot is at the Alpaca limit and must exchange, remove a pearl that is less valuable in the tableau and less likely to advance a goal. Keep a pearl on the Alpaca only for a near-term goal or because no Villager space can accept it.

## Villager evaluation examples

All players begin with identical Starting Villager sockets, reward, and ability. The bot should not apply a strategic adjustment based on which starting Villager a player received; the only randomized setup asymmetry is the separately assigned player order. Load recruitable Villager definitions and scoring rules as editable data as described in [physics.md](physics.md).

- A tile scoring per white pearl across the tableau is strong when the player already has compatible white spaces and can collect whites; it does not need to be filled if its printed condition is general.
- A tile rewarding the player with the absolute most of a color or unused Fairies is uncertain. Estimate whether the bot can finish with a lead; a tie pays zero.
- A personal tile that awards points only when filled should be valued against the remaining number of collection opportunities and its exact socket pattern.
- A Villager that supplies more Camp cards can be valuable early because it funds later high-cost positions and matching pairs.
- A flexible/rainbow space reduces the chance that a pearl remains on the Alpaca without a home.

## Deterministic bot behavior and fallbacks

For repeatable games, seed each randomized subsystem and record the seed in the game state. If two actions have equal utility, break ties in this order: lower Camp-card spend; more open Alpaca spaces after the expected collection; more expected raw pearl points; earlier next-round turn order; then a stable slot identifier. For equal pearl choices, use a stable color ordering configured by the application.

The opponent model can begin as a simple probability distribution over legal placements, weighted by visible pearl fit, cost, available cards, and Villager needs. It can later be replaced with self-play or a search policy without changing the rules model.
