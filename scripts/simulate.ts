import { canUndoDelivery, catchablePearls, createGame, makeRiverSections, makeSlots, pearlPoints, reduceGame, score, type Game } from '../src/game'
import { chooseBotAction } from '../src/bot'

const twoPlayerSections = makeRiverSections()
const expectedSections = [12, 7, 4, 2, 1]
const expectedCapacities = [1, 2, 3, 4, 5]
for (let row = 0; row < 5; row++) {
  const sections = twoPlayerSections.filter(section => section.row === row)
  if (sections.length !== expectedSections[row] || sections.some(section => section.capacity !== expectedCapacities[row])) throw new Error(`Incorrect two-player tier ${row}`)
}
const expectedMerges = [
  ['A','B','C','D','E','F','G','H','I','J','K','L'],
  ['AB','CD','EF','GH','I','JK','L'],
  ['ABCD','EF','GHI','JKL'],
  ['ABCDEF','GHIJKL'],
  ['ABCDEFGHIJKL']
]
for (let row = 0; row < 5; row++) {
  const actual = twoPlayerSections.filter(section => section.row === row).map(section => section.lanes.map(lane => String.fromCharCode(65 + lane)).join(''))
  if (actual.join('|') !== expectedMerges[row].join('|')) throw new Error(`Incorrect merge map at tier ${row}`)
}
for (const [playerCount, expected] of [[2, 27], [3, 41], [4, 51]]) {
  if (makeSlots(playerCount).filter(slot => slot.kind === 'river').length !== expected) throw new Error(`Incorrect ${playerCount}-player marker capacity`)
}
const topologyGame = createGame({ names: ['A', 'B'], bots: [true, true], seed: 4 })
for (const [row, count] of [[0, 1], [1, 2], [2, 4], [3, 6], [4, 6]]) {
  const sectionSlot = topologyGame.slots.find(slot => slot.kind === 'river' && slot.row === row && slot.group === 0)!
  if (catchablePearls(topologyGame, sectionSlot).length !== count) throw new Error(`Tier ${row} catches the wrong source channels`)
}
const fairyLocations = [['stump1','r2g0'],['stump2','r1g2'],['stump3','r3g1'],['stump4','r1g4'],['rabbit1','r1g1'],['rabbit2','r3g0'],['rabbit3','r2g1'],['rabbit4','r2g2']]
if (fairyLocations.some(([id, section]) => topologyGame.fairySites.find(site => site.id === id)?.section !== section)) throw new Error('Incorrect Fairy site locations')
if (topologyGame.goals.map(goal => `${goal.id}:${goal.needs.length}`).join('|') !== 'white:3|purple:3|pink:4|blue:4|green:4') throw new Error('Incorrect Llama goals')
if (JSON.stringify(pearlPoints) !== JSON.stringify({ green: 1, blue: 2, pink: 3, purple: 4, white: 5 })) throw new Error('Incorrect pearl values')
const claimGame = createGame({ names: ['First', 'Second'], bots: [false, false], seed: 7 })
claimGame.phase = 'lake'
claimGame.slots.find(slot => slot.id === 'lake')!.player = 0
claimGame.lakePearls = ['white']
claimGame.players[0].alpaca = ['white', 'white']
const firstClaim = reduceGame(claimGame, { type: 'collect', pearlIndex: 0 })
if (firstClaim.goals.find(goal => goal.id === 'white')?.owner !== 0 || score(firstClaim, 0).goals !== 4) throw new Error('First player did not claim the White Llama for four points')
firstClaim.slots.find(slot => slot.id === 'lake')!.player = 1
firstClaim.lakePearls = ['white']
firstClaim.players[1].alpaca = ['white', 'white']
const secondClaim = reduceGame(firstClaim, { type: 'collect', pearlIndex: 0 })
if (secondClaim.goals.find(goal => goal.id === 'white')?.owner !== 0 || score(secondClaim, 1).goals !== 0) throw new Error('Llama goal was claimed twice')
const undoGame = createGame({ names: ['Undo', 'Other'], bots: [false, false], seed: 8 })
undoGame.phase = 'deliver'; undoGame.deliverPlayer = 0; undoGame.players[0].alpaca = ['blue']
const { history: _oldHistory, ...undoStart } = undoGame
undoGame.history = [structuredClone(undoStart)]
const delivered = reduceGame(undoGame, { type: 'deliver', alpacaIndex: 0, villagerId: 'starter', socket: 0 })
if (!canUndoDelivery(delivered)) throw new Error('Delivery should be undoable')
const undone = reduceGame(delivered, { type: 'undoDelivery' })
if (undone.players[0].alpaca.join() !== 'blue' || undone.players[0].villagers[0].stored[0] !== null || undone.history.length !== 1) throw new Error('Undo did not restore the delivery')
const nextPlayer = reduceGame(delivered, { type: 'doneDelivery' })
if (canUndoDelivery(nextPlayer)) throw new Error('A later player cannot undo another player’s delivery')
const utilityGame = createGame({ names: ['Utility', 'Other'], bots: [false, false], seed: 10 })
utilityGame.phase = 'deliver'; utilityGame.deliverPlayer = 0; utilityGame.players[0].alpaca = ['blue']; utilityGame.players[0].fairies = ['Wildbloom', 'Zephyr']
const { history: _utilityHistory, ...utilityStart } = utilityGame
utilityGame.history = [structuredClone(utilityStart)]
const wildbloomUsed = reduceGame(utilityGame, { type: 'wildbloom', villagerId: 'starter', socket: 0 })
const wildbloomUndone = reduceGame(wildbloomUsed, { type: 'undoDelivery' })
if (!wildbloomUndone.players[0].fairies.includes('Wildbloom') || wildbloomUndone.players[0].villagers[0].wild.length) throw new Error('Undo did not restore the Wildbloom Fairy')
const zephyrUsed = reduceGame(utilityGame, { type: 'zephyr', villagerId: 'starter', socket: 0, alpacaIndex: 0 })
const zephyrUndone = reduceGame(zephyrUsed, { type: 'undoDelivery' })
if (!zephyrUndone.players[0].fairies.includes('Zephyr') || zephyrUndone.players[0].alpaca.join() !== 'blue' || zephyrUndone.zephyrLeft !== 0) throw new Error('Undo did not restore the Zephyr move')

for (const count of [2, 3, 4]) for (const seed of [1, 42, 2025]) {
  let game: Game = createGame({ names: Array.from({ length: count }, (_, i) => `Bot ${i + 1}`), bots: Array.from({ length: count }, () => true), seed })
  let turns = 0
  while (game.phase !== 'finished' && turns < 1000) {
    const action = chooseBotAction(game)
    if (!action) throw new Error(`No action at ${game.phase}, seed ${seed}`)
    game = reduceGame(game, action)
    turns++
  }
  if (game.phase !== 'finished') throw new Error(`Game stalled at ${game.phase}, seed ${seed}`)
  if (game.round !== 5 || game.history.length !== turns + 1) throw new Error('Incomplete history')
  if (game.fairyDeck.length !== 25 - count * 5) throw new Error('Wrong Fairy draw count')
  if (game.players.some(p => !Number.isFinite(score(game, p.id).total))) throw new Error('Invalid score')
  if (game.players.some(p => !p.villagers.some(v => v.stored.some(c => c !== null)))) throw new Error('Bot finished without storing any pearls')
  console.log(`${count} players, seed ${seed}: ${turns} actions, scores ${game.players.map(p => score(game, p.id).total).join('/')}`)
}
