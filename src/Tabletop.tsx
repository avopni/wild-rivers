import { useEffect, useLayoutEffect, useState } from 'react'
import { animate, motion, useReducedMotion } from 'motion/react'
import { preparationStep, sampleCurve, type Point, type Presentation } from './presentation'

export function PresentationClock({ presentation, animations, finish }: { presentation: Presentation | null; animations: boolean; finish: (id: number, step?: number) => void }) {
  const reduced = useReducedMotion()
  useEffect(() => {
    if (!presentation || ['read', 'review'].includes(preparationStep(presentation)?.kind ?? '')) return
    const playback = animate(0, 1, { duration: animations && !reduced ? presentation.duration : .06, onComplete: () => finish(presentation.id, presentation.preparation?.index) })
    return () => playback.stop()
  }, [presentation, animations, reduced, finish])
  return null
}

type Flight = { color: string; route: Point[]; delay: number; duration: number }
export function PearlFlight({ presentation, animations }: { presentation: Presentation | null; animations: boolean }) {
  const reduced = useReducedMotion()
  const [flights, setFlights] = useState<Flight[]>([])
  useLayoutEffect(() => {
    const caught = presentation?.caught
    if (!caught || !animations || reduced) { setFlights([]); return }
    const board = document.querySelector<SVGSVGElement>('svg.board')
    const target = document.querySelector<HTMLElement>(`[data-flight-target="player-${caught.player}-llama-${caught.socket}"]`)
    const matrix = board?.getScreenCTM()
    if (!matrix || !target) { setFlights([]); return }
    const origin = new DOMPoint(caught.pearl.point.x, caught.pearl.point.y).matrixTransform(matrix)
    const rect = target.getBoundingClientRect(), destination = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const result: Flight[] = [{ color: caught.pearl.color, route: sampleCurve([origin, destination]), delay: .12, duration: .7 }]
    if (caught.exchanged && presentation.action?.type === 'collect') {
      const exchangedSlot = document.querySelector<HTMLElement>(`[data-flight-target="player-${caught.player}-llama-${presentation.action.swapIndex}"]`)
      if (exchangedSlot) { const rect = exchangedSlot.getBoundingClientRect(); result.push({ color: caught.exchanged, route: sampleCurve([{ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, origin]), delay: .02, duration: .65 }) }
    }
    setFlights(result)
  }, [presentation, animations, reduced])
  if (!presentation?.caught || !flights.length) return null
  return <div className="pearl-flight-layer" aria-hidden="true" key={presentation.id}>{flights.map((flight, index) => <motion.div key={index} className={`pearl flying-pearl ${flight.color}`} initial={{ x: flight.route[0].x, y: flight.route[0].y, opacity: 0, scale: .75 }} animate={{ x: flight.route.map(point => point.x), y: flight.route.map(point => point.y), opacity: [0, 1, 1, 1], scale: [.75, 1.15, 1] }} transition={{ duration: flight.duration, delay: flight.delay, ease: [.2, .65, .3, 1] }}/>)}</div>
}
