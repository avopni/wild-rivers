import type { Game } from './game'
import { upgradeGameContent } from './contentMigration'
import { makePresentation, preparationStep, type Presentation } from './presentation'

const key = (id: string) => `rivers-preparation-${id}`
// Separate from the rules record: inspection and acknowledgement are presentation preferences.
export function savePreparation(game: Game, presentation: Presentation | null) {
  try {
    if (!presentation?.preparation) { localStorage.removeItem(key(game.id)); return }
    const { history: _history, ...before } = presentation.before
    localStorage.setItem(key(game.id), JSON.stringify({ round: game.round, logLength: game.log.length, before, index: presentation.preparation.index }))
  } catch { /* Gameplay remains available if browser storage is disabled. */ }
}
export function restorePreparation(game: Game, revision: number): Presentation | null {
  try {
    const raw = localStorage.getItem(key(game.id)); if (!raw) return null
    const saved = JSON.parse(raw)
    if (saved.round !== game.round || saved.logLength !== game.log.length || game.phase !== 'explore') return null
    const before = upgradeGameContent({ ...saved.before, history: [] } as Game)
    const presentation = makePresentation(before, game, revision, undefined, before.round === game.round)
    if (!presentation?.preparation || !Number.isInteger(saved.index) || saved.index < 0 || saved.index >= presentation.preparation.steps.length) return null
    presentation.preparation.index = saved.index
    const step = preparationStep(presentation)!
    return { ...presentation, duration: step.duration, message: step.message }
  } catch { return null }
}
