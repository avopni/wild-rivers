import { motion, useReducedMotion } from 'motion/react'
import { makeRiverSections, slotLabel, type Game, type Slot } from './game'
import { boardLayout } from './boardLayout'
import { fairyPoint, laneX, markerPoint, preparationGame, preparationStep, riverTiers, scenePearls, sectionX, type PearlMove, type Presentation } from './presentation'

const tribes = ['#c8795b', '#518f91', '#c39b43', '#9d82b2']
const pearlColors = { green: '#65b777', blue: '#58b1da', pink: '#dc8da9', purple: '#a775c4', white: '#fffaf0' }
export const fairySymbol = (fairy: string) => ({ Emberglow: '✦', Zephyr: '❧', Moonveil: '☁', Wildbloom: '♧', Dewdrop: '≈' } as Record<string, string>)[fairy]
function RiverPearl({ move, choose, selected, reduced }: { move: PearlMove; choose?: () => void; selected: boolean; reduced: boolean }) {
  const moving = !reduced && move.duration > 0
  const lengths = move.route.map((p, i) => i ? Math.hypot(p.x - move.route[i - 1].x, p.y - move.route[i - 1].y) : 0)
  const total = lengths.reduce((a, b) => a + b, 0); let progress = 0
  const times = lengths.map((length, i) => { progress += length; return total ? progress / total : i / Math.max(1, lengths.length - 1) })
  return <motion.g data-scene-pearl={move.pearl.id} className={`river-pearl ${choose ? 'board-action' : ''}`} initial={{ x: move.pearl.point.x, y: move.pearl.point.y, opacity: move.arrive && !reduced ? 0 : 1 }} animate={{ x: moving ? move.route.map(p => p.x) : move.to.x, y: moving ? move.route.map(p => p.y) : move.to.y, opacity: move.disappear ? 0 : 1 }} transition={{ duration: reduced ? 0 : move.duration, delay: reduced ? 0 : move.delay, ease: 'linear', times }} role={choose ? 'button' : undefined} tabIndex={choose ? 0 : undefined} aria-label={`Choose ${move.pearl.color} pearl`} aria-pressed={selected} onClick={choose} onKeyDown={e => { if (choose && ['Enter', ' '].includes(e.key)) { e.preventDefault(); choose() } }}>
    <title>{move.pearl.color} pearl</title>{choose && <circle r="25" fill="transparent"/>}{selected && <circle r="18" fill="none" stroke="#ffdf99" strokeWidth="4"/>}<circle r={move.pearl.atLake ? 8 : 13} fill={`url(#p-${move.pearl.color})`} stroke="#fbf0cf" strokeWidth="1.5"/><ellipse cx="-4" cy="-5" rx="4" ry="2" fill="#fff" opacity=".9"/>
  </motion.g>
}
export function RiverBoard({ game: input, legal, choose, presentation, selectedPearl, onPearlSelect, animations = true }: { game: Game; legal: Set<string>; choose: (slot: Slot) => void; presentation?: Presentation | null; selectedPearl?: number | null; onPearlSelect?: (index: number) => void; animations?: boolean }) {
  const game = presentation?.preparation ? preparationGame(presentation) : presentation?.after ?? input
  const reduced = !!useReducedMotion() || !animations, channels = game.players.length * 3, step = preparationStep(presentation)
  const layout = boardLayout(game.players.length)
  const sections = makeRiverSections().filter(s => s.lanes.some(l => l < channels))
  const currentSlot = input.phase === 'collect' ? input.slots.find(s => s.id === input.collectQueue[input.collectIndex]) : undefined
  const available = scenePearls(input).filter(p => input.phase === 'lake' ? p.lane === null : p.lane !== null && currentSlot?.lanes.includes(p.lane)).sort((a, b) => (a.lane ?? 0) - (b.lane ?? 0) || a.index - b.index)
  const pearls = presentation && (!presentation.preparation || step?.kind === 'pearls') ? presentation.moves : scenePearls(game).map(pearl => ({ pearl, to: pearl.point, route: [pearl.point], duration: 0, delay: 0 }))
  const edges = new Map<string, { d: string; row: number }>()
  for (let lane = 0; lane < channels; lane++) {
    let from = { x: laneX(lane, channels), y: 177 }
    sections.filter(s => s.lanes.includes(lane)).forEach(s => {
      const to = { x: sectionX(s.lanes, channels), y: riverTiers[s.row] }, mid = (from.y + to.y) / 2
      edges.set(`${from.x}-${from.y}-${to.x}-${to.y}`, { d: `M${from.x} ${from.y} C${from.x} ${mid} ${to.x} ${mid} ${to.x} ${to.y}`, row: s.row }); from = to
    })
  }
  function slotButton(slot: Slot) {
    const point = markerPoint(slot, channels), active = legal.has(slot.id), occupied = slot.player !== null
    const invisible = slot.kind === 'lake' && !active && !occupied
    const action = presentation?.action
    const moving = !reduced && (action?.type === 'place' && action.slot === slot.id || action?.type === 'pair' && action.card === 'Wonder Basket' && action.target?.split('>')[1] === slot.id)
    return <g key={slot.id} data-river-slot={slot.kind === 'river' ? slot.id : undefined} data-village-slot={slot.kind === 'village' ? slot.id : undefined} data-lake-slot={slot.kind === 'lake' ? true : undefined} className={active ? 'board-action' : ''} role={active ? 'button' : undefined} tabIndex={active ? 0 : undefined} aria-label={`${slotLabel(slot)}, ${occupied ? game.players[slot.player!].name : 'empty'}`} onClick={() => { if (active) choose(slot) }} onKeyDown={e => { if (active && ['Enter', ' '].includes(e.key)) { e.preventDefault(); choose(slot) } }}>
      <title>{slotLabel(slot)}</title><circle cx={point.x} cy={point.y} r={slot.kind === 'village' ? 30 : 27} fill="transparent"/>{active && <circle cx={point.x} cy={point.y} r={slot.kind === 'lake' ? 29 : 23} fill="none" stroke="#f3d18b" strokeWidth="3"/>}
      <circle cx={point.x} cy={point.y} r={slot.kind === 'lake' ? 24 : slot.kind === 'village' ? 21 : layout.slotRadius} fill={invisible ? 'transparent' : occupied && !moving ? tribes[slot.player!] : '#e5d9b8'} stroke={invisible ? 'none' : active ? '#ffdca1' : '#8a805e'} strokeWidth="2"/>
      {!invisible && !moving && <text x={point.x} y={point.y + 5} textAnchor="middle" fill={occupied ? '#fff4d4' : '#534c36'} fontSize="15">{occupied ? game.players[slot.player!].name.charAt(0).toUpperCase() : slot.kind === 'village' ? slot.group + 1 : ''}</text>}
      {slot.kind === 'village' && <text x={point.x} y="956" textAnchor="middle" fill="#efe0c0" fontSize="15">{slot.cost ? `−${slot.cost} cards` : 'Free'}</text>}
    </g>
  }
  return <svg className="board" data-board-players={game.players.length} viewBox="0 0 1532 1080" preserveAspectRatio="none" role="group" aria-label={`${game.players.length}-player board: ${channels} source channels merge through five tiers into the Lake`}>
    <defs><linearGradient id="water"><stop stopColor="#b0e8de"/><stop offset=".3" stopColor="#65b8c2"/><stop offset="1" stopColor="#408c9c"/></linearGradient><linearGradient id="platform" x2="0" y2="1"><stop stopColor="#b8aa86"/><stop offset=".4" stopColor="#656c58"/><stop offset="1" stopColor="#a89972"/></linearGradient>{Object.entries(pearlColors).map(([color, fill]) => <radialGradient key={color} id={`p-${color}`} cx="30%" cy="25%"><stop stopColor="#fff"/><stop offset=".3" stopColor={fill}/><stop offset="1" stopColor={fill} stopOpacity=".7"/></radialGradient>)}</defs>
    {[...edges.values()].map((edge, i) => <g key={i}><path d={edge.d} fill="none" stroke="#153d3b" strokeWidth={28 + edge.row * 3} strokeLinecap="round"/><path d={edge.d} fill="none" stroke="url(#water)" strokeWidth={21 + edge.row * 3} strokeLinecap="round"/><path d={edge.d} fill="none" stroke="#d0f5ee" strokeWidth="2" strokeDasharray="19 14 8 27" opacity=".6"/></g>)}
    <path data-lake-inlet="true" d="M770 692 V760" fill="none" stroke="#75c1c6" strokeWidth="38"/>
    {riverTiers.map((y, row) => <g key={row}><rect x="25" y={y - 23} width="56" height="46" rx="9" fill="#ead9b4" stroke="#b19a71" strokeWidth="2"/><text x="53" y={y + 7} textAnchor="middle" fill="#3e4536" fontFamily="Georgia" fontSize="23">{['−3', '−2', '−1', '0', '+1'][row]}</text></g>)}
    {sections.map(s => <rect key={s.id} x={sectionX(s.lanes, channels) - (s.capacity * layout.slotSpacing + 14) / 2} y={riverTiers[s.row] - layout.platformHeight / 2} width={s.capacity * layout.slotSpacing + 14} height={layout.platformHeight} rx={layout.platformHeight / 2} fill="url(#platform)" stroke={currentSlot?.section === s.id ? '#ffdf99' : '#b4a381'} strokeWidth="2.5"/>)}
    {Array.from({ length: channels }, (_, lane) => { const x = laneX(lane, channels); return <g key={lane} aria-label={`Source ${lane + 1} gate`}><path d={`M${x - 21} 157 V181 M${x + 21} 157 V181`} stroke="#7b6648" strokeWidth="5"/><motion.rect x={x - 18} y="166" width="36" height="11" rx="3" fill="#665439" stroke="#c6ad76" strokeWidth="2" initial={false} animate={{ y: game.phase === 'explore' ? 0 : -30, opacity: game.phase === 'explore' ? 1 : 0 }} transition={{ duration: reduced ? 0 : .3 }}/></g> })}
    <rect x="448" y="882" width="555" height="90" rx="9" fill="#203526ed" stroke="#967850" strokeWidth="2"/>{game.slots.map(slotButton)}
    {game.fairySites.filter(site => sections.some(s => s.id === site.section)).map(site => { const p = fairyPoint(game, site.id); return <g key={site.id} data-faerie-site={site.id}><title>{site.kind === 'stump' ? 'Stump' : 'Statue'} · {site.fairies.join(', ') || 'empty'}</title><circle cx={p.x} cy={p.y} r="11" fill={site.kind === 'stump' ? '#8b7951' : '#ccb992'} stroke="#dbc492"/><text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12" fill="#273b2c">{site.kind === 'stump' ? '⊙' : '♧'}</text>{site.fairies.map((fairy, i) => <motion.g key={i} initial={step?.kind === 'fairy' && step.site === site.id && i === site.fairies.length - 1 ? { x: 766, y: 430, scale: 4 } : false} animate={{ x: p.x + 17 + i * 24, y: p.y - 8, scale: 1 }} transition={{ duration: reduced ? 0 : .55 }}><circle r="11" fill="#b0dfd6" stroke="#dfc185" strokeWidth="2"/><text y="4" textAnchor="middle" fontSize="15" fill="#306e6e">{fairySymbol(fairy)}</text></motion.g>)}</g> })}
    {pearls.map(move => { const index = available.findIndex(p => p.id === move.pearl.id); return <RiverPearl key={`${presentation?.id ?? 'rest'}-${step?.kind ?? ''}-${move.pearl.id}`} move={move as PearlMove} reduced={reduced} selected={index >= 0 && selectedPearl === index} choose={!presentation && index >= 0 && onPearlSelect ? () => onPearlSelect(index) : undefined}/> })}
  </svg>
}
