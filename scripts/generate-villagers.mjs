import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const output = join(process.cwd(), 'public', 'villagers')
mkdirSync(output, { recursive: true })

const villagers = [
  ['Mira', 'bat', 1], ['Pip', 'red fox', 2], ['Juniper', 'wolf', 3], ['Bramble', 'bear', 4],
  ['Tansy', 'hare', 5], ['Clover', 'badger', 6], ['Nori', 'raccoon', 7], ['Wren', 'owl', 8],
  ['Fenn', 'otter', 9], ['Lumi', 'lynx', 10], ['Moss', 'bat', 1], ['Sable', 'red fox', 2],
  ['Basil', 'wolf', 3], ['Poppy', 'bear', 4], ['Rumi', 'hare', 5], ['Hazel', 'badger', 6],
  ['Ollie', 'raccoon', 7], ['Kiko', 'owl', 8], ['Maple', 'otter', 9], ['Taro', 'lynx', 10],
  ['Pecan', 'bat', 1], ['Nim', 'red fox', 2], ['Fig', 'wolf', 3], ['Daisy', 'bear', 4],
  ['Aster', 'hare', 5], ['Bibi', 'badger', 6],
]
const cards = [['starter.jpg', 'River Keeper', 'alpaca'], ...villagers.map(([name, species, portrait]) => [`v${portrait}.jpg`, name, species])]

writeFileSync(join(output, 'gallery.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wild Rivers Villagers</title>
<style>
body{margin:0;background:#151d1d;color:#e8e4d8;font:16px system-ui;padding:32px}
main{max-width:1400px;margin:auto}h1{font:700 42px Georgia;margin:0 0 8px}
p{color:#b7b9a8;margin:0 0 28px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}
figure{margin:0;background:#222d2a;border:1px solid #394743;border-radius:14px;padding:12px;text-align:center}
img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:9px}figcaption{font-weight:700;margin-top:9px}
small{display:block;color:#b5bdab;margin-top:3px;text-transform:capitalize}
</style>
</head><body><main><h1>River Villagers</h1>
<p>Painterly fantasy wildlife portraits with ten distinct animal designs shared across the Villager cast.</p>
<div class="grid">${cards.map(([file, name, species]) => `<figure><img src="realistic/${file}" alt="${name}, ${/^[aeiou]/i.test(species) ? 'an' : 'a'} ${species} fantasy Villager"><figcaption>${name}</figcaption><small>${species}</small></figure>`).join('')}</div>
</main></body></html>`)
console.log(`Updated Villager portrait gallery with ${cards.length} character entries.`)
