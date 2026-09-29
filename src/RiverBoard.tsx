import type { Game, Slot } from './game'
import { makeRiverSections, slotLabel } from './game'

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

export function RiverBoard({ game, legal, choose }: { game: Game; legal: Set<string>; choose: (slot: Slot) => void }) {
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
  return <div className="board-wrap"><svg className="board merged-board" viewBox="0 0 900 760" role="img" aria-label={`${channels} source channels merge through five placement tiers into the Lake`}>
    <defs>
      <linearGradient id="boardGround" x2="0" y2="1"><stop stopColor="#ddd2c2"/><stop offset=".5" stopColor="#efe7d4"/><stop offset="1" stopColor="#d8c9a9"/></linearGradient>
      <linearGradient id="waterfall" x2="0" y2="1"><stop stopColor="#668c9a"/><stop offset="1" stopColor="#b4d8dd"/></linearGradient>
      <linearGradient id="stream" x2="0" y2="1"><stop stopColor="#8bbdc7"/><stop offset="1" stopColor="#c3e6e6"/></linearGradient>
      <radialGradient id="lakeWater"><stop stopColor="#d4eff0"/><stop offset="1" stopColor="#94c6cc"/></radialGradient>
      <filter id="streamShadow"><feGaussianBlur stdDeviation="3"/></filter>
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
      {(game.riverPearls[lane] ?? []).slice(0, 3).map((pearl, i) => <circle key={i} cx={x(lane) + (i - Math.min(2, game.riverPearls[lane].length - 1) / 2) * 12} cy="112" r="9" fill={pearlColors[pearl]} stroke="#fffaf1" strokeWidth="2"/>)}
      {(game.riverPearls[lane]?.length ?? 0) > 3 && <text x={x(lane)+17} y="117" className="svg-count">+{game.riverPearls[lane].length - 3}</text>}
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
        <rect x={center - width / 2} y={y - 23} width={width} height="46" rx="23" fill="#eee5ce" stroke="#8d9d93" strokeWidth="2" opacity=".94"/>
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
    <text x="450" y="620" textAnchor="middle" className="svg-lake-label">THE LAKE · {game.lakePearls.length}</text>
    {button(lake, 450, 646, 17)}
    <path d="M40 683 Q450 663 860 683 L860 748 L40 748Z" fill="#d3b98d" stroke="#9d8667" strokeWidth="3"/>
    <text x="450" y="699" textAnchor="middle" className="svg-village-heading">VILLAGE</text>
    {village.map(slot => <g key={slot.id} className={legal.has(slot.id) ? 'board-action' : ''} onClick={() => choose(slot)} role={legal.has(slot.id) ? 'button' : undefined} tabIndex={legal.has(slot.id) ? 0 : undefined} onKeyDown={event => { if (legal.has(slot.id) && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); choose(slot) } }}>
      <rect x={90 + slot.group * 121} y="708" width="105" height="29" rx="9" fill={slot.player !== null ? playerColors[slot.player] : legal.has(slot.id) ? '#fff8e2' : '#e9dcc2'} stroke="#9e8763" strokeWidth="2"/>
      <text x={142 + slot.group * 121} y="728" textAnchor="middle" className="svg-village">{slot.player !== null ? game.players[slot.player].name.slice(0, 8) : `V${slot.group + 1}${slot.cost ? ` · −${slot.cost}` : ''}`}</text>
    </g>)}
  </svg><div className="board-footnote">Sources A–{String.fromCharCode(64 + channels)} are active. All games use the same A–L merge map; each circle is one Tribe token space.</div></div>
}
