# Wild Rivers — Components, Randomness, and Board Model

This document records the component inventory and the physical behavior that the game simulation needs. It describes the Wild Rivers prototype. See [rules.md](rules.md) for the complete turn sequence and scoring rules, and [strategy.md](strategy.md) for bot policy.

## Content scope

Wild Rivers uses 50 Camp cards and five active Alpaca-goal cards. The implemented component definitions are maintained in `src/game.ts`.

## Component inventory

| Component | Quantity | Use |
|---|---:|---|
| 3D game board | 1 | Twelve sloped river channels, placement slots, Lake, Village, turn track |
| Board stabilizers | 2 | Support the assembled board |
| Floodgate | 1 | Holds pearls at the channel sources until Collection |
| Pearls | 65 | Five colors; stored in the bag, board, Alpacas, or Villager spaces |
| Alpaca boards | 4 | One per player; six temporary pearl spaces each |
| Starting Villager tiles | 4 physical tiles | The app clones one identical Starting Villager definition once per player; virtual start-order labels are separate |
| Recruitable Villager tiles | 26 | Shuffled, displayed six at a time, and recruited during Collection |
| Alpaca-goal cards | 5 | All face up in the 2025 game; each is a one-time four-point race |
| Camp cards | 50 | Five action types; initial hand, payment currency, and paired actions |
| Fairy tokens | 25 | Five action types; face-down supply, single-use after collection |
| Tribe tokens | 12 | Three in each of four player colors |
| Drawstring bag | 1 | Pearl randomizer |
| Player aids | 2 | Rules reference material |

## Pearl inventory and values

The 65 pearls are distributed as follows. The end-game point values are inferred from the rulebook’s worked scoring example, which shows two white pearls scoring 10, one purple scoring 4, one pink scoring 3, eight blue scoring 16, and two green scoring 2.

| Color | Count in bag | End-game value per pearl | Initial draw probability |
|---|---:|---:|---:|
| Green | 17 | 1 | 17/65 = 26.15% |
| Blue | 15 | 2 | 15/65 = 23.08% |
| Pink | 13 | 3 | 13/65 = 20.00% |
| Purple | 11 | 4 | 11/65 = 16.92% |
| White | 9 | 5 | 9/65 = 13.85% |
| **Total** | **65** | — | **100%** |

Raw points across the full inventory total 175, for an initial random-pearl expected value of 175/65, about 2.69 points. This does not include Villager bonuses or the risk that a color has no open matching space.

## Pearl randomization and round loading

1. Shuffle all 65 pearls in one bag.
2. At each Preparation, draw exactly one pearl per active river from the bag, without replacement.
3. Place those pearls left to right in the active river source channels above the Floodgate.
4. The active channels are the leftmost three per player: 6, 9, or 12 channels for 2, 3, or 4 players.
5. The colors are public before players place Tribe tokens. The Floodgate physically holds the pearls back; it does not make their colors a hidden random event.
6. Do not return collected pearls to the bag. Pearls reaching the Lake remain there into later rounds if no token collects them.

Over five rounds, the game draws 30 pearls with two players, 45 with three, or 60 with four. Therefore, before accounting for any setup error, respectively 35, 20, or 5 pearls remain in the bag after the fifth draw. The four-player game never needs to refill the pearl bag.

The probability of the next color is its remaining count divided by the total remaining count. Drawing colors sequentially from a pre-shuffled 65-pearl list is equivalent to repeated uniform draws without replacement and supports replay from a seed.

## River flow and board topology

The rules describe 12 sloped river channels that combine into one Lake downstream. New pearls enter at the top of the active channels and travel downhill. The game has no die roll, spinner, random lane choice, or random transfer between rivers. Movement is determined by the fixed printed board geometry.

Tribe tokens are dams. When the Floodgate is removed, a pearl follows its channel until a token stops it. Once that token resolves, the player takes the allowed pearl(s), removes the token, and the remaining pearl(s) continue downstream to the next token or the Lake. If several pearls are stopped at one section, the owner chooses which to keep; the unchosen pearls continue. Pearls that reach the Lake share one collection area. Pearls left there remain for the next round.

For a digital model:

- Represent each printed river section as a node with one or more legal token slots.
- Give each section a stable row number, left-to-right ordering, within-section slot priority, Camp cost/reward, adjacent Fairy icons, and downstream connection(s).
- Add one shared Lake node after the river routes.
- When moving a pearl, follow the printed downstream connection. Do not assign random routes or let a pearl cross channels unless the physical board explicitly joins those channels at that point.
- Resolve tokens by the rules ordering: top row to bottom row, left to right within each row, and topmost slot before lower slots within one section.
- Remove a resolved token before continuing flow so later tokens can catch remaining pearls.
- Preserve the printed section order even when a physical marble happens to wobble or stack differently. Collision behavior is not a source of strategic randomness.

The text rulebook gives the row-resolution order and says the rivers combine into the Lake, but it does not publish a machine-readable coordinate/edge table or a text transcription of every slot. The application should digitize the exact sections and connections from a clear scan/photo of the 2025 board. Do not invent a channel graph from the landscape artwork.

### Placement cost bands

River section cost becomes cheaper downstream. The rules summarize the river costs as three, two, one, zero, then a final downstream reward of one Camp card. The physical board shows which individual section each band applies to. Village slots are separate: six total, with four free and two priority slots costing two and one Camp cards. The Lake has one free slot. The lake has 0 cost.

## Board placement capacity and collection order

- One Tribe token per slot; different slots in the same section can be occupied by different players.
- A section can stop multiple pearls; it does not automatically award all of them to a token.
- Within a multi-slot section, the topmost token resolves first.
- Across sections in the same row, resolve from left to right; then proceed to the next row downstream.
- As each token resolves, return it to the bottommost open turn-track space. Since tokens are inserted in this order, later-resolving tokens are higher on the track and act earlier in the next round.
- A River token collects one pearl by default. A Fishing Net pair or River Fairy can add one pearl for that collection. The Lake token can collect any or all Lake pearls.
- Alpaca capacity is six. A player can exchange a pearl already on the Alpaca with one caught at a river section; at the Lake, the player can exchange an equal number of Alpaca pearls for Lake pearls.
- Empty Alpaca space has strategic value. A pearl left on the Alpaca can support a goal temporarily but scores zero at game end.

## Camp-card system

The 2025 rulebook names five Camp-card types. All Camp cards can pay any placement cost. Two cards of the same type can be discarded as a pair for that type’s action.

| Type | Effect | Timing |
|---|---|---|
| Banner | After placing a Tribe token, move one of your other unplaced tokens to the top of the turn track | Exploration |
| Lantern | After placing a Tribe token, take one Fairy from anywhere on the board | Exploration |
| Provisions | After placing a Tribe token, move one of your other board tokens to another section without paying its Camp cost | Exploration |
| Fishing Nets | When collecting from a river section, take one additional pearl there | Collection |
| Shamisen | After recruiting a Villager, move the recruiting token to the next available Village slot to its right, enabling a later recruitment | Collection |

The component list confirms 50 Camp cards and the rules name these five types. The accessible rulebook text does **not** provide a copy count for each type. Do not assume ten copies of each without checking the physical deck or a complete component image.

### Camp draw and recycle behavior

At setup, shuffle all 50 cards, deal six to each player, and reveal three in the market. Thus the draw pile initially contains 35 cards with two players, 29 with three, or 23 with four, before any later market refill.

Whenever a player gains cards, the player chooses market cards or draws from the top of the deck. Replace each market card immediately. If all three market cards are the same type, shuffle those market cards and the discard pile into a new draw deck and reveal three cards.

The rulebook does not state a fully general empty-deck procedure. It is clear that discarded cards return through the stated market refresh; for implementation, see the explicit fallback in [rules.md](rules.md).

## Fairy system

There are 25 Fairy tokens in five types. For the app’s canonical component set, distribute them evenly: exactly five of each type. This equal distribution is a design requirement for this implementation; the consulted rulebook transcription confirms the total but does not establish the physical copy count by type. Each Fairy is kept by a player until used, then discarded from the game.

| Fairy | Count | Effect |
|---|---|
| Bonfire | 5 | Counts as one Camp card of any type, for a placement payment or as either half of a matching pair |
| Breeze | 5 | Move up to three pearls from the Alpaca or Villager tiles to other Villager tiles |
| Cloud | 5 | Ignore all Camp-card costs for one Tribe-token placement |
| Mushroom | 5 | Make one Villager pearl space wild |
| River | 5 | Collect one additional pearl from a river section when collecting there |

The app shuffles the full 25-token multiset and draws without replacement. Before any Fairy has been drawn, each type has probability 5/25 = 20%; after each draw, calculate the next probability from that type’s remaining count over the remaining supply.

At each Preparation, draw a number of Fairies equal to player count, reveal them, and place them on the active Fairy icons immediately left of the rivers. Use stump icons in rounds 1, 3, and 5, fox-statue icons in rounds 2 and 4. If an icon still has an unclaimed Fairy from a previous round, place the new Fairy alongside it. The supply is not replenished after Fairies are spent.

Five rounds place 10, 15, or 20 Fairies in 2-, 3-, or 4-player games. If no token is missing or lost, the Fairy supply therefore has 15, 10, or 5 tokens left after placement, respectively. Those counts describe the supply, not the number players will hold; used tokens leave the game.

## Villager tile structure and draw behavior

The 26 recruitable tiles are shuffled into one deck, and six are revealed for the initial display. When a new round begins, return the unclaimed face-up tiles face down to the bottom of the deck, then reveal up to six tiles. A tile is removed from the deck when recruited. Recruited tiles are not replaced during that Collection phase. The app should represent each tile as an instance of an editable Villager definition, rather than embedding ability behavior in rendering or turn code.

A Villager tile provides:

1. an illustrated character/animal portrait;
2. pearl storage sockets, each marked for a pearl color or marked rainbow/wild;
3. a Camp-card reward in the upper-left corner, paid immediately upon recruitment;
4. a printed end-game scoring condition.

Visually, the 2025 tiles are square punchboard pieces with a portrait above a row of recessed pearl sockets; the Camp reward is shown near the upper-left edge and the scoring formula/condition is along the bottom. The physical edition has four numbered starting tiles. For this app, all players instead receive identical copies of one Starting Villager definition as requested; number/order information is kept in separate setup metadata and cannot change the Villager’s sockets, reward, or ability.

Give every player the same Starting Villager definition and the same shared starting ability: score three points for each completely filled Villager tile, including the Starting Villager. Determine initial player order separately by shuffling virtual order labels 1 through P and assigning one to each player; ascending label order is the first Exploration order. This preserves a randomized first player without giving anyone a different starting tableau.

### Villager definition types

Use these editable definition types. The family describes what state is inspected; the individual scoring rule and parameters describe the effect. A definition can be edited or added without changing the game engine, provided its rule type is supported.

| Type / family | Definition | Inferred or confirmed examples |
|---|---|---|
| `starting` | The one common initial definition, cloned once per player. Its scoring ability is shared and rewards every full Villager tile. Keep its pearl sockets and Camp reward as editable fields. | `+3 points per completely filled Villager in own tableau` |
| `general_count` | Scores a count over the player’s whole tableau, hand, or unused-token area. Does not require this Villager to be full. | `+1 per Camp card in hand`; `+2 per unused Fairy`; `+2 per pearl on any Villager`; `+2 per white pearl on any Villager` |
| `general_majority` | Compares a named count across players. Award the configured points to a unique leader only; tied leaders receive zero. | `+5 unique most Camp cards`; `+6 unique most unused Fairies`; `+6 unique most pink pearls on Villagers` |
| `personal_threshold` | Checks a count or color condition on this Villager’s own sockets. | `+6 for four pearls of one color on this Villager` |
| `personal_pattern` | Checks an exact color pattern on this Villager; the required colors are data, not code. | `+8 for the depicted five-pearl pattern` |
| `personal_distinct_colors` | Counts distinct pearl colors on this Villager and compares against a threshold. | `+5 for five different colors on one Villager` |

The accessible rules provide examples of these scoring effects, but do not inventory all tile faces. Treat each example as an editable template. Do not assume the inferred templates are the complete set of 26 tiles or that every template occurs a particular number of times.

### Editable Villager data model

Store definitions separately from player-owned instances. At minimum, use fields equivalent to:

```yaml
id: starting_shared               # stable key; never use display name as a key
name: Starting Villager
kind: starting                     # starting | general_count | general_majority |
                                  # personal_threshold | personal_pattern | personal_distinct_colors
pearls: null                      # required socket list; fill from a chosen/transcribed starting tile
camp_reward: null                 # null = not applicable/unverified; do not treat as zero
score:
  rule: full_villagers             # rule identifier interpreted by scoring engine
  points: 3
  scope: own_tableau
source_status: inferred_template   # confirmed_text | inferred_template | transcribed_component
copies: null                       # null means not yet verified; do not guess physical frequency
```

An inferred general-count template might use `rule: points_per_count`, `metric: camp_cards_in_hand`, and `points: 1`. A majority template might use `rule: unique_majority`, `metric: unused_fairies`, and `points: 6`. A personal pattern template might use `rule: exact_socket_pattern`, `required_colors: [...]`, and `points: 8`. The values in `pearls`, `camp_reward`, `required_colors`, and `copies` are editable content. `null` marks information that has not been transcribed; it is not a playable socket layout or a zero-value reward. The game loader should reject a definition with unresolved required fields.

Use these stable IDs for the example Villager scoring templates. They capture the abilities shown in the rules examples, while deliberately leaving sockets, Camp reward, portrait, and physical copy count as content data to be filled or edited:

| ID | Kind | Rule and parameters | Points |
|---|---|---|---:|
| `score_camp_cards` | `general_count` | `points_per_count(metric=camp_cards_in_hand)` | 1 per card |
| `majority_camp_cards` | `general_majority` | `unique_majority(metric=camp_cards_in_hand)` | 5 |
| `score_unused_fairies` | `general_count` | `points_per_count(metric=unused_fairies)` | 2 per Fairy |
| `score_villager_pearls` | `general_count` | `points_per_count(metric=pearls_on_any_villager)` | 2 per pearl |
| `score_white_pearls` | `general_count` | `points_per_count(metric=white_pearls_on_villagers)` | 2 per white pearl |
| `majority_unused_fairies` | `general_majority` | `unique_majority(metric=unused_fairies)` | 6 |
| `majority_pink_pearls` | `general_majority` | `unique_majority(metric=pink_pearls_on_villagers)` | 6 |
| `four_matching_pearls` | `personal_threshold` | `same_color_count(tile=self, threshold=4)` | 6 |
| `depicted_five_pearl_pattern` | `personal_pattern` | `exact_socket_pattern(tile=self, pattern=configured_per_card)` | 8 |
| `five_distinct_colors` | `personal_distinct_colors` | `distinct_colors(tile=self, threshold=5)` | 5 |

The scores and metric descriptions above come from worked examples. They define reusable scoring behaviors, not verified physical tile names, artwork, socket sequences, or occurrence counts. A final content file can assign zero or more tile instances to each definition after component transcription or balance decisions.

The engine should validate definitions when loading them: known `kind` and `rule`, valid pearl colors or `any`, nonnegative reward and points, pattern length compatible with socket count, and majority tie behavior set to `unique_only`. Use `source_status` to distinguish sourced component data from inferred design content.

The rulebook describes two scoring families:

- **General collection:** counts resources or pearls across the player’s tableau and does not require filling that Villager. Examples include a point per Camp card in hand, points per unused Fairy, points per pearl stored on any Villager, points per white pearl across Villagers, or a no-tie bonus for having the most Camp cards, Fairies, or pink pearls.
- **Personal collection:** scores a specified pattern on that Villager and generally requires all of its pearl spaces to be filled. Examples shown include a same-color group, a specified multi-color pattern, or five different colors on one tile.

The rulebook’s example formulas include one point per Camp card in hand; five for a unique Camp-card majority; two per unused Fairy; two per pearl across the tableau; two per white pearl across the tableau; six for a unique unused-Fairy majority; six for a unique pink-pearl majority; six for four same-color pearls on one Villager; eight for an indicated five-pearl pattern on one Villager; and five for a five-color set on one Villager. “Unique” matters: ties do not score the majority bonus.

The printed scoring text is the authority for a physical tile. The accessible rulebook does not enumerate all 26 tile faces or report how many copies of each scoring condition, socket pattern, or Camp reward are in the deck. For exact component parity, transcribe each physical tile as a data row with a stable ID, socket colors, card reward, scoring formula, condition threshold, and tie rule. Until then, the app can use the editable inferred templates above, with unknown copy frequencies kept null rather than fabricated.

## Alpaca goals

All five Alpaca-goal cards are face up for the whole game. Each displays a required set of matching pearl colors on an Alpaca and is claimed once: the first player to meet the requirement takes the card and scores four points at game end. The qualifying pearls remain on the Alpaca until normally delivered to Villagers.

The English rulebook’s text explains the race and reward but does not give a text inventory of all five card thresholds. Transcribe each requirement from the card face into data. Do not infer thresholds by color count or from an unrelated edition.

## Randomness model for the app

Use independent seeded shuffled supplies so games can be replayed:

| Subsystem | Initial state | Random operation | Number consumed |
|---|---|---|---:|
| Pearls | Bag containing all 65 pearls | Uniform shuffle; draw from top without replacement | 3 × player count per round, five rounds |
| Fairies | 25 face-down tokens | Uniform shuffle; reveal and place a fixed number each round | Player count per round, five rounds |
| Recruitable Villagers | 26 face-down tiles | Uniform shuffle once; reveal six; return unclaimed tiles to deck bottom at round refresh | At most six displayed per refresh; recruited tiles leave the deck |
| Camp cards | 50 cards | Uniform shuffle; initial deal; reveal/replace market selections | Player choices plus setup |
| Alpaca goals | Five fixed cards | No shuffle | Zero; all five start face up |
| Starting-player order | Virtual labels numbered 1 through P | Shuffle and assign labels; ascending labels set opening order | One assignment per player; this does not change Villager content |

Separate PRNG streams (or record each shuffled order) for pearl, Fairy, Villager, Camp, and starting-order assignment. The shared Starting Villager definition is cloned deterministically and is not shuffled. This prevents a code change in one subsystem from changing every other random result in a replay.

Random events in the app are the shuffled pearl draw, Fairy draw/order from a 5-each supply, Villager deck order, Camp deck order/initial hand, and assignment of starting-player order markers. Placement, river travel, slot resolution, card costs, scoring, and pearl color values are deterministic.

## Component data gaps to resolve from a physical copy

The rules and indexed component list establish game structure and totals, but not every card face’s data. Before treating a digital version as a fully content-faithful implementation, transcribe and validate:

- copies of each Camp-card type among the 50 cards;
- whether the physical box also contains exactly five copies of each Fairy type (the app distribution is fixed at five each);
- the shared Starting Villager’s socket layout and Camp reward, if the physical edition is being transcribed. The app uses one identical editable definition for every player;
- all 26 Villager tiles’ socket layout, recruitment reward, scoring formula, and ability frequency;
- all five Alpaca-goal card thresholds;
- a coordinate-level map of river sections, slots, Fairy icons, costs, and downstream connectivity from the 2025 board.

These are content-table gaps, not extra random rules. The code should load them as data and should not hard-code estimated frequencies.

