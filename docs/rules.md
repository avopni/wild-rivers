# Wild Rivers — Rules for a Digital Implementation

## Rules scope

This document describes the Wild Rivers prototype rules. The implemented content and rules version are defined in `src/game.ts`.

The 2025 game is for 2–4 players and lasts five rounds. Players place three Tribe tokens per round, collect pearls, recruit Villagers, and score the pearls stored on Villager tiles plus tile and Alpaca-goal bonuses.

## Components and terms

- **River board:** a sloped board with 12 river channels, placement sections along the channels, one shared Lake at the bottom, a six-slot Village area, and a turn track.
- **Pearls:** 65 colored pieces drawn from a bag.
- **Tribe tokens:** three per player; each token is placed once per round.
- **Alpaca board:** a personal temporary holding area with six pearl spaces.
- **Villager tiles:** one identical starting Villager instance per player and 26 recruitable tiles. A tile provides pearl spaces, a scoring ability, and a Camp-card reward shown on the tile.
- **Camp cards:** a 50-card deck. Cards are both a spendable currency and, when played as a matching pair, a special action.
- **Fairy tokens:** 25 single-use tokens: five each of Bonfire, Breeze, Cloud, Mushroom, and River.
- **Alpaca goals:** five public, one-time race objectives worth four points each.
- **Floodgate:** holds the new round’s pearls at the river sources until Collection.

“Upstream” means closer to the top of the board and the unreleased pearls. “Downstream” means closer to the Lake. A “section” is a marked placement area on the river board. Some sections have several distinct token slots; a slot can hold at most one Tribe token.

## Game setup

1. Assemble the board with its river area sloping toward the players, the Lake at the bottom, and the Village flat on the table. Insert the stabilizers and place the Floodgate in the groove at the top of the rivers.
2. Put all 65 pearls in the drawstring bag.
3. Shuffle the Fairy tokens face down. Put the Fairy reference boards where all players can see them.
4. Put all five Alpaca-goal cards face up beside the board. All five are used in this edition.
5. Create one copy of the shared Starting Villager definition for each player. Every player starts with the same tile data. Starting a tile is not a recruitment, so it does not trigger a Camp-card reward. Shuffle the 26 recruitable tiles and make a face-down deck below the Village. Reveal six tiles face up as the initial Villager display.
6. Determine a separate initial player order by randomly assigning virtual order labels 1 through P to players; the lowest label goes first. Starting Villager definitions do not set turn order. Each player places their identical starting Villager in their play area.
7. Each player takes one Alpaca board and three Tribe tokens of one color.
8. Put Tribe tokens on the turn track in round-robin order: player 1 puts one token in the top space, then player 2, and so on; repeat until each player has placed all three tokens. The resulting track order determines the first Exploration turns.
9. Shuffle the 50 Camp cards. Deal six to each player. Place the remaining cards face down as the Camp deck, then reveal three cards beside it as the Camp market.

## Game structure

Play five rounds. Each round has three phases in this order:

1. Preparation
2. Exploration
3. Collection

After the fifth Collection phase, score the game.

## Preparation phase

### Fill the active rivers

Put the Floodgate across the river sources. Use the leftmost three rivers per player: six rivers with two players, nine with three, and all twelve with four. Draw one pearl from the bag for each active river and place one above the gate in each river, proceeding left to right. These colors are public information before Exploration. The bag is sampled without replacement; drawn pearls do not return to it.

### Place this round’s Fairies

Draw a number of face-down Fairies equal to the number of players, reveal them, and place them on the Fairy icons immediately left of active river sections:

- Rounds 1, 3, and 5 use the stump icons.
- Rounds 2 and 4 use the fox-statue icons.

Use the icons from left to right among those belonging to active rivers. If an icon already has an unclaimed Fairy from an earlier round, add the new token beside it; do not remove the old one.

### Refresh the Villager display

At the start of rounds 2–5, return every unclaimed tile in the face-up display face down to the bottom of the Villager deck, then reveal up to six new tiles. Recruited tiles stay in their owners’ play areas. Do not refill spaces in the display when a Villager is recruited during Collection.

## Exploration phase

Players act in the order of the Tribe tokens currently on the turn track. On a turn, take your topmost remaining token from the track and place it in any empty legal board slot: a river section, the Lake, or one of the six Village slots. Continue until every player has placed all three tokens.

### River placement costs and rewards

Pay or gain Camp cards according to the printed cost for the destination section. The river costs progress from three cards at the highest/upstream section, then two, one, and zero, to a downstream section that gives the player one Camp card. Use the cost printed beside the actual section if the board’s markings differ from this shorthand.

Cards paid for a placement may be of any type. Discard them to the Camp-card discard pile. A player may hold any number of Camp cards.

When a Tribe token is placed in a river section with one or more Fairy tokens immediately to its left, take all those Fairies into your play area. A Fairy left from a previous round can be collected the same way.

### Lake placement

The Lake has one Tribe-token slot and costs no Camp cards. It is resolved after the river sections. A player there may collect some or all pearls that reach the Lake.

### Village placement

The Village has six slots across three sections. Four slots are free; the two leftmost/priority slots cost Camp cards as printed (two cards for the first slot, one for the next). A Village token lets its owner recruit a Villager during Collection. Earlier Village slots resolve first and therefore get first choice from the face-up display.

### Gain Camp cards

When a placement or Villager reward gives Camp cards, for each card gained choose either:

- a face-up card in the three-card market, immediately replacing it from the Camp deck; or
- the top card of the Camp deck.

If all three cards in the market show the same Camp-card type, shuffle those three cards together with the Camp discard pile to make a new deck, then reveal three new market cards. A card taken from the market is replaced before the next card is chosen. This rule can apply while taking multiple cards.

### Matching Camp-card pairs

After placing a Tribe token and paying or gaining its cards, the active player may discard any number of matching pairs from their hand. Each pair resolves its ability once. Pair abilities do not pay placement costs. A card can be used either as a payment or as part of a pair, not both.

**Exploration-phase pairs**

- **Banner:** after placing a Tribe token, move one of your other unplaced Tribe tokens to the top of the turn track. This changes which token acts next in Exploration and changes the order in which tokens are placed on the track after Collection.
- **Lantern:** after placing a Tribe token, take one Fairy token from anywhere on the board into your play area.
- **Provisions:** after placing a Tribe token, move one of your other Tribe tokens already on the board from its current section to another legal empty slot/section. The moved token does not pay the destination’s Camp-card cost. The card says “move,” not “place”; the normal placement trigger for collecting adjacent Fairies is not repeated by the move.

Players may play multiple pairs after one placement, in any order, if they can pay each pair.

## Collection phase

Resolve these steps in order.

### 1. Release the pearls

Remove the Floodgate. Pearls roll down their channels and are stopped by Tribe tokens. The physical roll represents the fixed river paths; it is not a die roll or a new random draw.

### 2. Resolve river sections and collect pearls

Resolve the river board from the top row to the bottom row. Within each row, resolve sections from left to right. If several Tribe tokens occupy distinct slots in the same section, resolve the topmost slot first, then the lower slots.

When a token’s section is resolved:

1. If one or more pearls are stopped there, its owner chooses one and moves it to their Alpaca. Each Fishing Net pair or River Fairy used at that collection can give one additional pearl from that same river section, subject to the pearls available there.
2. If the Alpaca already holds six pearls, the player may exchange a pearl on the Alpaca for a pearl stopped at that section instead of adding a seventh pearl. For an extra pearl, continue to use an available Alpaca space or make an allowed exchange.
3. Check the public Alpaca goals whenever the player’s Alpaca meets an unclaimed goal requirement. The first player to meet a goal takes that card, flips it to its four-point side, and keeps it. Keep the qualifying pearls on the Alpaca for now; they may be delivered to Villagers later.
4. Remove the Tribe token so any unclaimed pearls continue downstream to the next token or the Lake. Put the token on the lowest currently empty position of the turn track.

Repeat through all river sections. A token with no pearl at its section is still removed and returned to the turn track when its section is resolved.

### 3. Resolve the Lake

If a Tribe token is at the Lake, its owner may take any or all pearls there, placing them on the Alpaca. The player may leave pearls behind. If the Alpaca is full, the player may swap any number of pearls on the Alpaca for an equal number of pearls from the Lake. Check Alpaca goals after collecting. Return the Lake token to the lowest empty turn-track position.

If no Tribe token is at the Lake, all pearls there remain for later rounds.

### 4. Recruit Villagers

After every river and Lake token has been resolved, scan the Village from its leftmost slot to its rightmost slot. Whenever a slot contains a Tribe token, that token’s owner chooses one of the face-up Villager tiles, adds it to their play area, and immediately takes the number of Camp cards shown in the tile’s upper-left corner. Take those cards from the market or deck using the normal card-gain rules. Do not refill the Villager display yet. Return the Tribe token to the lowest empty turn-track position.

**Shamisen pair:** during Collection, after recruiting a Villager, move the recruiting Tribe token to the next available Village slot to its right. This can enable another recruitment later in the left-to-right Village scan. Each Shamisen pair may be used once after a recruitment; it is not an additional Camp-card cost.

### 5. Deliver pearls to Villagers

After recruitment, players may simultaneously move any number of pearls from their Alpaca to open spaces on their Villager tiles:

- A pearl must match the color printed around its Villager space.
- A rainbow/multicolor space accepts any pearl.
- A pearl on a Villager stays there for the rest of the game, except when moved by a Breeze Fairy.
- Players do not have to move every pearl from their Alpaca. Alpaca capacity remains six, so pearls left there occupy space for the next round and do not score at game end.

## Fairy abilities

Fairies are single-use. To use one, discard it from the game after applying its effect. Keep unused Fairies in the player area; some Villager tiles score them.

- **Bonfire:** counts as one Camp card of any type. It may pay one card of a placement cost or substitute for either card in a matching pair.
- **Breeze:** move up to three pearls from your Alpaca or Villager tile(s) to other Villager tile(s). It can clear Alpaca space or rearrange pearls between Villagers. It cannot move a pearl back from a Villager to the Alpaca.
- **Cloud:** ignore all Camp-card costs for one Tribe-token placement.
- **Mushroom:** make one Villager pearl space wild so it can hold any pearl color. The text does not give a duration. For a digital implementation, treat the space as wild for the rest of the game after using the Fairy; this is the interpretation that preserves the “make a space wild” effect after the token is discarded.
- **River:** when collecting a pearl from a river section, collect one additional pearl from that same section, if available.

## Scoring after round five

Add the following:

1. **Pearls on Villagers:** score every pearl stored on a Villager tile by its color:

   | Pearl color | Points |
   |---|---:|
   | Green | 1 |
   | Blue | 2 |
   | Pink | 3 |
   | Purple | 4 |
   | White | 5 |

2. **Starting Villager bonus:** score three points for each Villager tile in your play area that is completely filled with pearls, counting the starting Villager.
3. **Other Villager abilities:** score each tile’s printed ability. A general-collection ability scores even when that tile is not full. A personal-collection ability that specifies a completed tile or arrangement scores only if that requirement is met. “Most” abilities award points only to a player with an absolute lead; tied players receive zero for that ability.
4. **Alpaca goals:** score four points for each goal card claimed during the game.

Pearls remaining on Alpacas are worth zero. Unused Camp cards and Fairies are worth zero unless a Villager ability awards points for them. The highest total wins; tied players share the victory.

## Villager ability families and examples

Villager tiles provide colored pearl spaces, a Camp-card reward on recruitment, and one end-game ability. Each player receives an identical copy of the Starting Villager definition. The recruitable pool uses editable definitions described in [physics.md](physics.md); its inferred ability templates are implementation examples, not a claim that every physical tile has been inventoried.

The ability families are:

- **Starting ability:** three points for each completely filled Villager tile in the player’s tableau, including the Starting Villager itself.
- **General-collection abilities:** score based on tableau-wide counts or other collected resources and do not require filling the Villager carrying that ability. Examples include points per Camp card, unused Fairy, Villager pearl, or white pearl, and unique-leader bonuses for Camp cards, unused Fairies, or pink pearls.
- **Personal-collection abilities:** score for a pearl color or arrangement on the specific Villager carrying that ability. Examples include a same-color group, a depicted five-pearl pattern, or five different colors on one tile.

Examples shown in the rulebook include points for each Camp card left in hand; a bonus for having the most Camp cards; points for unused Fairies; points per pearl or per white pearl across the Villagers; a bonus for having the most pink pearls; and bonuses for filling a particular color set, a specified color pattern, or a five-color set on one tile. The physical tile face is the source of truth for an individual tile’s sockets, reward, and exact condition. The rulebook does not provide a text inventory or per-ability frequency table.

The editable inferred templates include: one point per Camp card left in hand; five points for a unique lead in Camp cards; two points per unused Fairy; two points per pearl on any Villager; two points per white pearl on any Villager; six points for a unique lead in unused Fairies; six points for a unique lead in pink pearls on Villagers; six points for four same-color pearls on a specified Villager; eight points for the indicated five pearls on a specified Villager; and five points for five different colors on one Villager. Ties for “most” award zero. The exact socket arrangement and physical frequency of each recruitable definition remain configurable data.

## Rules text that needs a component-level decision

These are bounded ambiguities in the published text. The preceding rules give explicit digital interpretations so the application can proceed:

- **Villager market exhaustion:** reveal up to six tiles. If the recruitable deck and face-up unclaimed tiles are exhausted, no further Villager can be recruited.
- **Camp deck exhaustion:** the rules describe recycling the discard pile when the market reaches three identical cards, but do not clearly state what to do if a draw is requested while the deck is empty and that condition has not occurred. Recommended implementation: shuffle the Camp discard pile into a new deck whenever a draw is required and the deck is empty; if both are empty, the player gains no card.
- **Shamisen chaining:** the card text says the token moves to a later Village slot so it can recruit again “later.” Resolve it again only if the moved token is in a slot that has not yet been scanned in the current left-to-right Village pass.
- **Mushroom duration:** apply the wild-space change permanently for the rest of the game, as stated above.
- **Geometry:** the rules prescribe row-by-row, left-to-right collection but do not publish a coordinate/edge table for software. Encode the actual printed board’s sections and their downstream connections as data; do not infer those connections from artwork alone.
- **Empty river slots during Collection:** the rules explain what happens when a token catches pearls but do not separately spell out an empty catch. Return a token with no pearl when its section is resolved, so every placed token resets for the next round.

