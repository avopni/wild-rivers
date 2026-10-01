import { actor, makeRiverSections, type Action, type Fairy, type Game, type Pearl, type Slot } from './game'
import { boardLayout } from './boardLayout'

// Presentation state is transient. The rules, saved games and replay snapshots stay authoritative.
export type Point = { x: number; y: number }
export type ScenePearl = { id: string; color: Pearl; lane: number | null; index: number; point: Point; atLake?: boolean }
export type PearlMove = { pearl: ScenePearl; to: Point; route: Point[]; delay: number; duration: number; disappear?: boolean; arrive?: boolean }
export type Presentation = {
  id: number; before: Game; after: Game; action?: Action; kind: 'populate' | 'move';
  moves: PearlMove[]; removedMarkers: Slot[]; duration: number; message: string;
  caught?: { pearl: ScenePearl; player: number; socket: number; exchanged?: Pearl }
  preparation?: { steps: PreparationStep[]; index: number }
}

export type PreparationStep = { kind: 'deal' | 'review' | 'settle' | 'pearls' | 'read' | 'fairy' | 'track'; duration: number; message: string; count?: number; fairy?: Fairy; site?: string }
export const fairyEffects: Record<Fairy, string> = {
  Dewdrop: 'When collecting from a river section, take one additional pearl from that same section, if available.',
  Zephyr: 'Move up to three pearls from your llama or Villagers to other Villagers. Each destination must accept the pearl. Pearls cannot move back to your llama.',
  Moonveil: 'Ignore all Camp-card costs for one Tribe-token placement.',
  Wildbloom: 'Make one Villager pearl socket wild for the rest of the game.',
  Emberglow: 'Counts as one Camp card of any type. Use it to pay a placement cost or as part of a matching pair.'
}
export function preparationStep(presentation?: Presentation | null) { return presentation?.preparation?.steps[presentation.preparation.index] }
export function advancePresentation(presentation: Presentation): Presentation | null {
  const preparation = presentation.preparation
  if (!preparation || preparation.index + 1 >= preparation.steps.length) return null
  const index = preparation.index + 1, step = preparation.steps[index]
  return { ...presentation, preparation: { ...preparation, index }, duration: step.duration, message: step.message }
}
export function preparationGame(presentation: Presentation): Game {
  const preparation = presentation.preparation
  if (!preparation) return presentation.after
  const { after, before } = presentation, steps = preparation.steps.slice(0, preparation.index + 1), step = preparationStep(presentation)!
  const dealt = step.kind === 'deal' ? step.count! : after.display.length
  const havePearls = steps.some(item => item.kind === 'pearls')
  const fresh = before === after || before.round === after.round
  return { ...after, display: steps.some(item => item.kind === 'settle') ? after.display : [],
    riverPearls: havePearls ? after.riverPearls : after.riverPearls.map(() => []),
    track: step.kind === 'track' ? after.track : [],
    fairySites: after.fairySites.map(site => {
      const original = fresh ? [] : before.fairySites.find(item => item.id === site.id)?.fairies ?? []
      const placed = steps.filter(item => item.kind === 'fairy' && item.site === site.id).length
      return { ...site, fairies: site.fairies.slice(0, original.length + placed) }
    }),
    event: `Preparing round ${after.round}: ${dealt} villagers revealed`
  }
}

function preparationSteps(before: Game, after: Game, fresh: boolean): PreparationStep[] {
  const steps: PreparationStep[] = after.display.map((_, index) => ({ kind: 'deal', count: index + 1, duration: .54, message: `Meet this round's villagers · ${index + 1} / ${after.display.length}` }))
  steps.push({ kind: 'review', duration: 0, message: 'Meet this round’s villagers' }, { kind: 'settle', duration: .55 + Math.max(0, after.display.length - 1) * .07, message: 'Villagers settle onto the board' }, { kind: 'pearls', duration: .32 + (after.players.length * 3 - 1) * .1, message: 'Draw pearls behind the closed gates' })
  for (const site of after.fairySites) {
    const oldCount = fresh ? 0 : before.fairySites.find(item => item.id === site.id)?.fairies.length ?? 0
    for (const fairy of site.fairies.slice(oldCount)) steps.push({ kind: 'read', duration: 0, fairy, site: site.id, message: `Read the ${fairy} Faerie` }, { kind: 'fairy', duration: .55, fairy, site: site.id, message: `Placing ${fairy} Faerie` })
  }
  steps.push({ kind: 'track', duration: .22 + (after.track.length - 1) * .08, message: 'Your prepared turn order' })
  return steps
}

export const riverTiers = [252, 362, 472, 582, 692]
export const laneX = (lane: number, channels: number) => boardLayout(channels / 3).sourceX[lane]
export function sectionX(lanes: number[], channels: number) {
  const active = lanes.filter(lane => lane < channels)
  return (laneX(active[0], channels) + laneX(active.at(-1)!, channels)) / 2
}
export function markerPoint(slot: Slot, channels: number): Point {
  if (slot.kind === 'lake') return { x: 770, y: 779 }
  if (slot.kind === 'village') return { x: 500 + slot.group * 90, y: 916 }
  return { x: sectionX(slot.lanes, channels) + (slot.priority - slot.row / 2) * (slot.row ? boardLayout(channels / 3).slotSpacing : 0), y: riverTiers[slot.row] }
}
export function fairyPoint(game: Game, siteId: string): Point {
  const site = game.fairySites.find(site => site.id === siteId)!
  const section = makeRiverSections().find(section => section.id === site.section)!
  return { x: sectionX(section.lanes, game.players.length * 3) - 31, y: riverTiers[section.row] - 42 }
}

// Enough seats for the whole 65-pearl supply, leaving the Lake marker clear.
const lakeSeats: Point[] = []
for (let y = 740; y <= 812; y += 11) for (let x = 650; x <= 890; x += 13) {
  if (((x - 770) / 125) ** 2 + ((y - 775) / 42) ** 2 < .94 && Math.hypot(x - 770, y - 779) > 30) lakeSeats.push({ x, y })
}

export function scenePearls(game: Game): ScenePearl[] {
  const channels = game.players.length * 3
  const buckets = new Map<string, { lane: number; index: number; color: Pearl; slot?: Slot }[]>()
  game.riverPearls.forEach((pearls, lane) => pearls.forEach((color, index) => {
    const blocker = game.phase === 'explore' ? undefined : game.slots.find(slot => slot.kind === 'river' && slot.player !== null && slot.lanes.includes(lane))
    const key = blocker?.section ?? (game.phase === 'collect' ? 'waiting-lake' : `source-${lane}`)
    const bucket = buckets.get(key) ?? []
    bucket.push({ lane, index, color, slot: blocker }); buckets.set(key, bucket)
  }))
  const result: ScenePearl[] = []
  for (const [key, bucket] of buckets) bucket.forEach((pearl, seat) => {
    const columns = pearl.slot ? Math.min(6, bucket.length) : Math.min(3, bucket.length)
    const center = pearl.slot ? sectionX(pearl.slot.lanes, channels) : laneX(pearl.lane, channels)
    const point = key === 'waiting-lake' ? lakeSeats[game.lakePearls.length + seat] ?? { x: 770, y: 775 } : { x: center + (seat % columns - (columns - 1) / 2) * 23, y: (pearl.slot ? riverTiers[pearl.slot.row] - 39 : 147) - Math.floor(seat / columns) * 23 }
    result.push({ id: `r${game.round}-l${pearl.lane}-${pearl.index}`, color: pearl.color, lane: pearl.lane, index: pearl.index, point, atLake: key === 'waiting-lake' })
  })
  game.lakePearls.forEach((color, index) => result.push({ id: `lake-${index}`, color, lane: null, index, point: lakeSeats[index] ?? { x: 770, y: 775 }, atLake: true }))
  return result
}

export function sampleCurve(points: Point[]): Point[] {
  const route = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], middle = (a.y + b.y) / 2
    for (let n = 1; n <= 12; n++) {
      const t = n / 12, u = 1 - t
      route.push({ x: u ** 3 * a.x + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t ** 3 * b.x, y: u ** 3 * a.y + 3 * u * u * t * middle + 3 * u * t * t * middle + t ** 3 * b.y })
    }
  }
  return route
}

function riverRoute(from: ScenePearl, to: Point, channels: number, atLake = false): Point[] {
  const points = [from.point]
  if (from.lane !== null && to.y > from.point.y + 35) {
    for (let row = 0; row < riverTiers.length; row++) {
      if (riverTiers[row] > from.point.y && riverTiers[row] < to.y) {
        const section = makeRiverSections().find(section => section.row === row && section.lanes.includes(from.lane!))!
        points.push({ x: sectionX(section.lanes, channels), y: riverTiers[row] })
      }
    }
  }
  // Follow the centered outlet before spreading into the visible Lake seats.
  if (atLake && from.lane !== null && from.point.y < 730) points.push({ x: 770, y: 730 })
  points.push(to)
  return sampleCurve(points)
}

function caughtPearl(before: Game, action?: Action): ScenePearl | undefined {
  if (action?.type !== 'collect') return
  const pearls = scenePearls(before)
  if (before.phase === 'lake') return pearls.find(pearl => pearl.lane === null && pearl.index === action.pearlIndex)
  if (before.phase !== 'collect') return
  const slot = before.slots.find(slot => slot.id === before.collectQueue[before.collectIndex])!
  let index = action.pearlIndex
  for (const lane of slot.lanes) {
    const count = before.riverPearls[lane]?.length ?? 0
    if (index < count) return pearls.find(pearl => pearl.lane === lane && pearl.index === index)
    index -= count
  }
}

export function makePresentation(before: Game, after: Game, id: number, action?: Action, populate = false): Presentation | null {
  const kind = populate || after.round !== before.round ? 'populate' : 'move'
  const source = scenePearls(before), target = scenePearls(after), picked = caughtPearl(before, action)
  const player = actor(before)
  const caught = picked && player !== null ? { pearl: picked, player, socket: Math.min(before.players[player].alpaca.length, 5), exchanged: action?.type === 'collect' && action.swapIndex !== undefined ? before.players[player].alpaca[action.swapIndex] : undefined } : undefined
  const removedMarkers = kind === 'populate' ? [] : before.slots.filter(slot => slot.player !== null && after.slots.find(next => next.id === slot.id)?.player === null)
  const moves: PearlMove[] = []
  if (kind === 'populate') {
    target.forEach((pearl, index) => {
      if (pearl.lane === null) moves.push({ pearl, to: pearl.point, route: [pearl.point], delay: 0, duration: 0 })
      else {
        const start = { x: laneX(pearl.lane, after.players.length * 3), y: -20 }
        moves.push({ pearl: { ...pearl, point: start }, to: pearl.point, route: sampleCurve([start, pearl.point]), delay: index * .1, duration: .32, arrive: true })
      }
    })
  } else {
    const available = source.filter(pearl => pearl.id !== picked?.id)
    // Exchanges return to the original source, exactly as in takePearl().
    const exchangeSource: ScenePearl | undefined = caught?.exchanged ? { id: `exchange-${id}`, color: caught.exchanged, lane: picked!.lane, index: -1, point: picked!.point } : undefined
    if (exchangeSource) available.push(exchangeSource)
    target.forEach(next => {
      let index = available.findIndex(pearl => pearl.lane === next.lane && pearl.color === next.color)
      if (index < 0 && next.lane === null) index = available.findIndex(pearl => pearl.color === next.color)
      const previous = index >= 0 ? available.splice(index, 1)[0] : next
      const distance = Math.hypot(next.point.x - previous.point.x, next.point.y - previous.point.y)
      const delay = distance > 1 ? (caught ? .85 : removedMarkers.length ? .28 : .12) + moves.filter(move => move.duration > 0).length * .025 : 0
      const duration = distance > 1 ? Math.min(1.8, .45 + distance / 330) : 0
      moves.push({ pearl: previous, to: next.point, route: riverRoute(previous, next.point, after.players.length * 3, next.atLake), delay, duration, arrive: previous.index === -1 })
    })
    if (picked) moves.push({ pearl: picked, to: picked.point, route: [picked.point], delay: .12, duration: .18, disappear: true })
  }
  const movementEnd = Math.max(0, ...moves.map(move => move.delay + move.duration))
  const cardDraw = action?.type === 'recruit' || (action?.type === 'gain' && player !== null && after.players[player].hand.length > before.players[player].hand.length)
  const pieceMove = action && ['place', 'deliver', 'zephyr', 'pair'].includes(action.type)
  const duration = Math.max(movementEnd, caught ? .9 : 0, removedMarkers.length ? .7 : 0, cardDraw ? 1.15 : 0, pieceMove ? .75 : 0)
  if (!duration) return null
  const message = kind === 'populate' ? `Round ${after.round}: filling the sources, one pearl at a time` : caught ? `${before.players[player!].name}'s pearl travels to the llama` : cardDraw ? action?.type === 'gain' ? 'A Camp card joins your hand' : 'A new Villager joins your village' : action?.type === 'place' ? 'Your Tribe token travels to the board' : action?.type === 'deliver' || action?.type === 'zephyr' ? 'The pearl travels to its Villager' : removedMarkers.length ? 'The marker returns. The current carries the remaining pearls onward' : 'Follow the current downstream'
  const steps = kind === 'populate' ? preparationSteps(before, after, populate) : undefined
  return { id, before, after, action, kind, moves, removedMarkers, caught, duration: steps ? steps[0].duration : duration + .12, message: steps ? steps[0].message : message, preparation: steps ? { steps, index: 0 } : undefined }
}
