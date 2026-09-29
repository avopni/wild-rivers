import { motion, useReducedMotion } from 'motion/react'
import type { Game, Pearl, Slot } from './game'
import { makeRiverSections, slotLabel } from './game'
import { markerPoint, scenePearls, type PearlMove, type Presentation } from './presentation'

const playerColors = ['#e17b62', '#6e9e9d', '#d0a04a', '#9b85b4']
const pearlColors: Record<string, string> = { green: '#77ae72', blue: '#5dadd1', pink: '#e69ab0', purple: '#9273b9', white: '#fffaf0' }
const tiers = [165, 260, 360, 460, 550]
const tierLabels = ['−3', '−2', '−1', '0', '+1']

type Edge = { id: string; x1: number; y1: number; x2: number; y2: number; width: number }
function flowEdges(activeChannels: number, x: (lane: number) => number): Edge[] {
  const sections = makeRiverSections()
  const edges = new Map<string, Edge>()
  const center = (lanes: number[]) => {
    const visible = lanes.filter(lane => lane < activeChannels)
    return (x(visible[0]) + x(visible.at(-1)!)) / 2
  }
  for (let lane = 0; lane < activeChannels; lane++) {
    let from = { key: `source-${lane}`, size: 1, center: x(lane) }
    for (let row = 0; row < 5; row++) {
      const section = sections.find(section => section.row === row && section.lanes.includes(lane))!
      const to = { key: section.id, size: section.lanes.filter(lane => lane < activeChannels).length, center: center(section.lanes) }
      const id = `${from.key}>${to.key}`
      if (!edges.has(id)) edges.set(id, { id, x1: from.center, y1: row === 0 ? 105 : tiers[row - 1], x2: to.center, y2: tiers[row], width: Math.min(38, 14 + from.size * 4) })
      from = to
    }
    const id = `lake:${from.key}`
    if (!edges.has(id)) edges.set(id, { id, x1: from.center, y1: tiers[4], x2: 450, y2: 633, width: 38 })
  }
  return [...edges.values()]
}
function path(edge: Edge) {
  const middle = (edge.y1 + edge.y2) / 2
  return `M ${edge.x1} ${edge.y1} C ${edge.x1} ${middle}, ${edge.x2} ${middle}, ${edge.x2} ${edge.y2}`
}
function fairyIcon(fairy: string) { return ({ Bonfire: '✦', Breeze: '↝', Cloud: '☁', Mushroom: '♣', River: '≈' } as Record<string, string>)[fairy] }

function RiverPearl({ move, selected, choose, reduced }: { move: PearlMove; selected: boolean; choose?: () => void; reduced: boolean }) {
  const { pearl, route } = move
  const lengths = route.map((point, index) => index ? Math.hypot(point.x - route[index - 1].x, point.y - route[index - 1].y) : 0)
  const length = lengths.reduce((a, b) => a + b, 0)
  let progress = 0
  const times = lengths.map((part, index) => { progress += part; return length ? progress / length : index / Math.max(1, route.length - 1) })
  const moving = !reduced && move.duration > 0
  return <motion.g className={`river-pearl ${choose ? 'pearl-action' : ''}`} data-scene-pearl={pearl.id}
    initial={{ x: pearl.point.x, y: pearl.point.y, opacity: move.arrive && !reduced ? 0 : 1 }}
    animate={{ x: moving ? route.map(point => point.x) : move.to.x, y: moving ? route.map(point => point.y) : move.to.y, opacity: move.disappear ? 0 : 1 }}
    transition={{ duration: reduced ? 0 : move.duration, delay: reduced ? 0 : move.delay, ease: 'linear', times, opacity: { duration: .16, delay: reduced ? 0 : move.delay } }}
    role={choose ? 'button' : undefined} tabIndex={choose ? 0 : undefined} aria-label={choose ? `Choose ${pearl.color} pearl` : undefined} aria-pressed={choose ? selected : undefined}
    onClick={choose} onKeyDown={event => { if (choose && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); choose() } }}>
    <title>{`${pearl.color} pearl`}</title>
    {choose && <circle r="14" fill="transparent"/>}
    {selected && <circle r="12" fill="none" stroke="#f8ce78" strokeWidth="3"/>}
    <circle cy="2" r={pearl.atLake ? 5 : 8} fill="#264f57" opacity=".22"/>
    <circle r={pearl.atLake ? 5 : 8} fill={`url(#pearl-${pearl.color})`} stroke="#fff8e7" strokeWidth="1.2"/>
    <ellipse cx="-2" cy="-3" rx={pearl.atLake ? 1.5 : 2.5} ry="1.5" fill="#fff" opacity=".8"/>
  </motion.g>
}

export function RiverBoard({ game: inputGame, legal, choose, presentation, selectedPearl, onPearlSelect, animations = true }: { game: Game; legal: Set<string>; choose: (slot: Slot) => void; presentation?: Presentation | null; selectedPearl?: number | null; onPearlSelect?: (index: number) => void; animations?: boolean }) {
  const game = presentation?.after ?? inputGame
  const reduced = !!useReducedMotion() || !animations
  const pearls = presentation?.moves ?? scenePearls(game).map(pearl => ({ pearl, to: pearl.point, route: [pearl.point], duration: 0, delay: 0 }))
  const currentSlot = inputGame.phase === 'collect' ? inputGame.slots.find(slot => slot.id === inputGame.collectQueue[inputGame.collectIndex]) : undefined
  const availablePearls = scenePearls(inputGame).filter(pearl => inputGame.phase === 'lake' ? pearl.lane === null : pearl.lane !== null && currentSlot?.lanes.includes(pearl.lane)).sort((a, b) => (a.lane ?? 0) - (b.lane ?? 0) || a.index - b.index)
  const channels = game.players.length * 3
  const x = (lane: number) => 88 + (lane + .5) * 724 / channels
  const sections = makeRiverSections().filter(section => section.lanes.some(lane => lane < channels))
  const sectionCenter = (lanes: number[]) => {
    const visible = lanes.filter(lane => lane < channels)
    return (x(visible[0]) + x(visible.at(-1)!)) / 2
  }
  const edges = flowEdges(channels, x)
  const lake = game.slots.find(slot => slot.id === 'lake')!
  const village = game.slots.filter(slot => slot.kind === 'village')
  const button = (slot: Slot, cx: number, cy: number, radius = 16) => {
    const available = legal.has(slot.id)
    return <g key={slot.id} className={available ? 'board-action' : ''} role={available ? 'button' : undefined} tabIndex={available ? 0 : undefined}
      aria-label={`${slotLabel(slot)}${slot.player === null ? ', empty' : `, occupied by ${game.players[slot.player].name}`}`}
      onClick={() => choose(slot)} onKeyDown={event => { if (available && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); choose(slot) } }}>
      <title>{`${slotLabel(slot)} · ${slot.player === null ? 'Empty' : game.players[slot.player].name}`}</title>
      {available && <circle cx={cx} cy={cy} r={radius + 5} fill="#f8d984" opacity=".5"/>}
      <circle cx={cx} cy={cy} r={radius} fill={slot.player !== null ? playerColors[slot.player] : available ? '#fffaf0' : '#d8d6ca'} stroke={slot.player !== null ? '#fff7e8' : available ? '#a7834d' : '#9aa9a4'} strokeWidth="2.5"/>
      <text x={cx} y={cy + 5} textAnchor="middle" className="svg-marker">{slot.player !== null ? slot.player + 1 : available ? '+' : '·'}</text>
    </g>
  }
  return <div className="board-wrap" aria-busy={!!presentation}><svg className="board merged-board" viewBox="0 0 900 760" role="group" aria-label={`${channels} source channels merge through five placement tiers into the Lake`}>
    <defs>
      <linearGradient id="boardGround" x2="0" y2="1"><stop stopColor="#ddd2c2"/><stop offset=".5" stopColor="#efe7d4"/><stop offset="1" stopColor="#d8c9a9"/></linearGradient>
      <linearGradient id="waterfall" x2="0" y2="1"><stop stopColor="#668c9a"/><stop offset="1" stopColor="#b4d8dd"/></linearGradient>
      <linearGradient id="stream" x2="0" y2="1"><stop stopColor="#8bbdc7"/><stop offset="1" stopColor="#c3e6e6"/></linearGradient>
      <radialGradient id="lakeWater"><stop stopColor="#d4eff0"/><stop offset="1" stopColor="#94c6cc"/></radialGradient>
      <filter id="streamShadow"><feGaussianBlur stdDeviation="3"/></filter>
      {(Object.entries(pearlColors) as [Pearl, string][]).map(([color, fill]) => <radialGradient key={color} id={`pearl-${color}`} cx="30%" cy="25%" r="80%"><stop stopColor="#fffdf5"/><stop offset=".35" stopColor={fill}/><stop offset="1" stopColor={fill} stopOpacity=".85"/></radialGradient>)}
    </defs>
    <rect width="900" height="760" rx="24" fill="url(#boardGround)"/>
    <path d="M0 105 Q85 77 171 91 T340 84 T510 87 T680 82 T900 88 V0 H0Z" fill="#7b7182" opacity=".46"/>
    <path d="M0 87 Q135 65 265 82 T520 75 T900 78 V0 H0Z" fill="#b78285" opacity=".52"/>
    <path d="M0 105 Q130 94 245 99 T490 98 T735 95 T900 103 V72 Q690 57 480 67 T0 70Z" fill="url(#waterfall)"/>
    <path d="M0 105 Q190 93 410 101 T900 103" fill="none" stroke="#e9f7ec" strokeWidth="5" opacity=".7"/>
    <text x="24" y="33" className="svg-kicker">THE RIVER BOARD</text><text x="762" y="33" className="svg-kicker">ROUND {game.round} / 5</text>
    <g aria-label={`Turn order: ${game.track.map(id => game.players[id].name).join(', ')}`}>
      {game.track.map((id, index) => <g key={index} transform={`translate(${450 + (index - (game.track.length - 1) / 2) * 34} 28)`}>
        <rect x="-14" y="-14" width="28" height="28" rx="6" fill={playerColors[id]} stroke="#fff6e6" strokeWidth="2"/>
        <text y="5" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fffaf0">{game.players[id].name.trim().charAt(0).toUpperCase()}</text>
      </g>)}
    </g>
    <path d="M0 222 Q100 205 150 280 T350 320 Q300 440 60 420 L0 390Z" fill="#b9bea0" opacity=".24"/>
    <path d="M900 185 Q805 214 774 300 T760 420 Q836 450 900 417Z" fill="#b7bf9d" opacity=".28"/>
    {[...Array(10)].map((_, i) => <g key={i} transform={`translate(${30 + (i * 149) % 840} ${225 + (i * 83) % 280})`} opacity=".4"><path d="M0 0 8 -24 16 0Z" fill="#547b6e"/><path d="M3 -11 8 -32 13 -11Z" fill="#406b66"/><rect x="7" y="0" width="2" height="8" fill="#6d6250"/></g>)}
    {edges.map(edge => <g key={edge.id}><path d={path(edge)} fill="none" stroke="#486c72" strokeWidth={edge.width + 9} opacity=".35" filter="url(#streamShadow)" strokeLinecap="round"/><path d={path(edge)} fill="none" stroke="#56858c" strokeWidth={edge.width + 5} strokeLinecap="round"/><path d={path(edge)} fill="none" stroke="url(#stream)" strokeWidth={edge.width} strokeLinecap="round"/><path d={path(edge)} fill="none" stroke="#e2f6f0" strokeWidth={Math.max(3, edge.width / 4)} opacity=".55" strokeLinecap="round"/></g>)}
    {Array.from({ length: channels }, (_, lane) => <g key={lane}>
      <path d={`M${x(lane)-10} 100 Q${x(lane)} 90 ${x(lane)+10} 100`} fill="none" stroke="#f3f4e7" strokeWidth="3"/>
      <g aria-label={`Source ${String.fromCharCode(65 + lane)} sluice gate`}><rect x={x(lane)-14} y="121" width="4" height="16" rx="2" fill="#846d53"/><rect x={x(lane)+10} y="121" width="4" height="16" rx="2" fill="#846d53"/>
        <motion.g initial={false} animate={{ y: game.phase === 'explore' ? 0 : -10, opacity: game.phase === 'explore' ? 1 : .15 }} transition={{ duration: reduced ? 0 : .3 }}><rect x={x(lane)-12} y="125" width="24" height="6" rx="2" fill="#735946" stroke="#ddc296" strokeWidth="1.5"/><path d={`M${x(lane)-8} 128 H${x(lane)+8}`} stroke="#b2946a" strokeWidth="1"/></motion.g>
      </g>
      <text x={x(lane)} y="84" textAnchor="middle" className="svg-source-label">{String.fromCharCode(65 + lane)}</text>
    </g>)}
    {tiers.map((y, row) => <g key={row}><rect x="22" y={y - 17} width="49" height="34" rx="10" fill="#fff7e5" stroke="#b9a57e"/><text x="46" y={y + 5} textAnchor="middle" className="svg-cost">{tierLabels[row]}</text></g>)}
    {sections.map(section => {
      const sectionSlots = game.slots.filter(slot => slot.section === section.id)
      const center = sectionCenter(section.lanes)
      const y = tiers[section.row]
      const spacing = section.capacity === 1 ? 0 : 31
      const width = Math.max(40, section.capacity * spacing + 16)
      return <g key={section.id}>
        <rect x={center - width / 2} y={y - 23} width={width} height="46" rx="23" fill="#eee5ce" stroke={currentSlot?.section === section.id ? '#bd944f' : '#8d9d93'} strokeWidth={currentSlot?.section === section.id ? 3 : 2} opacity=".94"/>
        {sectionSlots.map(slot => button(slot, center + (slot.priority - (section.capacity - 1) / 2) * spacing, y, section.row === 0 && channels === 12 ? 13 : 15))}
      </g>
    })}
    {game.fairySites.filter(site => sections.some(section => section.id === site.section)).map(site => {
      const section = sections.find(section => section.id === site.section)!
      const siblings = game.fairySites.filter(other => other.section === site.section)
      const index = siblings.findIndex(other => other.id === site.id)
      const center = sectionCenter(section.lanes) + (index - (siblings.length - 1) / 2) * 28
      const y = tiers[section.row]
      const iconY = y - 39
      return <g key={site.id}>
        <title>{`${site.kind === 'stump' ? 'Stump' : 'Rabbit'} ${site.id.slice(-1)}${site.fairies.length ? `: ${site.fairies.join(', ')}` : ''}`}</title>
        <g opacity=".35"><circle cx={center} cy={iconY} r="15" fill={site.kind === 'stump' ? '#876d55' : '#f4e8d6'} stroke="#fff7dc" strokeWidth="2"/>
        <text x={center} y={iconY + 5} textAnchor="middle" fontSize="18">{site.kind === 'stump' ? '🪵' : '🐇'}</text></g>
        {site.fairies.map((fairy, i) => <g key={i}><circle cx={center + 13 + i * 13} cy={iconY - 13} r="10" fill="#f3d487" stroke="#fff7dc" strokeWidth="2"/><text x={center + 13 + i * 13} y={iconY - 9} textAnchor="middle" fontSize="12" fill="#695b49">{fairyIcon(fairy)}</text></g>)}
      </g>
    })}
    <ellipse cx="450" cy="633" rx="119" ry="49" fill="#567a7d" opacity=".32"/>
    <ellipse cx="450" cy="625" rx="111" ry="43" fill="url(#lakeWater)" stroke="#567e84" strokeWidth="5"/>
    <text x="450" y="588" textAnchor="middle" className="svg-lake-label">THE LAKE · {scenePearls(game).filter(pearl => pearl.atLake).length}</text>
    {button(lake, 450, 646, 17)}
    <path d="M40 683 Q450 663 860 683 L860 748 L40 748Z" fill="#d3b98d" stroke="#9d8667" strokeWidth="3"/>
    <text x="450" y="699" textAnchor="middle" className="svg-village-heading">VILLAGE</text>
    {village.map(slot => <g key={slot.id} className={legal.has(slot.id) ? 'board-action' : ''} onClick={() => choose(slot)} role={legal.has(slot.id) ? 'button' : undefined} tabIndex={legal.has(slot.id) ? 0 : undefined} onKeyDown={event => { if (legal.has(slot.id) && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); choose(slot) } }}>
      <rect x={90 + slot.group * 121} y="708" width="105" height="29" rx="9" fill={slot.player !== null ? playerColors[slot.player] : legal.has(slot.id) ? '#fff8e2' : '#e9dcc2'} stroke="#9e8763" strokeWidth="2"/>
      <text x={142 + slot.group * 121} y="728" textAnchor="middle" className="svg-village">{slot.player !== null ? game.players[slot.player].name.slice(0, 8) : `V${slot.group + 1}${slot.cost ? ` · −${slot.cost}` : ''}`}</text>
    </g>)}
    {presentation?.removedMarkers.map(slot => { const point = markerPoint(slot, channels); return <motion.g key={`${presentation.id}-${slot.id}`} initial={{ x: point.x, y: point.y, opacity: 1, scale: 1 }} animate={{ y: point.y - 26, opacity: 0, scale: 1.15 }} transition={{ duration: reduced ? 0 : .3 }}><circle r="15" fill={playerColors[slot.player!]} stroke="#fff7e8" strokeWidth="2.5"/><text y="5" textAnchor="middle" className="svg-marker">{slot.player! + 1}</text></motion.g> })}
    {pearls.map(move => { const index = availablePearls.findIndex(pearl => pearl.id === move.pearl.id); return <RiverPearl key={`${presentation?.id ?? 'rest'}-${move.pearl.id}`} move={move} reduced={reduced} selected={index >= 0 && selectedPearl === index} choose={!presentation && index >= 0 && onPearlSelect ? () => onPearlSelect(index) : undefined}/> })}
  </svg><div className="board-footnote">{game.phase === 'explore' ? 'Pearls wait behind the source gates until collection begins.' : 'Pearls stop at the next occupied section. Returning a token releases the current.'}</div></div>
}
