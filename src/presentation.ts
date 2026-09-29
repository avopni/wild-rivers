import { actor, makeRiverSections, type Action, type Game, type Pearl, type Slot } from './game'

// Presentation state is transient. The rules, saved games and replay snapshots stay authoritative.
export type Point = { x: number; y: number }
export type ScenePearl = { id: string; color: Pearl; lane: number | null; index: number; point: Point; atLake?: boolean }
export type PearlMove = { pearl: ScenePearl; to: Point; route: Point[]; delay: number; duration: number; disappear?: boolean; arrive?: boolean }
export type Presentation = {
  id: number; before: Game; after: Game; action?: Action; kind: 'populate' | 'move';
  moves: PearlMove[]; removedMarkers: Slot[]; duration: number; message: string;
  caught?: { pearl: ScenePearl; player: number; socket: number; exchanged?: Pearl }
}

export const riverTiers = [165, 260, 360, 460, 550]
export const laneX = (lane: number, channels: number) => 88 + (lane + .5) * 724 / channels
export function sectionX(lanes: number[], channels: number) {
  const active = lanes.filter(lane => lane < channels)
  return (laneX(active[0], channels) + laneX(active.at(-1)!, channels)) / 2
}
export function markerPoint(slot: Slot, channels: number): Point {
  if (slot.kind === 'lake') return { x: 450, y: 646 }
  if (slot.kind === 'village') return { x: 142 + slot.group * 121, y: 723 }
  return { x: sectionX(slot.lanes, channels) + (slot.priority - slot.row / 2) * (slot.row ? 31 : 0), y: riverTiers[slot.row] }
}

// Enough seats for the whole 65-pearl supply, leaving the Lake marker clear.
const lakeSeats: Point[] = []
for (let y = 598; y <= 652; y += 9) for (let x = 351; x <= 549; x += 11) {
  if (((x - 450) / 105) ** 2 + ((y - 625) / 35) ** 2 < .94 && Math.hypot(x - 450, y - 646) > 24) lakeSeats.push({ x, y })
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
    const point = key === 'waiting-lake' ? lakeSeats[game.lakePearls.length + seat] ?? { x: 450, y: 625 } : { x: center + (seat % columns - (columns - 1) / 2) * 15, y: (pearl.slot ? riverTiers[pearl.slot.row] - 31 : 112) - Math.floor(seat / columns) * 15 }
    result.push({ id: `r${game.round}-l${pearl.lane}-${pearl.index}`, color: pearl.color, lane: pearl.lane, index: pearl.index, point, atLake: key === 'waiting-lake' })
  })
  game.lakePearls.forEach((color, index) => result.push({ id: `lake-${index}`, color, lane: null, index, point: lakeSeats[index] ?? { x: 450, y: 625 }, atLake: true }))
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

function riverRoute(from: ScenePearl, to: Point, channels: number): Point[] {
  const points = [from.point]
  if (from.lane !== null && to.y > from.point.y + 35) {
    for (let row = 0; row < riverTiers.length; row++) {
      if (riverTiers[row] > from.point.y && riverTiers[row] < to.y) {
        const section = makeRiverSections().find(section => section.row === row && section.lanes.includes(from.lane!))!
        points.push({ x: sectionX(section.lanes, channels), y: riverTiers[row] })
      }
    }
  }
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
        const start = { x: laneX(pearl.lane, after.players.length * 3) - 7, y: 62 }
        moves.push({ pearl: { ...pearl, point: start }, to: pearl.point, route: sampleCurve([start, pearl.point]), delay: index * .13, duration: .62, arrive: true })
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
      moves.push({ pearl: previous, to: next.point, route: riverRoute(previous, next.point, after.players.length * 3), delay, duration, arrive: previous.index === -1 })
    })
    if (picked) moves.push({ pearl: picked, to: picked.point, route: [picked.point], delay: .12, duration: .18, disappear: true })
  }
  const movementEnd = Math.max(0, ...moves.map(move => move.delay + move.duration))
  const cardDraw = action?.type === 'recruit' || (action?.type === 'gain' && player !== null && after.players[player].hand.length > before.players[player].hand.length)
  const duration = Math.max(movementEnd, caught ? .9 : 0, removedMarkers.length ? .4 : 0, cardDraw ? 1.15 : 0)
  if (!duration) return null
  const message = kind === 'populate' ? `Round ${after.round}: filling the sources, one pearl at a time` : caught ? `${before.players[player!].name}'s pearl travels to the llama` : cardDraw ? action?.type === 'gain' ? 'A Camp card joins your hand' : 'A new Villager joins your table' : removedMarkers.length ? 'The marker lifts. The current carries the remaining pearls onward' : 'The sluice gates open. Follow the current downstream'
  return { id, before, after, action, kind, moves, removedMarkers, caught, duration: duration + .12, message }
}
