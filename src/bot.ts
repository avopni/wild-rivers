import { actor, catchablePearls, colors, legalSlots, pairAvailable, pearlPoints, slotLabel, type Action, type Decision, type Game, type Pearl, type Slot, type Villager, POLICY_VERSION } from './game'

export type Analysis = { action: Action; score: number; factors: string[]; summary: string; policy: string; uncertainty: string }
function spaceValue(g: Game, playerId: number, color: Pearl) {
  const p = g.players[playerId]
  const open = p.villagers.some(v => v.stored.some((x, i) => x === null && (v.sockets[i] === color || v.sockets[i] === 'any' || v.wild.includes(i))))
  return pearlPoints[color] * (open ? 1 : .35)
}
export function analyzePlacements(g: Game, playerId = actor(g)): Analysis[] {
  if (playerId === null) return []
  const p = g.players[playerId]
  return legalSlots(g, playerId).map((s: Slot) => {
    const factors: string[] = []
    let value = 0
    if (s.kind === 'river') {
      const pearls = catchablePearls(g, s)
      const best = pearls.length ? Math.max(...pearls.map(c => spaceValue(g, playerId, c) + goalProgress(g, playerId, c))) : 0
      const prior = g.slots.filter(t => t.kind === 'river' && t.player !== null && t.lanes.some(lane => s.lanes.includes(lane)) && (t.row < s.row || (t.row === s.row && t.section === s.section && t.priority < s.priority))).length
      const catchChance = Math.max(.25, 1 - prior * .35)
      value += best * catchChance + (pearls.length && p.alpaca.length < 3 ? 1.1 : 0)
      factors.push(`${pearls.length} visible pearl${pearls.length === 1 ? '' : 's'} in this channel group`)
      if (prior) factors.push(`${prior} upstream token${prior === 1 ? '' : 's'} may intercept them`)
      const fairyCount = g.fairySites.filter(site => site.section === s.section).reduce((count, site) => count + site.fairies.length, 0)
      if (fairyCount) { value += fairyCount * 1.6; factors.push(`${fairyCount} Fairy token${fairyCount === 1 ? '' : 's'} here`) }
      value += s.row * .2
    } else if (s.kind === 'lake') {
      value += 1.5 + Math.min(3, g.lakePearls.length * 1.2)
      factors.push('Lake may hold leftover pearls and resolves late')
    } else {
      const best = Math.max(0, ...g.display.map(v => villagerEstimate(g, playerId, v)))
      value += best + (5 - s.group) * .12
      factors.push(`${g.display.length} Villagers currently available`)
      factors.push('Earlier Village slots choose first')
    }
    value -= Math.max(0, s.cost) * 1.2
    if (s.cost < 0) { value += 1.3; factors.push('Gain a Camp card') }
    if (s.cost > 0) factors.push(`Costs ${s.cost} Camp card${s.cost === 1 ? '' : 's'}`)
    if (p.alpaca.length >= 5 && s.kind !== 'village') { value -= 1.8; factors.push('Alpaca storage is nearly full') }
    return { action: { type: 'place' as const, slot: s.id, moonveil: s.cost > p.hand.length && p.fairies.includes('Moonveil'), emberglow: s.cost > p.hand.length && !p.fairies.includes('Moonveil') }, score: value,
      factors, summary: `${slotLabel(s)}: current policy estimates ${value.toFixed(1)} value.`, policy: POLICY_VERSION,
      uncertainty: s.kind === 'river' ? 'Visible pearl path is certain; future placements are estimated.' : 'Future choices and draws can change this estimate.' }
  }).sort((a, b) => b.score - a.score || (a.action.type === 'place' && b.action.type === 'place' ? a.action.slot.localeCompare(b.action.slot) : 0))
}
function villagerEstimate(g: Game, playerId: number, v: Villager) {
  const p = g.players[playerId]
  const open = p.villagers.flatMap(villager => villager.sockets.flatMap((socket, i) => villager.stored[i] === null ? [villager.wild.includes(i) ? 'any' : socket] : []))
  const unserved = p.alpaca.filter(color => {
    const index = open.findIndex(socket => socket === color || socket === 'any')
    if (index < 0) return true
    open.splice(index, 1)
    return false
  })
  const sockets = [...v.sockets]
  const fits = unserved.filter(color => {
    const index = sockets.findIndex(socket => socket === color || socket === 'any')
    if (index < 0) return false
    sockets.splice(index, 1)
    return true
  }).length
  return .3 + fits * 2.2 + v.reward * .45
}
export function chooseBotAction(g: Game): Action | null {
  const id = actor(g); if (id === null) return null
  const p = g.players[id]
  if (g.pendingDraws) {
    const counts = new Map<string, number>(); p.hand.forEach(c => counts.set(c, (counts.get(c) ?? 0) + 1))
    const choice = g.market.map((c, i) => ({ i, value: (counts.get(c) ?? 0) % 2 === 1 ? 2 : 1 })).sort((a, b) => b.value - a.value)[0]
    return { type: 'gain', marketIndex: choice?.i ?? null }
  }
  if (g.phase === 'explore') return g.afterPlace ? { type: 'endTurn' } : analyzePlacements(g, id)[0]?.action ?? null
  if (g.phase === 'collect' || g.phase === 'lake') {
    if (g.phase === 'lake' && g.lakeMoves >= 6) return { type: 'skipCollect' }
    const source = g.phase === 'lake' ? g.lakePearls : catchablePearls(g, g.slots.find(s => s.id === g.collectQueue[g.collectIndex])!)
    if (!source.length) return { type: 'skipCollect' }
    const ranked = source.map((c, i) => ({ i, value: spaceValue(g, id, c) + goalProgress(g, id, c) })).sort((a, b) => b.value - a.value)
    const low = p.alpaca.map((c, i) => ({ i, value: spaceValue(g, id, c) + goalProgress(g, id, c) })).sort((a, b) => a.value - b.value)[0]
    if (p.alpaca.length >= 6 && (!low || ranked[0].value <= low.value)) return { type: 'skipCollect' }
    const extra = g.phase === 'collect' && !g.pendingExtra && source.length > 1 && p.alpaca.length < 5 ? p.fairies.includes('Dewdrop') ? 'dewdrop' : pairAvailable(p, 'Pearl Net') ? 'pearlNet' : undefined : undefined
    return { type: 'collect', pearlIndex: ranked[0].i, swapIndex: p.alpaca.length >= 6 ? low?.i : undefined, extra }
  }
  if (g.phase === 'recruit') {
    if (g.recruitedThisSlot) return { type: 'skipRecruit' }
    const best = [...g.display].sort((a, b) => villagerEstimate(g, id, b) - villagerEstimate(g, id, a))[0]
    return best ? { type: 'recruit', villagerId: best.id } : { type: 'skipRecruit' }
  }
  if (g.phase === 'deliver') {
    for (let i = 0; i < p.alpaca.length; i++) for (const v of p.villagers) for (let j = 0; j < v.sockets.length; j++)
      if (v.stored[j] === null && (v.sockets[j] === p.alpaca[i] || v.sockets[j] === 'any' || v.wild.includes(j))) return { type: 'deliver', alpacaIndex: i, villagerId: v.id, socket: j }
    return { type: 'doneDelivery' }
  }
  return null
}
function goalProgress(g: Game, id: number, color: Pearl) {
  return Math.max(0, ...g.goals.filter(goal => goal.owner === null && goal.needs.includes(color)).map(goal => {
    const have = [...g.players[id].alpaca, color]
    const count = goal.needs.filter(c => { const i = have.indexOf(c); if (i < 0) return false; have.splice(i, 1); return true }).length
    return count === goal.needs.length ? 3 : count / goal.needs.length
  }))
}
export function remainingChance(g: Game) {
  const total = g.pearlDeck.length
  return colors.map(color => ({ color, remaining: g.pearlDeck.filter(c => c === color).length, chance: total ? g.pearlDeck.filter(c => c === color).length / total : 0 }))
}

export function explainChoice(g: Game): { decision: Decision; alternative: string } | null {
  const id = actor(g); if (id === null || g.pendingDraws) return null
  const p = g.players[id]
  if (g.phase === 'explore' && !g.afterPlace) {
    const ranked = analyzePlacements(g, id); if (!ranked.length) return null
    const best = ranked[0], alternative = ranked[1]
    const bestSlotId = best.action.type === 'place' ? best.action.slot : ''
    return { decision: { summary: `Current policy prefers ${bestSlotId ? slotLabel(g.slots.find(s => s.id === bestSlotId)!) : 'this action'} (${best.score.toFixed(1)} estimate).`, estimate: best.score,
      factors: best.factors.slice(0, 3).map(label => ({ label, value: null })), assumptions: [best.uncertainty], policy: POLICY_VERSION }, alternative: alternative?.summary ?? 'No other legal slot.' }
  }
  if (g.phase === 'collect' || g.phase === 'lake') {
    const source = g.phase === 'lake' ? g.lakePearls : catchablePearls(g, g.slots.find(s => s.id === g.collectQueue[g.collectIndex])!)
    const ranked = source.map(c => ({ color: c, value: spaceValue(g, id, c) + goalProgress(g, id, c) })).sort((a, b) => b.value - a.value)
    if (!ranked.length) return null
    return { decision: { summary: `Current policy prefers ${ranked[0].color} (about ${ranked[0].value.toFixed(1)} useful points).`, estimate: ranked[0].value,
      factors: [{ label: `Printed pearl value: ${pearlPoints[ranked[0].color]}`, value: pearlPoints[ranked[0].color] }, { label: p.villagers.some(v => v.stored.some((x, i) => x === null && (v.sockets[i] === ranked[0].color || v.sockets[i] === 'any'))) ? 'An open Villager socket can store it' : 'No matching socket is currently open', value: null }, { label: 'Unclaimed Alpaca goals can add four points', value: null }],
      assumptions: ['The pearl value is certain if stored; future storage and rival choices are uncertain.'], policy: POLICY_VERSION }, alternative: ranked[1] ? `${ranked[1].color}: ${ranked[1].value.toFixed(1)} estimate` : 'Pass or leave the pearl.' }
  }
  if (g.phase === 'recruit' && !g.recruitedThisSlot && g.display.length) {
    const ranked = g.display.map(v => ({ v, value: villagerEstimate(g, id, v) })).sort((a, b) => b.value - a.value)
    return { decision: { summary: `Current policy prefers ${ranked[0].v.name} (${ranked[0].value.toFixed(1)} estimate).`, estimate: ranked[0].value,
      factors: [{ label: `${ranked[0].v.sockets.length} new pearl spaces`, value: ranked[0].v.sockets.length }, { label: `${ranked[0].v.reward} Camp cards on recruit`, value: ranked[0].v.reward }, { label: ranked[0].v.ability + ' scoring ability', value: null }],
      assumptions: ['Future pearls and other players’ Village choices are uncertain.'], policy: POLICY_VERSION }, alternative: ranked[1] ? `${ranked[1].v.name}: ${ranked[1].value.toFixed(1)} estimate` : 'No other Villager available.' }
  }
  if (g.phase === 'deliver') {
    const options = p.alpaca.flatMap(c => p.villagers.flatMap(v => v.sockets.map((s, i) => ({ c, v, i, fits: v.stored[i] === null && (s === c || s === 'any' || v.wild.includes(i)) })))).filter(x => x.fits)
    if (!options.length) return null
    options.sort((a, b) => pearlPoints[b.c] - pearlPoints[a.c])
    return { decision: { summary: `Current policy would deliver ${options[0].c} to ${options[0].v.name}.`, estimate: pearlPoints[options[0].c],
      factors: [{ label: `${pearlPoints[options[0].c]} printed pearl points`, value: pearlPoints[options[0].c] }, { label: 'Delivery frees one Alpaca space', value: 1 }, { label: 'A full Villager may trigger a bonus', value: null }],
      assumptions: ['This compares immediate storage; later pearl draws may change the best socket.'], policy: POLICY_VERSION }, alternative: options[1] ? `${options[1].c} to ${options[1].v.name}` : 'Keep the pearl for a later goal.' }
  }
  return null
}
