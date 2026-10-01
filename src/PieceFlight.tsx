import { useLayoutEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { actor } from './game'
import { assetUrl } from './assets'
import { campInfo } from './CampCard'
import { markerPoint, sampleCurve, type Point, type Presentation } from './presentation'

type Flight = { from: Point; to: Point; color?: string; image?: string; tribe?: number; name?: string; delay?: number }
const tribes = ['#c8795b', '#518f91', '#c39b43', '#9d82b2']
export function PieceFlight({ presentation, animations }: { presentation: Presentation | null; animations: boolean }) {
  const reduced = useReducedMotion(), [flights, setFlights] = useState<Flight[]>([])
  useLayoutEffect(() => {
    if (!presentation || presentation.preparation || !animations || reduced) { setFlights([]); return }
    const { before, after, action } = presentation, who = actor(before), result: Flight[] = []
    const board = document.querySelector<SVGSVGElement>('svg.board'), matrix = board?.getScreenCTM()
    const project = (p: Point): Point | undefined => matrix ? new DOMPoint(p.x, p.y).matrixTransform(matrix) : undefined
    const center = (selector: string): Point | undefined => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined }
    const add = (from: Point | undefined, to: Point | undefined, content: Omit<Flight, 'from' | 'to'>) => { if (from && to) result.push({ from, to, ...content }) }
    const trackPoint = (i: number) => project({ x: 448 + (i + .5) * 555 / 12, y: 1024 })
    if (action?.type === 'place' && who !== null) add(trackPoint(before.exploreTurn), project(markerPoint(before.slots.find(s => s.id === action.slot)!, before.players.length * 3)), { tribe: who, name: before.players[who].name.charAt(0) })
    presentation.removedMarkers.forEach((slot, i) => add(project(markerPoint(slot, before.players.length * 3)), trackPoint(before.players.length * 3 - after.track.length + presentation.removedMarkers.length - 1 - i), { tribe: slot.player!, name: before.players[slot.player!].name.charAt(0), delay: .08 }))
    if ((action?.type === 'deliver' || action?.type === 'zephyr') && who !== null) {
      const fromVillager = action.type === 'zephyr' ? action.fromVillagerId : undefined, fromSocket = action.type === 'zephyr' ? action.fromSocket : undefined
      const color = fromVillager ? before.players[who].villagers.find(v => v.id === fromVillager)?.stored[fromSocket!] : before.players[who].alpaca[action.alpacaIndex!]
      const from = fromVillager ? center(`[data-villager-socket="${fromVillager}-${fromSocket}"]`) : center(`[data-flight-target="player-${who}-llama-${action.alpacaIndex}"]`)
      add(from, center(`[data-villager-socket="${action.villagerId}-${action.socket}"]`), { color: color ?? undefined })
    }
    if (action?.type === 'pair' && action.card === 'Wonder Basket' && action.target && who !== null) {
      const [from, to] = action.target.split('>')
      add(project(markerPoint(before.slots.find(s => s.id === from)!, before.players.length * 3)), project(markerPoint(after.slots.find(s => s.id === to)!, before.players.length * 3)), { tribe: who, name: before.players[who].name.charAt(0) })
    }
    if ((action?.type === 'gain' || action?.type === 'recruit') && who !== null) {
      const destination = center(`[data-player-mat="${who}"] .mat-controls`)
      if (action.type === 'recruit') { const v = before.display.find(v => v.id === action.villagerId); if (v) add(center(`[data-market-villager="${v.id}"]`), destination, { image: assetUrl(v.portrait), name: v.name }) }
      else if (after.players[who].hand.length > before.players[who].hand.length) {
        const card = after.players[who].hand.at(-1)!
        add(center(action.marketIndex === null ? '.scene-camp .camp-deck' : `.scene-camp .camp-tip-wrap:nth-child(${action.marketIndex + 1})`), destination, { image: before.players[who].bot ? undefined : campInfo[card].image, name: before.players[who].bot ? '🔒' : card })
      }
    }
    setFlights(result)
  }, [presentation, animations, reduced])
  if (!flights.length || !presentation) return null
  return <div className="piece-flight-layer" key={presentation.id} aria-hidden="true">{flights.map((flight, i) => { const route = sampleCurve([flight.from, flight.to]); return <motion.div key={i} className={`piece-flight ${flight.color ? `pearl ${flight.color}` : flight.tribe !== undefined ? 'tribe' : 'card-flight'}`} style={flight.tribe !== undefined ? { backgroundColor: tribes[flight.tribe] } : undefined} initial={{ x: flight.from.x, y: flight.from.y, scale: flight.image ? .8 : 1 }} animate={{ x: route.map(p => p.x), y: route.map(p => p.y), scale: flight.image ? [ .8, 1.15, .55 ] : 1 }} transition={{ duration: flight.image ? .95 : .6, delay: flight.delay ?? .05, ease: 'easeInOut' }}>{flight.image && <img src={flight.image} alt=""/>}{!flight.color && <span>{flight.name}</span>}</motion.div> })}</div>
}
