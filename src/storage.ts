import type { Game } from './game'
import { upgradeGameContent } from './contentMigration'

const DATABASE = 'wild-rivers-prototype'
const STORE = 'games'
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
export async function saveGame(game: Game): Promise<void> {
  game = upgradeGameContent(game)
  const database = await db()
  await new Promise<void>((resolve, reject) => { const tx = database.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(game); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) })
  database.close()
}
export async function listGames(): Promise<Game[]> {
  const database = await db()
  const items = await new Promise<Game[]>((resolve, reject) => { const request = database.transaction(STORE).objectStore(STORE).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
  database.close()
  const upgraded = items.map(upgradeGameContent)
  await Promise.all(upgraded.filter((game, index) => game !== items[index]).map(saveGame))
  return upgraded.sort((a, b) => b.id.localeCompare(a.id))
}
export async function removeGame(id: string) {
  const database = await db()
  await new Promise<void>((resolve, reject) => { const tx = database.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) })
  database.close()
}
