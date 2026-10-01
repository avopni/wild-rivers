import { campTypes, fairyTypes, CONTENT_VERSION, createGame, reduceGame, score, type Game } from '../src/game'
import { upgradeGameContent } from '../src/contentMigration'
import { restorePreparation } from '../src/preparationStorage'
import { makePresentation, preparationStep } from '../src/presentation'

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message) }
const setup = () => createGame({ names: ['Child', 'Companion'], bots: [false, false], seed: 19 })
const collect = () => {
  const game = setup()
  game.phase = 'collect'; game.pendingDraws = null
  const slot = game.slots.find(slot => slot.section === 'r0g0')!
  slot.player = 0; game.collectQueue = [slot.id]; game.collectIndex = 0; game.riverPearls[0] = ['green', 'blue']
  return game
}
const moonveil = setup(); moonveil.players[0].hand = []; moonveil.players[0].fairies = ['Moonveil']; moonveil.track[0] = 0
const waived = reduceGame(moonveil, { type: 'place', slot: 'r0g0p0', moonveil: true })
assert(waived.slots[0].player === 0 && !waived.players[0].fairies.length, 'Moonveil must waive placement costs and be consumed')
const emberglow = setup(); emberglow.track[0] = 0; emberglow.players[0].hand = ['Trail Pennant']; emberglow.players[0].fairies = ['Emberglow']; emberglow.afterPlace = true
const advanced = reduceGame(emberglow, { type: 'pair', card: 'Trail Pennant' })
assert(advanced.track[1] === 0 && !advanced.players[0].fairies.length && advanced.players[0].hand.length === 0, 'Emberglow must substitute for a matching card')
const lamp = setup(); lamp.track[0] = 0; lamp.afterPlace = true; lamp.players[0].hand = ['Glowstone Lamp', 'Glowstone Lamp']
const site = lamp.fairySites.find(site => site.fairies.length)!, taken = site.fairies[0]
assert(reduceGame(lamp, { type: 'pair', card: 'Glowstone Lamp', target: site.id }).players[0].fairies.includes(taken), 'Glowstone Lamp must take a board faerie')
const basket = setup(); basket.track[0] = 0; basket.afterPlace = true; basket.players[0].hand = ['Wonder Basket', 'Wonder Basket']; basket.slots[0].player = 0
const moved = reduceGame(basket, { type: 'pair', card: 'Wonder Basket', target: `${basket.slots[0].id}>${basket.slots[1].id}` })
assert(moved.slots[0].player === null && moved.slots[1].player === 0, 'Wonder Basket must move an owned token')
for (const extra of ['pearlNet', 'dewdrop'] as const) {
  const game = collect(); game.players[0].hand = ['Pearl Net', 'Pearl Net']; game.players[0].fairies = ['Dewdrop']
  const first = reduceGame(game, { type: 'collect', pearlIndex: 0, extra })
  assert(first.pendingExtra && first.players[0].alpaca.length === 1, `${extra} must leave the token for another pearl`)
  const second = reduceGame(first, { type: 'collect', pearlIndex: 0 })
  assert(!second.pendingExtra && second.players[0].alpaca.join() === 'green,blue', `${extra} must collect exactly two pearls`)
}
const song = setup(); song.phase = 'recruit'; song.pendingDraws = null; song.recruitedThisSlot = true
song.recruitQueue = ['village0']; song.recruitIndex = 0; song.slots.find(slot => slot.id === 'village0')!.player = 0; song.players[0].hand = ['Whisperstrings', 'Whisperstrings']
const visited = reduceGame(song, { type: 'whisperstrings' })
assert(visited.slots.find(slot => slot.id === 'village1')!.player === 0 && visited.recruitIndex === 1, 'Whisperstrings must enable recruitment at a later Village slot')

// Hex fixtures preserve the historical wire format without reintroducing retired labels.
const decode = (hex: string) => Buffer.from(hex, 'hex').toString('utf8')
const oldCamp = ['42616e6e6572', '4c616e7465726e', '50726f766973696f6e73', '46697368696e67204e657473', '5368616d6973656e'].map(decode)
const oldFairies = ['426f6e66697265', '427265657a65', '436c6f7564', '4d757368726f6f6d', '5269766572'].map(decode)
const oldAction = decode('627265657a65'), oldField = decode('627265657a654c656674')
const legacy = setup() as Game & Record<string, unknown>
legacy.rulesVersion = 'prototype-2025.4'
legacy.players[0].name = oldFairies[2] // Personal names must survive the conversion.
legacy.players[0].hand = oldCamp as Game['campDeck']; legacy.players[0].fairies = oldFairies as Game['fairyDeck']
legacy.campDeck = [...oldCamp] as Game['campDeck']; legacy.campDiscard = [...oldCamp] as Game['campDeck']; legacy.market = [...oldCamp] as Game['campDeck']
legacy.fairyDeck = [...oldFairies] as Game['fairyDeck']; legacy.fairySites[0].fairies = [...oldFairies] as Game['fairyDeck']
legacy[oldField] = 2; delete legacy.zephyrLeft
legacy.phase = 'deliver'; legacy.deliverPlayer = 0; legacy.pendingDraws = null
legacy.event = `Child used ${oldFairies[1]} and a ${oldCamp[1]} pair.`
legacy.log = [{ action: oldAction, player: 0, detail: `Child used ${oldFairies[1]}.`, decision: { summary: `Take one with ${oldFairies[4]} Fairy and a ${oldCamp[3]} pair.`, estimate: 1, factors: [{ label: `a ${oldCamp[0]} pair`, value: 1 }], assumptions: [`Keep ${oldFairies[3]}.`], policy: 'fixture' } }]
const { history: _history, ...before } = legacy; legacy.history = [structuredClone(before), structuredClone(before)]
const sourceJSON = JSON.stringify(legacy), upgraded = upgradeGameContent(legacy)
assert(JSON.stringify(legacy) === sourceJSON, 'Migration must preserve the source export')
assert(upgraded.rulesVersion === CONTENT_VERSION && upgraded.history.every(snapshot => snapshot.rulesVersion === CONTENT_VERSION), 'Every snapshot must use the current content version')
assert(upgraded.players[0].hand.join('|') === campTypes.join('|') && upgraded.players[0].fairies.join('|') === fairyTypes.join('|'), 'All owned enums must migrate in order')
assert(upgraded.campDeck.join() === campTypes.join() && upgraded.campDiscard.join() === campTypes.join() && upgraded.market.join() === campTypes.join(), 'Every Camp pile must migrate')
assert(upgraded.fairyDeck.join() === fairyTypes.join() && upgraded.fairySites[0].fairies.join() === fairyTypes.join(), 'Deck and board faeries must migrate')
assert(upgraded.players[0].name === oldFairies[2], 'Player names must be preserved')
assert(upgraded.zephyrLeft === 2 && !(oldField in upgraded), 'An active Zephyr effect must survive migration')
assert(upgraded.log[0].action === 'zephyr' && upgraded.log[0].decision?.summary === 'Take one with Dewdrop Fairy and a Pearl Net pair.', 'Action logs and coach explanations must use the new names')
assert(upgraded.event === 'Child used Zephyr and a Glowstone Lamp pair.', 'Saved event text must migrate')
assert(score(upgraded, 0).total === score(legacy, 0).total && JSON.stringify(upgraded.slots) === JSON.stringify(legacy.slots), 'Migration must preserve scores and placements')
assert(upgradeGameContent(upgraded) === upgraded, 'Current records must remain stable')
assert(reduceGame(upgraded, { type: 'undoDelivery' }).zephyrLeft === 2, 'Migrated undo history must remain usable')
assert(upgradeGameContent({ ...legacy, rulesVersion: 'unrelated-rules' }).rulesVersion === 'unrelated-rules', 'Unrelated rules versions must not be relabelled')

const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) } })
const pending = { ...legacy, phase: 'explore' as const }, prepared = upgradeGameContent(pending)
const preparation = makePresentation(prepared, prepared, 1, undefined, true)!
const index = preparation.preparation!.steps.findIndex(step => step.kind === 'read')
storage.set(`rivers-preparation-${prepared.id}`, JSON.stringify({ round: pending.round, logLength: pending.log.length, before: pending, index }))
const restored = restorePreparation(prepared, 2)
assert(restored && preparationStep(restored)?.kind === 'read' && fairyTypes.includes(preparationStep(restored)!.fairy!), 'Pending faerie acknowledgement must resume with the renamed token')
console.log('Content checks passed: ten powers and legacy save, replay, undo, log and setup migration.')
