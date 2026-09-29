import { readFileSync, writeFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { createGame } from '../src/game'
import { RiverBoard } from '../src/RiverBoard'

const game = createGame({ names: ['River Keeper', 'Mountain Guide'], bots: [false, false], seed: 42 })
const legal = new Set(game.slots.filter(slot => slot.kind === 'river').map(slot => slot.id))
const css = readFileSync('src/base.css', 'utf8') + readFileSync('src/style.css', 'utf8')
const board = renderToStaticMarkup(<RiverBoard game={game} legal={legal} choose={() => {}} />)
writeFileSync('board-preview.html', `<!doctype html><html><meta charset="utf-8"><title>2-player merged board preview</title><style>${css}body{padding:20px}.preview{max-width:1050px;margin:auto}</style><div class="preview">${board}</div></html>`)
