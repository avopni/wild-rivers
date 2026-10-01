import { CONTENT_VERSION, type Camp, type Fairy, type Game, type RecordEntry, type Snapshot } from './game'

const legacyVersion = 'prototype-2025.4'
// Fingerprints identify retired enum labels without retaining them as shipped vocabulary.
// They are FNV-1a over lowercase UTF-16 characters; only historical records use them.
function fingerprint(value: string): number {
  let hash = 2166136261
  for (const character of value.toLowerCase()) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0
  return hash
}
const campNames = new Map<number, Camp>([
  [1097580943, 'Trail Pennant'], [2825673007, 'Glowstone Lamp'], [558497737, 'Wonder Basket'],
  [3878839683, 'Pearl Net'], [3376055771, 'Whisperstrings'], [1498300962, 'Pearl Net']
])
const fairyNames = new Map<number, Fairy>([
  [1552748532, 'Emberglow'], [3205658238, 'Zephyr'], [449227134, 'Moonveil'],
  [3469920567, 'Wildbloom'], [1180751633, 'Dewdrop']
])
const actionNames = new Map<number, string>([
  [3205658238, 'zephyr'], [3174142949, 'endZephyr'], [3469920567, 'wildbloom'], [3376055771, 'whisperstrings']
])
const fieldNames = new Map<number, string>([
  [1016372395, 'zephyrLeft'], [449227134, 'moonveil'], [1552748532, 'emberglow']
])

function renameText(text: string, playerNames: string[]): string {
  // Player-chosen names are personal data, even when they coincide with a retired label.
  const protectedNames = playerNames.filter(Boolean).sort((a, b) => b.length - a.length)
  const parts: string[] = []
  if (protectedNames.length) {
    const pattern = new RegExp(protectedNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g')
    text = text.replace(pattern, name => { parts.push(name); return `\u0000${parts.length - 1}\u0000` })
  }
  const renameWord = (word: string) => {
    const hash = fingerprint(word)
    // The water-element label also names the board terrain; only rename it in faerie context.
    return campNames.get(hash) ?? (hash === 1180751633 ? undefined : fairyNames.get(hash)) ?? word
  }
  const words = [...text.matchAll(/\b[A-Za-z]+\b/g)]
  let renamed = '', end = 0
  for (let i = 0; i < words.length; i++) {
    const word = words[i], next = words[i + 1]
    const wordEnd = word.index! + word[0].length
    const adjacent = next && text.slice(wordEnd, next.index) === ' '
    const phrase = adjacent ? campNames.get(fingerprint(`${word[0]} ${next[0]}`)) : undefined
    const waterFaerie = adjacent && fingerprint(word[0]) === 1180751633 && /^(fairy|faerie)$/i.test(next[0])
    renamed += text.slice(end, word.index) + (phrase ?? (waterFaerie ? 'Dewdrop' : renameWord(word[0])))
    end = wordEnd
    if (phrase) { end = next.index! + next[0].length; i++ }
  }
  text = renamed + text.slice(end)
  return text.replace(/\u0000(\d+)\u0000/g, (_, index: string) => parts[Number(index)])
}
function renameRecord(entry: RecordEntry, names: string[]) {
  entry.action = actionNames.get(fingerprint(entry.action)) ?? entry.action
  entry.detail = renameText(entry.detail, names)
  if (entry.decision) {
    entry.decision.summary = renameText(entry.decision.summary, names)
    entry.decision.factors.forEach(factor => { factor.label = renameText(factor.label, names) })
    entry.decision.assumptions = entry.decision.assumptions.map(text => renameText(text, names))
  }
}
function renameSnapshot(snapshot: Snapshot) {
  const names = snapshot.players.map(player => player.name)
  snapshot.rulesVersion = CONTENT_VERSION
  for (const player of snapshot.players) {
    player.hand = player.hand.map(card => campNames.get(fingerprint(card)) ?? card)
    player.fairies = player.fairies.map(fairy => fairyNames.get(fingerprint(fairy)) ?? fairy)
  }
  for (const key of ['campDeck', 'campDiscard', 'market'] as const) snapshot[key] = snapshot[key].map(card => campNames.get(fingerprint(card)) ?? card)
  snapshot.fairyDeck = snapshot.fairyDeck.map(fairy => fairyNames.get(fingerprint(fairy)) ?? fairy)
  snapshot.fairySites.forEach(site => { site.fairies = site.fairies.map(fairy => fairyNames.get(fingerprint(fairy)) ?? fairy) })
  const fields = snapshot as unknown as Record<string, unknown>
  for (const key of Object.keys(fields)) {
    const renamed = fieldNames.get(fingerprint(key))
    if (renamed && key !== renamed) { fields[renamed] = fields[key]; delete fields[key] }
  }
  snapshot.event = renameText(snapshot.event, names)
  snapshot.log.forEach(entry => renameRecord(entry, names))
}
/** Upgrade the naming-only release, including replay/undo history, without changing outcomes. */
export function upgradeGameContent(game: Game): Game {
  if (game.rulesVersion !== legacyVersion) return game
  const upgraded = structuredClone(game)
  renameSnapshot(upgraded)
  upgraded.history.forEach(renameSnapshot)
  return upgraded
}
