import { actor, catchablePearls, createGame, reduceGame, type Action, type Game } from '../src/game'
import { chooseBotAction } from '../src/bot'
import { makePresentation, scenePearls } from '../src/presentation'

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message) }
const setup = (count = 2) => createGame({ names: Array.from({ length: count }, (_, i) => `Player ${i + 1}`), bots: Array(count).fill(true), seed: 19 })
const colorSignature = (colors: string[]) => colors.sort().join(',')

const population = setup(4)
const initial = makePresentation(population, population, 1, undefined, true)!
assert(initial.kind === 'populate' && initial.moves.length === 12, 'All twelve source pearls must be populated')
assert(initial.moves.every((move, index) => move.arrive && (!index || move.delay > initial.moves[index - 1].delay)), 'Source pearls must arrive individually')
assert(initial.duration >= Math.max(...initial.moves.map(move => move.delay + move.duration)), 'The turn must wait for the last arrival')

function collectionFixture(): Game {
  const game = setup()
  game.phase = 'collect'; game.pendingDraws = null; game.track = []; game.collectIndex = 0
  game.riverPearls = [['green', 'blue'], ['purple'], [], [], [], []]; game.lakePearls = []
  const first = game.slots.find(slot => slot.section === 'r1g0' && slot.priority === 0)!
  const second = game.slots.find(slot => slot.section === 'r2g0' && slot.priority === 0)!
  first.player = 0; second.player = 1; game.collectQueue = [first.id, second.id]
  return game
}
const fixture = collectionFixture(), serialized = JSON.stringify(fixture)
const collected = reduceGame(fixture, { type: 'collect', pearlIndex: 2 })
const capture = makePresentation(fixture, collected, 2, { type: 'collect', pearlIndex: 2 })!
assert(capture.caught?.pearl.color === 'purple' && capture.caught.pearl.lane === 1, 'Flattened pearl choices must track their actual source lane')
assert(capture.removedMarkers.length === 1, 'Collection must lift the resolved marker')
assert(capture.moves.filter(move => !move.disappear).every(move => move.to.y > move.pearl.point.y), 'Remaining pearls must travel to the next occupied section')
assert(JSON.stringify(fixture) === serialized, 'Building an animation must not mutate the rules state')

const unblocked = collectionFixture(); unblocked.riverPearls[5] = ['pink']
assert(scenePearls(unblocked).find(pearl => pearl.lane === 5)!.atLake, 'Pearls with no downstream marker must flow to the Lake while other sections collect')
const closedGates = structuredClone(unblocked); closedGates.phase = 'explore'
const opening = makePresentation(closedGates, unblocked, 22, { type: 'endTurn' })!
assert(opening.moves.some(move => move.pearl.lane === 5 && move.to.y >= 598 && move.route.length > 50), 'Unblocked pearls must follow the entire river path from source to Lake')

const extraFixture = collectionFixture(); extraFixture.players[0].fairies.push('River')
const extraAction: Action = { type: 'collect', pearlIndex: 0, extra: 'river' }
const withExtra = reduceGame(extraFixture, extraAction)
assert(makePresentation(extraFixture, withExtra, 3, extraAction)!.removedMarkers.length === 0, 'Extra collection must retain the marker until the second choice')

const fullFixture = collectionFixture(); fullFixture.players[0].alpaca = ['white', 'white', 'pink', 'pink', 'blue', 'blue']
const exchangeAction: Action = { type: 'collect', pearlIndex: 2, swapIndex: 0 }
const exchanged = reduceGame(fullFixture, exchangeAction), exchange = makePresentation(fullFixture, exchanged, 4, exchangeAction)!
assert(exchange.caught?.exchanged === 'white' && exchange.caught.socket === 5, 'A full llama must return the chosen pearl and receive the new pearl in its final slot')
assert(exchange.moves.some(move => move.pearl.color === 'white' && move.arrive), 'The exchanged pearl must return to the river')

const lakeFixture = setup(); lakeFixture.phase = 'lake'; lakeFixture.riverPearls = lakeFixture.riverPearls.map(() => []); lakeFixture.lakePearls = Array(65).fill('green')
const lakePoints = scenePearls(lakeFixture).map(pearl => `${pearl.point.x},${pearl.point.y}`)
assert(new Set(lakePoints).size === 65, 'Every Lake pearl needs its own visible seat')

let checked = 0
for (const count of [2, 3, 4]) for (let seed = 1; seed <= 4; seed++) {
  let game = createGame({ names: Array.from({ length: count }, (_, i) => `Bot ${i}`), bots: Array(count).fill(true), seed })
  let turns = 0
  while (game.phase !== 'finished' && turns++ < 2000) {
    const action = chooseBotAction(game)
    assert(action, 'A bot action must exist before the game ends')
    const next = reduceGame(game, action), sequence = makePresentation(game, next, turns, action)
    if (sequence) {
      const visible = sequence.moves.filter(move => !move.disappear)
      assert(colorSignature(visible.map(move => move.pearl.color)) === colorSignature(scenePearls(next).map(pearl => pearl.color)), 'Animation must conserve the resulting board pearls')
      assert(new Set(sequence.moves.map(move => move.pearl.id)).size === sequence.moves.length, 'Animated pearls must have distinct identities')
      assert(sequence.moves.every(move => move.route.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))), 'Every route must have valid coordinates')
      assert(sequence.duration >= Math.max(...sequence.moves.map(move => move.delay + move.duration)), 'Sequence must wait for all pearl movements')
      if (sequence.caught) {
        const who = actor(game)!
        const colors = game.phase === 'lake' ? game.lakePearls : catchablePearls(game, game.slots.find(slot => slot.id === game.collectQueue[game.collectIndex])!)
        assert(action.type === 'collect' && sequence.caught.pearl.color === colors[action.pearlIndex], `The captured color must match the selected pearl for player ${who}`)
      }
      checked++
    }
    game = next
  }
  assert(game.phase === 'finished', 'Presentation must support complete games for every player count')
}
console.log(`Presentation checks passed: ${checked} sequences across 12 complete games, plus arrival, exchange, extra collection and Lake capacity checks.`)
