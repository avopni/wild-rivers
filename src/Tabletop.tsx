import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { animate, motion, useReducedMotion } from 'motion/react'
import { actor, type Game } from './game'
import { campInfo } from './CampCard'
import { assetUrl } from './assets'
import { sampleCurve, type Point, type Presentation } from './presentation'

export function PresentationClock({ presentation, animations, finish }: { presentation: Presentation | null; animations: boolean; finish: (id: number) => void }) {
  const reduced = useReducedMotion()
  useEffect(() => {
    if (!presentation) return
    const playback = animate(0, 1, { duration: animations && !reduced ? presentation.duration : .06, onComplete: () => finish(presentation.id) })
    return () => playback.stop()
  }, [presentation, animations, reduced, finish])
  return null
}

export function JourneyFlow({ game, presentation, finish, animations, setAnimations }: { game: Game; presentation: Presentation | null; finish: () => void; animations: boolean; setAnimations: (enabled: boolean) => void }) {
  const phases = ['Place tokens', 'Gather pearls', 'Meet Villagers', 'Deliver pearls']
  const step = game.phase === 'explore' ? 0 : game.phase === 'collect' || game.phase === 'lake' ? 1 : game.phase === 'recruit' ? 2 : 3
  return <div className="journey-flow">
    <ol aria-label="Round progress">{phases.map((phase, index) => <li key={phase} className={index === step ? 'current' : index < step ? 'complete' : ''} aria-current={index === step ? 'step' : undefined}><span>{index < step ? '✓' : index + 1}</span>{phase}</li>)}</ol>
    <div className="journey-playback"><span role="status" aria-live="polite">{presentation?.message ?? `Round ${game.round} · ${phases[step]}`}</span><div>{presentation && <button onClick={finish}>Skip animation</button>}<label><input type="checkbox" checked={animations} onChange={event => setAnimations(event.target.checked)}/> Animations</label></div></div>
  </div>
}

function tableInstruction(game: Game) {
  if (game.pendingDraws) return ['Draw a Camp card', `Choose from the market or draw from the deck. ${game.pendingDraws.count} remaining.`]
  if (game.phase === 'explore') return game.afterPlace ? ['Finish your turn', 'Play an optional Camp pair, then pass the turn.'] : ['Place your Tribe token', 'Choose a highlighted space on the river board.']
  if (game.phase === 'collect' || game.phase === 'lake') return [game.pendingExtra ? 'Choose your extra pearl' : 'Choose a pearl for your llama', 'Choose a pearl on the river or at the table, then take it.']
  if (game.phase === 'recruit') return game.recruitedThisSlot ? ['Your Villager has joined', 'Play a Shamisen pair or continue.'] : ['Welcome a Villager', 'Choose a portrait card to join your village.']
  if (game.phase === 'deliver') return ['Bring your pearls home', 'Choose a llama pearl and a matching Villager socket.']
  return ['Journey complete', 'Your final scores are ready.']
}

export function TabletopStage({ game, presentation, children }: { game: Game; presentation: Presentation | null; children: ReactNode }) {
  const who = actor(game), player = who !== null ? game.players[who] : null
  const [title, hint] = tableInstruction(game)
  return <section className={`tabletop-stage stage-${game.pendingDraws ? 'camp' : game.phase}`} aria-labelledby="tabletop-title" aria-busy={!!presentation}>
    <header className="tabletop-heading"><div><span className="eyebrow">{player ? `${player.name}'s table` : 'The table'}</span><h2 id="tabletop-title">{presentation?.kind === 'populate' ? 'The river awakens' : title}</h2><p>{presentation?.kind === 'populate' ? 'Watch each pearl arrive and settle behind its gate.' : hint}</p></div><span className="tabletop-round">{String(game.round).padStart(2, '0')}<small>ROUND</small></span></header>
    <motion.div className="tabletop-content" key={`${game.phase}-${who}-${!!game.pendingDraws}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .28 }}>
      {children}
      {player?.bot && <p className="table-bot-note" role="status">{presentation ? 'Watch the move unfold.' : `${player.name} is choosing…`}</p>}
      {game.phase === 'explore' && !game.afterPlace && !game.pendingDraws && <div className="table-board-invite"><span className="table-token">{who !== null ? who + 1 : '≈'}</span><span>Your token is ready.<br/><small>The highlighted circles below are available.</small></span></div>}
    </motion.div>
    {presentation?.action && <DrawReveal presentation={presentation}/>}
  </section>
}

function DrawReveal({ presentation }: { presentation: Presentation }) {
  const { action, before, after } = presentation
  if (action?.type !== 'gain' && action?.type !== 'recruit') return null
  const player = actor(before)
  if (player === null) return null
  const camp = action.type === 'gain' && after.players[player].hand.length > before.players[player].hand.length ? after.players[player].hand.at(-1) : undefined
  const villager = action.type === 'recruit' ? before.display.find(villager => villager.id === action.villagerId) : undefined
  if (!camp && !villager) return null
  return <div className="draw-reveal" aria-live="polite"><motion.div className="revealed-card" initial={{ rotateY: -90, y: 24, scale: .85 }} animate={{ rotateY: 0, y: 0, scale: 1 }} transition={{ duration: .45, ease: [.2, .75, .3, 1] }}><img src={villager ? assetUrl(villager.portrait) : campInfo[camp!].image} alt=""/><span className="eyebrow">{villager ? 'YOUR NEW VILLAGER' : 'ADDED TO YOUR HAND'}</span><strong>{villager?.name ?? camp}</strong></motion.div></div>
}

type Flight = { color: string; route: Point[]; delay: number; duration: number }
export function PearlFlight({ presentation, animations }: { presentation: Presentation | null; animations: boolean }) {
  const reduced = useReducedMotion()
  const [flights, setFlights] = useState<Flight[]>([])
  useLayoutEffect(() => {
    const caught = presentation?.caught
    if (!caught || !animations || reduced) { setFlights([]); return }
    const board = document.querySelector<SVGSVGElement>('svg.board')
    const target = document.querySelector<HTMLElement>(`[data-flight-target="llama-${caught.socket}"]`)
    const matrix = board?.getScreenCTM()
    if (!matrix || !target) { setFlights([]); return }
    const origin = new DOMPoint(caught.pearl.point.x, caught.pearl.point.y).matrixTransform(matrix)
    const rect = target.getBoundingClientRect(), destination = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const result: Flight[] = [{ color: caught.pearl.color, route: sampleCurve([origin, destination]), delay: .12, duration: .7 }]
    if (caught.exchanged && presentation.action?.type === 'collect') {
      const exchangedSlot = document.querySelector<HTMLElement>(`[data-flight-target="llama-${presentation.action.swapIndex}"]`)
      if (exchangedSlot) { const rect = exchangedSlot.getBoundingClientRect(); result.push({ color: caught.exchanged, route: sampleCurve([{ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, origin]), delay: .02, duration: .65 }) }
    }
    setFlights(result)
  }, [presentation, animations, reduced])
  if (!presentation?.caught || !flights.length) return null
  return <div className="pearl-flight-layer" aria-hidden="true" key={presentation.id}>{flights.map((flight, index) => <motion.div key={index} className={`pearl flying-pearl ${flight.color}`} initial={{ x: flight.route[0].x, y: flight.route[0].y, opacity: 0, scale: .75 }} animate={{ x: flight.route.map(point => point.x), y: flight.route.map(point => point.y), opacity: [0, 1, 1, 1], scale: [.75, 1.15, 1] }} transition={{ duration: flight.duration, delay: flight.delay, ease: [.2, .65, .3, 1] }}/>)}</div>
}
