export const CONTENT_VERSION = 'prototype-2026.1'
export const POLICY_VERSION = 'river-guide-2'
export const colors = ['green', 'blue', 'pink', 'purple', 'white'] as const
export type Pearl = typeof colors[number]
export const pearlPoints: Record<Pearl, number> = { green: 1, blue: 2, pink: 3, purple: 4, white: 5 }
export const campTypes = ['Trail Pennant', 'Glowstone Lamp', 'Wonder Basket', 'Pearl Net', 'Whisperstrings'] as const
export type Camp = typeof campTypes[number]
export const fairyTypes = ['Emberglow', 'Zephyr', 'Moonveil', 'Wildbloom', 'Dewdrop'] as const
export type Fairy = typeof fairyTypes[number]
export type Phase = 'explore' | 'collect' | 'lake' | 'recruit' | 'deliver' | 'finished'
export type Slot = { id: string; kind: 'river' | 'lake' | 'village'; row: number; group: number; cost: number; player: number | null; section: string; lanes: number[]; priority: number }
export type RiverSection = { id: string; row: number; group: number; lanes: number[]; capacity: number; cost: number }
export type FairySite = { id: string; kind: 'stump' | 'rabbit'; section: string; fairies: Fairy[] }
export type Ability = 'start' | 'cards' | 'cardLead' | 'fairies' | 'pearls' | 'white' | 'fairyLead' | 'pinkLead' | 'matching' | 'pattern' | 'distinct'
export type Villager = { id: string; name: string; sockets: (Pearl | 'any')[]; stored: (Pearl | null)[]; wild: number[]; reward: number; ability: Ability; points: number; portrait: string }
export type Player = { id: number; name: string; bot: boolean; hand: Camp[]; alpaca: Pearl[]; villagers: Villager[]; fairies: Fairy[]; goals: string[] }
export type Goal = { id: string; title: string; needs: Pearl[]; owner: number | null }
export type Decision = { summary: string; estimate: number | null; factors: { label: string; value: number | null }[]; assumptions: string[]; policy: string }
export type RecordEntry = { action: string; player: number | null; detail: string; policy?: string; decision?: Decision }
export type Snapshot = Omit<Game, 'history'>
export type Game = {
  id: string; seed: number; rulesVersion: string; policyVersion: string; round: number; phase: Phase;
  players: Player[]; slots: Slot[]; track: number[]; exploreTurn: number; afterPlace: boolean;
  riverPearls: Pearl[][]; lakePearls: Pearl[]; lakeMoves: number; pearlDeck: Pearl[]; fairyDeck: Fairy[]; fairySites: FairySite[];
  villagerDeck: Villager[]; display: Villager[]; campDeck: Camp[]; campDiscard: Camp[]; market: Camp[];
  goals: Goal[]; collectQueue: string[]; collectIndex: number; recruitQueue: string[]; recruitIndex: number; deliverPlayer: number;
  pendingDraws: { player: number; count: number } | null; pendingExtra: boolean; recruitedThisSlot: boolean; zephyrLeft: number; event: string; log: RecordEntry[]; history: Snapshot[]
}
export type Action =
  | { type: 'place'; slot: string; moonveil?: boolean; emberglow?: boolean }
  | { type: 'endTurn' } | { type: 'gain'; marketIndex: number | null }
  | { type: 'pair'; card: Camp; target?: string }
  | { type: 'collect'; pearlIndex: number; swapIndex?: number; extra?: 'pearlNet' | 'dewdrop' }
  | { type: 'skipCollect' } | { type: 'recruit'; villagerId: string }
  | { type: 'skipRecruit' } | { type: 'whisperstrings' }
  | { type: 'deliver'; alpacaIndex: number; villagerId: string; socket: number }
  | { type: 'wildbloom'; villagerId: string; socket: number }
  | { type: 'zephyr'; villagerId: string; socket: number; fromVillagerId?: string; fromSocket?: number; alpacaIndex?: number }
  | { type: 'endZephyr' } | { type: 'doneDelivery' } | { type: 'undoDelivery' }

function rng(seed: number) { let n = seed >>> 0; return () => { n = (n + 0x6D2B79F5) >>> 0; let x = Math.imul(n ^ n >>> 15, 1 | n); x ^= x + Math.imul(x ^ x >>> 7, 61 | x); return ((x ^ x >>> 14) >>> 0) / 4294967296 } }
function shuffled<T>(items: T[], seed: number): T[] { const a = [...items], random = rng(seed); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const copies = <T,>(item: T, count: number) => Array.from({ length: count }, () => item)
const names = ['Mira', 'Pip', 'Juniper', 'Bramble', 'Tansy', 'Clover', 'Nori', 'Wren', 'Fenn', 'Lumi', 'Moss', 'Sable', 'Basil', 'Poppy', 'Rumi', 'Hazel', 'Ollie', 'Kiko', 'Maple', 'Taro', 'Pecan', 'Nim', 'Fig', 'Daisy', 'Aster', 'Bibi']
const villagerPortraits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3, 4, 5, 6]
const abilityList: Ability[] = ['cards', 'cardLead', 'fairies', 'pearls', 'white', 'fairyLead', 'pinkLead', 'matching', 'pattern', 'distinct']
const abilityPoints: Record<Ability, number> = { start: 3, cards: 1, cardLead: 5, fairies: 2, pearls: 2, white: 2, fairyLead: 6, pinkLead: 6, matching: 6, pattern: 8, distinct: 5 }
export const abilityText: Record<Ability, string> = {
  start: '+3 per full Villager', cards: '+1 per Camp card', cardLead: '+5 for sole Camp lead', fairies: '+2 per unused Fairy',
  pearls: '+2 per stored pearl', white: '+2 per stored white', fairyLead: '+6 for sole Fairy lead', pinkLead: '+6 for sole pink lead',
  matching: '+6 if 4 matching pearls', pattern: '+8 if every socket is filled', distinct: '+5 if 5 distinct colors'
}
export const starter = (): Villager => ({ id: 'starter', name: 'River Keeper', sockets: ['any', 'any', 'any'], stored: [null, null, null], wild: [], reward: 0, ability: 'start', points: 3, portrait: '/villagers/realistic/starter.jpg' })
export function makeVillagers(): Villager[] {
  return names.map((name, i) => {
    const ability = abilityList[i % abilityList.length]
    const count = ability === 'matching' ? 4 : ability === 'distinct' || ability === 'pattern' ? 5 : 3 + i % 2
    const sockets: (Pearl | 'any')[] = Array.from({ length: count }, (_, j) => ability === 'matching' ? colors[i % 5] : ability === 'distinct' ? colors[j] : j === count - 1 && i % 3 === 0 ? 'any' : colors[(i + j * 2) % 5])
    return { id: `v${i + 1}`, name, sockets, stored: sockets.map(() => null), wild: [], reward: i % 3, ability, points: abilityPoints[ability], portrait: `/villagers/realistic/v${villagerPortraits[i]}.jpg` }
  })
}
const sourceLanes = Array.from({ length: 12 }, (_, i) => i)
const sectionLanes: number[][][] = [
  sourceLanes.map(lane => [lane]),
  [[0, 1], [2, 3], [4, 5], [6, 7], [8], [9, 10], [11]],
  [[0, 1, 2, 3], [4, 5], [6, 7, 8], [9, 10, 11]],
  [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11]],
  [sourceLanes]
]
export function makeRiverSections(): RiverSection[] {
  return sectionLanes.flatMap((groups, row) => groups.map((lanes, group) => ({ id: `r${row}g${group}`, row, group, lanes, capacity: row + 1, cost: [3, 2, 1, 0, -1][row] })))
}
export function makeFairySites(): FairySite[] {
  return [
    { id: 'stump1', kind: 'stump', section: 'r2g0', fairies: [] },
    { id: 'stump2', kind: 'stump', section: 'r1g2', fairies: [] },
    { id: 'stump3', kind: 'stump', section: 'r3g1', fairies: [] },
    { id: 'stump4', kind: 'stump', section: 'r1g4', fairies: [] },
    { id: 'rabbit1', kind: 'rabbit', section: 'r1g1', fairies: [] },
    { id: 'rabbit2', kind: 'rabbit', section: 'r3g0', fairies: [] },
    { id: 'rabbit3', kind: 'rabbit', section: 'r2g1', fairies: [] },
    { id: 'rabbit4', kind: 'rabbit', section: 'r2g2', fairies: [] }
  ]
}
export function makeSlots(playerCount: number): Slot[] {
  const activeChannels = playerCount * 3
  const slots: Slot[] = makeRiverSections().filter(section => section.lanes.some(lane => lane < activeChannels)).flatMap(section => Array.from({ length: section.capacity }, (_, priority) => ({
    id: `${section.id}p${priority}`, kind: 'river' as const, row: section.row, group: section.group, cost: section.cost,
    player: null, section: section.id, lanes: section.lanes, priority
  })))
  slots.push({ id: 'lake', kind: 'lake', row: 5, group: 0, cost: 0, player: null, section: 'lake', lanes: [], priority: 0 })
  for (let i = 0; i < 6; i++) slots.push({ id: `village${i}`, kind: 'village', row: 6, group: i, cost: i === 0 ? 2 : i === 1 ? 1 : 0, player: null, section: `village${i}`, lanes: [], priority: 0 })
  return slots
}
export function catchablePearls(g: Game, s: Slot): Pearl[] { return s.lanes.flatMap(lane => g.riverPearls[lane] ?? []) }
function catchableAt(g: Game, s: Slot, index: number): { lane: number; index: number } {
  for (const lane of s.lanes) { const count = g.riverPearls[lane]?.length ?? 0; if (index < count) return { lane, index }; index -= count }
  throw new Error('Choose a pearl in this section')
}
export function validateContent(): string[] {
  const errors: string[] = []
  const villagers = makeVillagers()
  if (villagers.length !== 26) errors.push('Expected 26 Villagers')
  for (const v of villagers) {
    if (v.sockets.length !== v.stored.length || !v.sockets.length || v.reward < 0 || v.points < 0) errors.push(`Invalid ${v.id}`)
    if (v.sockets.some(s => s !== 'any' && !colors.includes(s))) errors.push(`Unknown socket on ${v.id}`)
  }
  return errors
}
export function createGame(settings: { names: string[]; bots: boolean[]; seed?: number }): Game {
  const count = settings.names.length
  if (count < 2 || count > 4) throw new Error('Choose 2–4 players')
  const errors = validateContent(); if (errors.length) throw new Error(errors.join(', '))
  const seed = settings.seed ?? Math.floor(Math.random() * 0xffffffff)
  const pearlDeck = shuffled([...copies('green' as Pearl, 17), ...copies('blue' as Pearl, 15), ...copies('pink' as Pearl, 13), ...copies('purple' as Pearl, 11), ...copies('white' as Pearl, 9)], seed ^ 0x91e10da5)
  const fairyDeck = shuffled(fairyTypes.flatMap(f => copies(f, 5)), seed ^ 0x3ad8025f)
  const villagerDeck = shuffled(makeVillagers(), seed ^ 0x23403bfa)
  const campDeck = shuffled(campTypes.flatMap(c => copies(c, 10)), seed ^ 0x9e3779b9)
  const order = shuffled(Array.from({ length: count }, (_, i) => i), seed ^ 0x134b24bc)
  const players: Player[] = settings.names.map((name, i) => ({ id: i, name: name.trim() || `Player ${i + 1}`, bot: settings.bots[i], hand: campDeck.splice(0, 6), alpaca: [], villagers: [starter()], fairies: [], goals: [] }))
  const track = Array.from({ length: 3 }, () => order).flat()
  const game: Game = { id: `${Date.now()}-${seed}`, seed, rulesVersion: CONTENT_VERSION, policyVersion: POLICY_VERSION, round: 1, phase: 'explore', players, slots: makeSlots(count), track, exploreTurn: 0, afterPlace: false,
    riverPearls: Array.from({ length: count * 3 }, () => []), lakePearls: [], lakeMoves: 0, pearlDeck, fairyDeck, fairySites: makeFairySites(), villagerDeck, display: villagerDeck.splice(0, 6), campDeck, campDiscard: [], market: campDeck.splice(0, 3),
    goals: [
      { id: 'white', title: 'White Llama', needs: ['white', 'white', 'white'], owner: null },
      { id: 'purple', title: 'Purple Llama', needs: ['purple', 'purple', 'purple'], owner: null },
      { id: 'pink', title: 'Pink Llama', needs: ['pink', 'pink', 'pink', 'pink'], owner: null },
      { id: 'blue', title: 'Blue Llama', needs: ['blue', 'blue', 'blue', 'blue'], owner: null },
      { id: 'green', title: 'Green Llama', needs: ['green', 'green', 'green', 'green'], owner: null }
    ], collectQueue: [], collectIndex: 0, recruitQueue: [], recruitIndex: 0, deliverPlayer: 0, pendingDraws: null, pendingExtra: false, recruitedThisSlot: false, zephyrLeft: 0, event: 'Round 1: place your Tribe tokens.', log: [], history: [] }
  prepare(game)
  game.history = [snapshot(game)]
  return game
}
function snapshot(game: Game): Snapshot { const { history: _history, ...rest } = game; return structuredClone(rest) }
function slot(game: Game, id: string): Slot { const found = game.slots.find(s => s.id === id); if (!found) throw new Error('Unknown slot'); return found }
function activePlayer(game: Game): number { return game.track[game.exploreTurn] }
export function actor(game: Game): number | null {
  if (game.pendingDraws) return game.pendingDraws.player
  if (game.phase === 'explore') return activePlayer(game)
  if (game.phase === 'collect') return slot(game, game.collectQueue[game.collectIndex]).player
  if (game.phase === 'lake') return slot(game, 'lake').player
  if (game.phase === 'recruit') return slot(game, game.recruitQueue[game.recruitIndex]).player
  if (game.phase === 'deliver') return game.deliverPlayer
  return null
}
export function canUndoDelivery(game: Game): boolean {
  const last = game.log.at(-1)
  return game.phase === 'deliver' && game.history.length > 1 && !!last && last.player === actor(game) && ['deliver', 'wildbloom', 'zephyr', 'endZephyr'].includes(last.action)
}
function prepare(g: Game) {
  if (g.round > 1) { g.villagerDeck.push(...g.display); g.display = g.villagerDeck.splice(0, 6) }
  for (let i = 0; i < g.players.length * 3; i++) g.riverPearls[i].push(g.pearlDeck.shift()!)
  const kind = g.round % 2 ? 'stump' : 'rabbit'
  const fairySites = g.fairySites.filter(site => site.kind === kind && g.slots.some(slot => slot.section === site.section))
  for (const site of fairySites.slice(0, g.players.length)) { const fairy = g.fairyDeck.shift(); if (fairy) site.fairies.push(fairy) }
  g.event = `Round ${g.round}: ${g.players.length * 3} visible pearls and ${g.players.length} Fairies appeared.`
}
function drawCamp(g: Game): Camp | undefined {
  if (!g.campDeck.length && g.campDiscard.length) { g.campDeck = shuffled(g.campDiscard, g.seed ^ g.round ^ g.log.length); g.campDiscard = [] }
  return g.campDeck.shift()
}
function marketRefresh(g: Game) {
  if (g.market.length === 3 && g.market.every(c => c === g.market[0])) { g.campDiscard.push(...g.market); g.market = []; for (let i = 0; i < 3; i++) { const c = drawCamp(g); if (c) g.market.push(c) } }
}
function pay(g: Game, p: Player, cost: number, moonveil?: boolean, emberglow?: boolean) {
  if (moonveil && p.fairies.includes('Moonveil')) { p.fairies.splice(p.fairies.indexOf('Moonveil'), 1); return }
  let remaining = cost
  if (emberglow && p.fairies.includes('Emberglow') && remaining) { p.fairies.splice(p.fairies.indexOf('Emberglow'), 1); remaining-- }
  if (p.hand.length < remaining) throw new Error('Not enough Camp cards')
  // Spend singles first, preserving matching pairs when possible.
  while (remaining--) { const card = p.hand.find(c => p.hand.filter(x => x === c).length % 2 === 1) ?? p.hand[0]; p.hand.splice(p.hand.indexOf(card), 1); g.campDiscard.push(card) }
}
export function legalSlots(g: Game, player = actor(g)): Slot[] {
  if (player === null || g.phase !== 'explore' || g.afterPlace || g.pendingDraws) return []
  const p = g.players[player]
  return g.slots.filter(s => s.player === null && (s.cost <= p.hand.length || p.fairies.includes('Moonveil') || (p.fairies.includes('Emberglow') && s.cost <= p.hand.length + 1)))
}
function checkGoals(g: Game, playerId: number) {
  const p = g.players[playerId]
  for (const goal of g.goals) if (goal.owner === null) {
    const pool = [...p.alpaca]; const complete = goal.needs.every(c => { const i = pool.indexOf(c); if (i < 0) return false; pool.splice(i, 1); return true })
    if (complete) { goal.owner = playerId; p.goals.push(goal.id); g.event = `${p.name} claimed ${goal.title} (worth 4 at game end).` }
  }
}
function startCollection(g: Game) {
  g.phase = 'collect'; g.collectQueue = g.slots.filter(s => s.kind === 'river' && s.player !== null).map(s => s.id); g.collectIndex = 0; g.track = []; g.lakeMoves = 0
  advanceCollection(g)
}
function advanceCollection(g: Game) {
  while (g.collectIndex < g.collectQueue.length) {
    const s = slot(g, g.collectQueue[g.collectIndex]); if (catchablePearls(g, s).length) return
    g.track.unshift(s.player!); s.player = null; g.collectIndex++
  }
  g.lakePearls.push(...g.riverPearls.flat()); g.riverPearls = g.riverPearls.map(() => [])
  const lake = slot(g, 'lake'); if (lake.player !== null) { g.phase = 'lake'; return }
  startRecruit(g)
}
function startRecruit(g: Game) {
  g.phase = 'recruit'; g.recruitQueue = g.slots.filter(s => s.kind === 'village' && s.player !== null).map(s => s.id); g.recruitIndex = 0; g.recruitedThisSlot = false; advanceRecruit(g)
}
function advanceRecruit(g: Game) {
  while (g.recruitIndex < g.recruitQueue.length) {
    const s = slot(g, g.recruitQueue[g.recruitIndex]); if (g.display.length) return
    g.track.unshift(s.player!); s.player = null; g.recruitIndex++
  }
  g.phase = 'deliver'; g.deliverPlayer = 0; g.event = 'Deliver matching pearls to your Villagers.'
}
function takePearl(g: Game, player: number, source: Pearl[], index: number, swapIndex?: number) {
  if (index < 0 || index >= source.length) throw new Error('Choose a pearl')
  const p = g.players[player]
  if (p.alpaca.length >= 6 && (swapIndex === undefined || swapIndex < 0 || swapIndex >= p.alpaca.length)) throw new Error('Alpaca is full; choose a pearl to exchange')
  const picked = source.splice(index, 1)[0]
  if (p.alpaca.length >= 6) source.push(p.alpaca.splice(swapIndex!, 1)[0])
  p.alpaca.push(picked); checkGoals(g, player)
}
export function pairAvailable(p: Player, card: Camp) { const count = p.hand.filter(c => c === card).length; return count >= 2 || (count >= 1 && p.fairies.includes('Emberglow')) }
function discardPair(g: Game, p: Player, card: Camp) {
  if (!pairAvailable(p, card)) throw new Error(`Need a ${card} pair or a Emberglow`)
  const count = p.hand.filter(c => c === card).length >= 2 ? 2 : 1
  for (let i = 0; i < count; i++) p.hand.splice(p.hand.indexOf(card), 1)
  if (count === 1) p.fairies.splice(p.fairies.indexOf('Emberglow'), 1)
  g.campDiscard.push(...copies(card, count))
}
function completeRecruit(g: Game) {
  const s = slot(g, g.recruitQueue[g.recruitIndex]); g.track.unshift(s.player!); s.player = null; g.recruitIndex++; g.recruitedThisSlot = false; advanceRecruit(g)
}
export function reduceGame(current: Game, action: Action & { decision?: Decision }): Game {
  if (action.type === 'undoDelivery') {
    if (!canUndoDelivery(current)) throw new Error('No delivery move to undo')
    return { ...structuredClone(current.history.at(-2)!), history: current.history.slice(0, -1) }
  }
  const g = { ...structuredClone(snapshot(current)), history: current.history } as Game
  const playerId = actor(g)
  if (playerId === null) throw new Error('Game is finished')
  const p = g.players[playerId]
  const record = (detail: string) => { g.event = detail; g.log.push({ action: action.type, player: playerId, detail, ...(p.bot ? { policy: POLICY_VERSION } : {}), ...(action.decision ? { decision: action.decision } : {}) }) }
  if (g.pendingDraws) {
    if (action.type !== 'gain') throw new Error('Choose a Camp card')
    const card = action.marketIndex === null ? drawCamp(g) : g.market.splice(action.marketIndex, 1)[0]
    if (card) p.hand.push(card)
    if (action.marketIndex !== null) { const replacement = drawCamp(g); if (replacement) g.market.splice(action.marketIndex, 0, replacement) }
    marketRefresh(g); g.pendingDraws.count--; if (g.pendingDraws.count <= 0) g.pendingDraws = null
    record(`${p.name} gained ${card ?? 'no card'}.`)
  } else if (g.phase === 'explore') {
    if (action.type === 'place') {
      if (!legalSlots(g).some(s => s.id === action.slot)) throw new Error('Illegal placement')
      const s = slot(g, action.slot); pay(g, p, Math.max(0, s.cost), action.moonveil, action.emberglow); s.player = playerId
      for (const site of g.fairySites.filter(site => site.section === s.section)) { p.fairies.push(...site.fairies); site.fairies = [] }
      g.afterPlace = true
      if (s.cost < 0) g.pendingDraws = { player: playerId, count: 1 }
      record(`${p.name} placed at ${slotLabel(s)}${s.cost > 0 ? ` for ${s.cost} cards` : ''}.`)
    } else if (action.type === 'pair' && g.afterPlace && ['Trail Pennant', 'Glowstone Lamp', 'Wonder Basket'].includes(action.card)) {
      discardPair(g, p, action.card)
      if (action.card === 'Trail Pennant') {
        const index = g.track.findIndex((x, i) => i > g.exploreTurn && x === playerId)
        if (index < 0) throw new Error('No unplaced token')
        g.track.splice(index, 1); g.track.splice(g.exploreTurn + 1, 0, playerId)
      } else if (action.card === 'Glowstone Lamp') {
        const fairySite = g.fairySites.find(site => site.id === action.target && site.fairies.length)
        if (!fairySite) throw new Error('Choose a Fairy on the board')
        p.fairies.push(fairySite.fairies.shift()!)
      } else {
        const [fromId, toId] = (action.target ?? '').split('>')
        const owned = g.slots.find(s => s.id === fromId && s.player === playerId)
        const destination = g.slots.find(s => s.id === toId && s.player === null)
        if (!owned || !destination) throw new Error('No token can move')
        owned.player = null; destination.player = playerId
      }
      record(`${p.name} played a ${action.card} pair.`)
    } else if (action.type === 'endTurn' && g.afterPlace) {
      g.afterPlace = false; g.exploreTurn++
      if (g.exploreTurn >= g.players.length * 3) startCollection(g)
      record(g.exploreTurn >= g.players.length * 3 ? 'The floodgate opens. Collect pearls upstream to downstream.' : `${g.players[activePlayer(g)].name} places next.`)
    } else throw new Error('Place a token first')
  } else if (g.phase === 'collect') {
    const s = slot(g, g.collectQueue[g.collectIndex])
    if (action.type === 'collect') {
      const source = catchableAt(g, s, action.pearlIndex)
      takePearl(g, playerId, g.riverPearls[source.lane], source.index, action.swapIndex)
      if (action.extra && catchablePearls(g, s).length && !g.pendingExtra) {
        if (action.extra === 'pearlNet') discardPair(g, p, 'Pearl Net')
        else { const i = p.fairies.indexOf('Dewdrop'); if (i < 0) throw new Error('No Dewdrop Fairy'); p.fairies.splice(i, 1) }
        g.pendingExtra = true
      } else {
        g.pendingExtra = false; g.track.unshift(playerId); s.player = null; g.collectIndex++; advanceCollection(g)
      }
      record(`${p.name} collected a pearl at ${slotLabel(s)}.`)
    } else if (action.type === 'skipCollect') { g.pendingExtra = false; g.track.unshift(playerId); s.player = null; g.collectIndex++; advanceCollection(g); record(`${p.name} passed at ${slotLabel(s)}.`) }
    else throw new Error('Choose a pearl or pass')
  } else if (g.phase === 'lake') {
    if (action.type === 'collect') { takePearl(g, playerId, g.lakePearls, action.pearlIndex, action.swapIndex); g.lakeMoves++; record(`${p.name} took a pearl from the Lake.`) }
    else if (action.type === 'skipCollect') { const s = slot(g, 'lake'); g.track.unshift(playerId); s.player = null; startRecruit(g); record(`${p.name} finished at the Lake.`) }
    else throw new Error('Choose a Lake pearl or finish')
  } else if (g.phase === 'recruit') {
    if (action.type === 'recruit') {
      if (g.recruitedThisSlot) throw new Error('This token already recruited')
      const index = g.display.findIndex(v => v.id === action.villagerId); if (index < 0) throw new Error('Villager unavailable')
      const v = g.display.splice(index, 1)[0]; p.villagers.push(v); if (v.reward) g.pendingDraws = { player: playerId, count: v.reward }
      g.recruitedThisSlot = true
      record(`${p.name} recruited ${v.name}.`)
      // A Whisperstrings move can be chosen before this token is returned.
      if (!pairAvailable(p, 'Whisperstrings')) completeRecruit(g)
    } else if (action.type === 'whisperstrings') {
      if (!g.recruitedThisSlot || !pairAvailable(p, 'Whisperstrings')) throw new Error('Recruit first and have a Whisperstrings pair')
      const from = slot(g, g.recruitQueue[g.recruitIndex]); const next = g.slots.find(s => s.kind === 'village' && s.group > from.group && s.player === null)
      if (!next) throw new Error('No later Village slot')
      discardPair(g, p, 'Whisperstrings'); next.player = playerId; from.player = null; g.recruitQueue.splice(g.recruitIndex + 1, 0, next.id); g.recruitQueue = [...g.recruitQueue.slice(0, g.recruitIndex + 1), ...g.recruitQueue.slice(g.recruitIndex + 1).sort((a, b) => slot(g, a).group - slot(g, b).group)]; g.recruitIndex++; g.recruitedThisSlot = false; advanceRecruit(g); record(`${p.name} used Whisperstrings to visit another Village slot.`)
    } else if (action.type === 'skipRecruit') { completeRecruit(g); record(`${p.name} finished recruiting.`) }
    else throw new Error('Choose a Villager')
  } else if (g.phase === 'deliver') {
    if (action.type === 'deliver') {
      const v = p.villagers.find(v => v.id === action.villagerId); const pearl = p.alpaca[action.alpacaIndex]
      if (!v || !pearl || v.stored[action.socket] !== null || (v.sockets[action.socket] !== pearl && v.sockets[action.socket] !== 'any' && !v.wild.includes(action.socket))) throw new Error('Pearl does not fit')
      v.stored[action.socket] = p.alpaca.splice(action.alpacaIndex, 1)[0]; record(`${p.name} delivered ${pearl} to ${v.name}.`)
    } else if (action.type === 'wildbloom') {
      const v = p.villagers.find(v => v.id === action.villagerId); if (!v || v.stored[action.socket] !== null || !p.fairies.includes('Wildbloom')) throw new Error('Cannot use Wildbloom')
      p.fairies.splice(p.fairies.indexOf('Wildbloom'), 1); v.wild.push(action.socket); record(`${p.name} made a ${v.name} socket wild.`)
    } else if (action.type === 'zephyr') {
      const v = p.villagers.find(v => v.id === action.villagerId)
      const sourceVillager = p.villagers.find(v => v.id === action.fromVillagerId)
      const pearl = sourceVillager ? sourceVillager.stored[action.fromSocket!] : p.alpaca[action.alpacaIndex!]
      if (!v || !pearl || (!p.fairies.includes('Zephyr') && g.zephyrLeft === 0) || v.stored[action.socket] !== null || (v.sockets[action.socket] !== pearl && v.sockets[action.socket] !== 'any' && !v.wild.includes(action.socket))) throw new Error('Invalid Zephyr move')
      v.stored[action.socket] = pearl; if (sourceVillager) sourceVillager.stored[action.fromSocket!] = null; else p.alpaca.splice(action.alpacaIndex!, 1)
      if (g.zephyrLeft === 0) { p.fairies.splice(p.fairies.indexOf('Zephyr'), 1); g.zephyrLeft = 2 } else g.zephyrLeft--
      record(`${p.name} used Zephyr to move ${pearl}. ${g.zephyrLeft} moves remain.`)
    } else if (action.type === 'endZephyr') {
      g.zephyrLeft = 0; record(`${p.name} finished the Zephyr effect.`)
    } else if (action.type === 'doneDelivery') {
      g.zephyrLeft = 0
      g.deliverPlayer++
      if (g.deliverPlayer >= g.players.length) {
        if (g.round === 5) { g.phase = 'finished'; record('The fifth round is complete. Final scores are ready.') }
        else { g.round++; g.phase = 'explore'; g.exploreTurn = 0; prepare(g); record(`Round ${g.round} begins.`) }
      } else record(`${g.players[g.deliverPlayer].name} may deliver pearls.`)
    } else throw new Error('Deliver pearls or finish')
  }
  g.history = [...current.history, snapshot(g)]; return g
}
export function slotLabel(s: Slot): string { return s.kind === 'river' ? `Tier ${s.row + 1}, channels ${s.lanes[0] + 1}–${s.lanes.at(-1)! + 1}, socket ${s.priority + 1}` : s.kind === 'lake' ? 'Lake' : `Village ${s.group + 1}` }
export function score(g: Game, playerId: number) {
  const p = g.players[playerId], stored = p.villagers.flatMap(v => v.stored).filter((x): x is Pearl => x !== null)
  const pearls = stored.reduce((n, c) => n + pearlPoints[c], 0)
  const full = p.villagers.filter(v => v.stored.every(c => c !== null)).length
  const metric = (who: Player, ability: Ability) => ability === 'cardLead' ? who.hand.length : ability === 'fairyLead' ? who.fairies.length : who.villagers.flatMap(v => v.stored).filter(c => c === 'pink').length
  const bonuses = p.villagers.map(v => {
    let value = 0
    switch (v.ability) {
      case 'start': value = full * v.points; break
      case 'cards': value = p.hand.length * v.points; break
      case 'fairies': value = p.fairies.length * v.points; break
      case 'pearls': value = stored.length * v.points; break
      case 'white': value = stored.filter(c => c === 'white').length * v.points; break
      case 'cardLead': case 'fairyLead': case 'pinkLead': { const mine = metric(p, v.ability); value = mine > 0 && g.players.every(other => other.id === p.id || mine > metric(other, v.ability)) ? v.points : 0; break }
      case 'matching': value = v.stored.filter(c => c !== null && c === v.stored[0]).length >= 4 ? v.points : 0; break
      case 'pattern': value = v.stored.every(c => c !== null) ? v.points : 0; break
      case 'distinct': value = new Set(v.stored.filter(Boolean)).size >= 5 ? v.points : 0; break
    }
    return { name: v.name, value, description: abilityText[v.ability] }
  })
  const goals = p.goals.length * 4
  return { pearls, bonuses, goals, total: pearls + bonuses.reduce((n, b) => n + b.value, 0) + goals }
}
