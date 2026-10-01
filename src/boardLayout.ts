// Each player count gets a complete board composition in the same UI coordinate space.
// These coordinates are shared by the SVG and piece animations.
export type BoardLayout = {
  background: string
  sourceX: readonly number[]
  slotRadius: number
  slotSpacing: number
  platformHeight: number
}
const layouts: Record<number, BoardLayout> = {
  2: { background: '/board/forest-board-2p.png', sourceX: [220, 440, 660, 880, 1100, 1320], slotRadius: 20, slotSpacing: 47, platformHeight: 64 },
  3: { background: '/board/forest-board-3p.png', sourceX: Array.from({ length: 9 }, (_, i) => 165 + i * 151.25), slotRadius: 18, slotSpacing: 42, platformHeight: 60 },
  4: { background: '/board/forest-board.png', sourceX: Array.from({ length: 12 }, (_, i) => 165 + i * 110), slotRadius: 16, slotSpacing: 37, platformHeight: 54 }
}
export function boardLayout(playerCount: number): BoardLayout {
  const layout = layouts[playerCount]
  if (!layout) throw new Error(`Unsupported board player count: ${playerCount}`)
  return layout
}
