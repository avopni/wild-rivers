import { actor, catchablePearls, createGame, reduceGame, type Action, type Game } from '../src/game'
import { chooseBotAction } from '../src/bot'
import { advancePresentation, laneX, makePresentation, preparationGame, preparationStep, scenePearls, sectionX } from '../src/presentation'
import { boardLayout } from '../src/boardLayout'
import { restorePreparation, savePreparation } from '../src/preparationStorage'

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message) }
const setup = (count = 2) => createGame({ names: Array.from({ length: count }, (_, i) => `Player ${i + 1}`), bots: Array(count).fill(true), seed: 19 })
const colorSignature = (colors: string[]) => colors.sort().join(',')
for (const count of [2, 3, 4]) {
  const channels = count * 3, layout = boardLayout(count), lanes = Array.from({ length: channels }, (_, i) => i)
  assert(layout.sourceX.length === channels, 'A complete board must have exactly its active source count')
  assert(laneX(channels - 1, channels) - laneX(0, channels) >= 1100, 'Every player-count board must fill the playing width')
  assert(sectionX(lanes, channels) === 770, 'The final river section must be centered over the Lake for every player count')
  assert(Math.abs((laneX(0, channels) + laneX(channels - 1, channels)) / 2 - 770) < .01, 'Active sources must be centered, not clipped to the left')
}
assert(new Set([2, 3, 4].map(count => boardLayout(count).background)).size === 3, 'Each player count must use its own board image')

const population = setup(4)
const initial = makePresentation(population, population, 1, undefined, true)!
assert(initial.kind === 'populate' && initial.moves.length === 12, 'All twelve source pearls must be populated')
assert(initial.moves.every((move, index) => move.arrive && (!index || move.delay > initial.moves[index - 1].delay)), 'Source pearls must arrive individually')
assert(initial.preparation!.steps.find(step => step.kind === 'pearls')!.duration >= Math.max(...initial.moves.map(move => move.delay + move.duration)), 'Pearl stage must wait for the last arrival')
assert(initial.preparation!.steps.filter(step => step.kind === 'read').length === 4, 'Every drawn faerie must require an acknowledgement')
assert(initial.preparation!.steps.some(step => step.kind === 'review'), 'The complete villager reveal must wait for Continue')
const preparedJSON = JSON.stringify(population)
let sequence = initial
while (preparationStep(sequence)?.kind !== 'read') sequence = advancePresentation(sequence)!
assert(preparationGame(sequence).track.length === 0, 'Prepared order stays hidden until its presentation stage')
assert(preparationGame(sequence).fairySites.every(site => site.fairies.length === 0), 'A faerie cannot be placed before acknowledgement')
const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key) } })
savePreparation(population, sequence)
const resumed = restorePreparation(population, 100)!
assert(preparationStep(resumed)?.kind === 'read' && preparationStep(resumed)?.fairy === preparationStep(sequence)?.fairy, 'Resume must preserve the pending faerie explanation')
assert(resumed.preparation!.index === sequence.preparation!.index, 'Resume must retain acknowledgement progress')
assert(JSON.stringify(population) === preparedJSON, 'Acknowledgement and persistence must not alter a prepared game')
const placed = advancePresentation(sequence)!
assert(preparationGame(placed).fairySites.flatMap(site => site.fairies).length === 1, 'OK must place only the acknowledged faerie')
savePreparation(population, null)
assert(restorePreparation(population, 101) === null, 'Completed preparation must not replay on resume')

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
const inletRoute = opening.moves.find(move => move.pearl.lane === 5)!.route.filter(point => point.y >= 692 && point.y <= 730)
assert(inletRoute.length > 10 && inletRoute.every(point => Math.abs(point.x - 770) < .001), 'Two-player pearl movement must follow a straight centered Lake inlet')

const extraFixture = collectionFixture(); extraFixture.players[0].fairies.push('Dewdrop')
const extraAction: Action = { type: 'collect', pearlIndex: 0, extra: 'dewdrop' }
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
      assert((sequence.preparation?.steps.find(step => step.kind === 'pearls')?.duration ?? sequence.duration) >= Math.max(...sequence.moves.map(move => move.delay + move.duration)), 'Sequence must wait for all pearl movements')
      if (sequence.preparation) {
        const newlyDrawn = next.fairySites.reduce((total, site) => total + site.fairies.length - game.fairySites.find(old => old.id === site.id)!.fairies.length, 0)
        assert(sequence.preparation.steps.filter(step => step.kind === 'read').length === newlyDrawn, 'Later rounds explain only newly drawn faeries')
        let stage = sequence
        while (preparationStep(stage)?.kind !== 'track') stage = advancePresentation(stage)!
        const visible = preparationGame(stage)
        assert(JSON.stringify(visible.track) === JSON.stringify(next.track), 'Animation must retain the prepared order after Collection')
        assert(JSON.stringify(visible.fairySites) === JSON.stringify(next.fairySites), 'Unclaimed faeries must survive preparation')
        assert(JSON.stringify(visible.display) === JSON.stringify(next.display), 'Settlement must use the actual market identities')
      }
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
