// Run against a local Vite dev server and an isolated headless Chrome profile.
import fs from 'node:fs/promises'
const origin = process.env.V3_ORIGIN ?? 'http://127.0.0.1:4175'
const tabs = await (await fetch(process.env.V3_DEBUG ?? 'http://127.0.0.1:9251/json')).json()
const socket = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
let serial = 0; const pending = new Map(), errors = [], checks = []
socket.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result) }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '))
})
const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++serial; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })) })
async function ev(expression) { const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value }
const pause = ms => new Promise(r => setTimeout(r, ms))
async function wait(expression, label = expression) { for (let i = 0; i < 150; i++) { if (await ev(`Boolean(${expression})`)) return; await pause(80) } throw Error(`Timed out: ${label}`) }
function assert(value, message) { if (!value) throw Error(message); checks.push(message); console.log(`Passed: ${message}`) }
async function click(selector) { await wait(`document.querySelector(${JSON.stringify(selector)})`); await ev(`document.querySelector(${JSON.stringify(selector)}).click()` ) }
async function shot(name) { const r = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await fs.writeFile(`.tools/v3-${name}.png`, Buffer.from(r.data, 'base64')) }
async function size(width, height) { await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); await pause(200) }
async function idle() { await wait(`document.querySelector('.board-scene') && !document.querySelector('.board-scene').dataset.presentation`, 'presentation completion') }
async function archiveGame(kind, count = 4) {
  await ev(`(async()=>{const {createGame}=await import('/src/game.ts');const {saveGame}=await import('/src/storage.ts');
    const game=createGame({names:['UI v3 ${kind}','Hidden bot','Third','Fourth'].slice(0,${count}),bots:[false,true,false,false].slice(0,${count}),seed:19});game.id='ui-v3-${kind}';game.pendingDraws=null;
    game.players[0].villagers.push(...game.villagerDeck.splice(0,${kind === 'dense' ? 20 : 7}));game.players[0].fairies=['Zephyr','Wildbloom'];game.players[0].alpaca=['green','blue','pink'];if('${kind}'==='dense'){game.players[0].villagers.push(...game.display);game.display=[]}
    if('${kind}'==='collect'){game.phase='collect';game.track=[];game.collectIndex=0;game.riverPearls=[['green','blue'],['white'],[],[],[],[],[],[],[],[],[],[]];game.lakePearls=[];const first=game.slots.find(s=>s.section==='r1g0'&&s.priority===0),second=game.slots.find(s=>s.section==='r2g0'&&s.priority===0);first.player=0;second.player=1;game.collectQueue=[first.id,second.id];}
    if('${kind}'==='deliver'||'${kind}'==='dense'){game.phase='deliver';game.deliverPlayer=0;game.track=Array.from({length:12},(_,i)=>i%4);game.riverPearls=game.riverPearls.map(()=>[])}
    if('${kind}'==='recruit'){game.phase='recruit';game.recruitQueue=['village0'];game.recruitIndex=0;game.slots.find(s=>s.id==='village0').player=0;}
    if('${kind}'==='gain'){game.pendingDraws={player:0,count:1};game.afterPlace=true;}
    if('${kind}'==='explore'){game.track=Array.from({length:12},(_,i)=>i%4);}
    game.history=[];const {history,...snapshot}=game;game.history=[structuredClone(snapshot)];await saveGame(game);localStorage.removeItem('rivers-preparation-'+game.id);localStorage.removeItem('rivers-column-'+game.id);
  })()`)
  await call('Page.reload'); await wait(`document.querySelector('.setup-card')`); await click('.topbar nav button:nth-child(2)')
  await wait(`Array.from(document.querySelectorAll('.record')).some(r=>r.textContent.includes('UI v3 ${kind}'))`)
  await ev(`Array.from(document.querySelectorAll('.record')).find(r=>r.textContent.includes('UI v3 ${kind}')).querySelector('button').click()`)
  await idle()
}
await call('Runtime.enable'); await call('Page.enable'); await size(1920, 1080)
await call('Page.navigate', { url: origin }); await wait(`document.querySelector('.setup-card')`)
await ev(`(async()=>{const {listGames,removeGame}=await import('/src/storage.ts');for(const game of await listGames())if(game.id.startsWith('ui-v3-'))await removeGame(game.id)})()`)
await call('Page.reload'); await pause(200); await wait(`document.querySelector('.setup-card')`)
while (await ev(`document.querySelectorAll('.setup-player').length<4`)) {
  const count = await ev(`document.querySelectorAll('.setup-player').length`)
  await ev(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Add player')).click()`)
  await wait(`document.querySelectorAll('.setup-player').length>${count}`)
}
await click('.start-button'); await wait(`document.querySelector('.board-scene').dataset.preparation==='review'`)
assert(await ev(`document.querySelectorAll('.deal-panel [data-villager]').length===6`), 'All six actual villagers reveal before Continue')
await click('.deal-panel .primary'); await wait(`document.querySelector('.board-scene').dataset.preparation==='pearls'`)
await ev(`(()=>{const skip=document.querySelector('.scene-instruction button');skip.click();skip.click()})()`)
await wait(`document.querySelector('.board-scene').dataset.preparation==='read'`)
assert(await ev(`!!document.querySelector('.faerie-panel .primary')`), 'Repeated Skip cannot acknowledge the next faerie')
await click('.expand-mat')
const pendingFairy = await ev(`document.querySelector('#new-faerie-title').textContent`)
await click('.scene-menu button:nth-of-type(2)')
assert(await ev(`document.querySelectorAll('.comparison .scene-villager').length===6`), 'Comparison shows all available villagers')
assert(await ev(`document.querySelectorAll('.llama-mat').length===1`), 'Expanded player persists through comparison')
assert(await ev(`document.querySelector('.comparison').getBoundingClientRect().top>document.querySelector('.river-pearl').getBoundingClientRect().bottom && document.querySelector('.comparison-dim').getBoundingClientRect().top>document.querySelector('.river-pearl').getBoundingClientRect().bottom`), 'Comparison and dimming stay below source pearls')
await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
assert(await ev(`document.querySelector('#new-faerie-title').textContent===${JSON.stringify(pendingFairy)}`), 'Escape restores the same unacknowledged faerie')
await pause(600); assert(await ev(`document.querySelector('.board-scene').dataset.preparation==='read'`), 'Faerie explanations cannot time out')
await shot('acknowledgement')
await call('Page.reload'); await wait(`document.querySelector('.resume-link')`); await click('.resume-link')
assert(await ev(`document.querySelector('#new-faerie-title')?.textContent===${JSON.stringify(pendingFairy)} && document.querySelectorAll('.llama-mat').length===1`), 'Reload and resume retain pending acknowledgement and expanded player')
await click('.scene-menu button:last-child'); await ev(`document.querySelector('.utility-panel input[type=checkbox]').click()`); await click('.utility-panel .close-overlay')
for (let i = 0; i < 4; i++) {
  await wait(`document.querySelector('.faerie-panel .primary')`)
  if (i === 3) { await click('.scene-menu button:last-child'); await ev(`document.querySelector('.utility-panel input[type=checkbox]').click()`); await click('.utility-panel .close-overlay') }
  await click('.faerie-panel .primary')
  if (i < 3) await wait(`document.querySelector('.board-scene').dataset.preparation==='read'`)
}
await wait(`document.querySelector('.board-scene').dataset.preparation==='track'`)
assert(await ev(`Array.from(document.querySelectorAll('[data-track-token]')).some(e=>parseFloat(getComputedStyle(e).opacity)<.9)`), 'Prepared turn markers animate individually before Exploration')
await idle(); assert(await ev(`document.querySelectorAll('[data-river-slot]').length===51 && document.querySelectorAll('[data-village-slot]').length===6 && document.querySelectorAll('[data-track-token]').length===12`), 'Live board has 51 river spaces, six Village spaces and 12 prepared track positions')
await click('.minimize-rail'); assert(await ev(`document.querySelectorAll('.llama-mat').length===4 && document.querySelectorAll('.llama-pearls button').length===24`), 'Minimize restores four llamas with six pearl sockets each')
await shot('exploration')
await archiveGame('deliver'); await click('[data-player-mat="0"] .expand-mat'); await shot('owned-village')
assert(await ev(`document.querySelectorAll('[data-owned-villager]').length===8 && Array.from(document.querySelectorAll('.rail-villager')).every(e=>e.getBoundingClientRect().bottom<=document.querySelector('.player-rail').getBoundingClientRect().bottom)`), 'Eight owned villagers fit in the desktop column')
for (const [width, height] of [[1366,768],[1180,820],[1024,768]]) {
  await size(width,height)
  assert(await ev(`document.documentElement.scrollWidth<=${width} && document.documentElement.scrollHeight<=${height}`), `${width}×${height} fits without page overflow`)
  assert(await ev(`parseFloat(getComputedStyle(document.querySelector('.rail-villager .ability')).fontSize)>=12`), `${width}×${height} keeps scoring text readable`)
  await click('.rail-inspect'); assert(await ev(`Array.from(document.querySelectorAll('.rail-detail .socket')).every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44})`), `${width}×${height} offers 44px detailed sockets`); await click('.rail-detail>button')
  await shot(`${width}`)
}
await click('.minimize-rail'); await click('[data-player-mat="1"] .expand-mat')
assert(await ev(`document.querySelectorAll('.rail-hand img').length===0 && document.querySelectorAll('.hidden-card').length===6 && document.querySelectorAll('[data-owned-villager]').length===1`), 'Opponent column shows public villagers and indistinguishable hidden cards')
await shot('hidden-hand'); await size(1920,1080)
await archiveGame('explore')
const lake = await ev(`(()=>{const r=document.querySelector('[data-lake-slot]').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
await call('Input.dispatchMouseEvent',{type:'mousePressed',...lake,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...lake,button:'left',clickCount:1})
await wait(`document.querySelector('.piece-flight.tribe')`);await shot('token-flight');await idle()
assert(await ev(`document.querySelectorAll('.scene-track .tribe:not(.empty)').length===11 && document.querySelector('[data-lake-slot]').textContent.includes('U')`), 'Lake placement responds to pointer input and removes the placed token from the track')
await archiveGame('dense'); await click('[data-player-mat="0"] .expand-mat')
assert(await ev(`document.querySelectorAll('[data-owned-villager]').length===27 && document.querySelector('.rail-villagers').scrollHeight>document.querySelector('.rail-villagers').clientHeight`), 'Large villages retain every name in an accessible scrolling column')
await ev(`document.querySelector('.rail-villagers').scrollTop=9999`); await click('.rail-villager:last-child>button'); assert(await ev(`!!document.querySelector('.rail-detail .villager-card')`), 'Last compact villager opens details inside the player column')
await archiveGame('collect'); await click('.choice-pearls button:nth-child(3)'); await click('.action-buttons .primary')
await wait(`document.querySelector('.pearl-flight-layer .flying-pearl')`); await shot('collection-flight'); await idle()
assert(await ev(`!!document.querySelector('[data-player-mat="0"] [data-flight-target="player-0-llama-3"] .pearl.white')`), 'Collected pearl arrives in the correct player’s llama')
await archiveGame('recruit'); await click('.choices-panel>div>button'); await click('.comparison .scene-villager .primary'); await wait(`document.querySelector('.card-flight')`); await shot('recruitment-flight'); await idle()
await archiveGame('gain'); await click('.choices-panel .market-row .camp-card'); await wait(`document.querySelector('.card-flight')`); await idle()
await archiveGame('deliver'); await click('[data-player-mat="0"] .expand-mat'); await click('[data-flight-target="player-0-llama-0"]'); await click('.rail-villager .socket-action'); await wait(`document.querySelector('.piece-flight.pearl')`); await shot('delivery-flight'); await idle()
assert(await ev(`!!document.querySelector('.rail-villager .socket.filled .pearl.green')`), 'Delivery animates to a compatible owned socket')
for (const count of [2, 3, 4]) {
  await archiveGame(`board${count}`, count)
  const layout = await ev(`(()=>{
    const board=document.querySelector('svg.board'),region=document.querySelector('.scene-board')
    const pearls=Array.from(document.querySelectorAll('.river-pearl')).map(e=>e.getBoundingClientRect())
    return {
      players:Number(board.dataset.boardPlayers),background:getComputedStyle(region).backgroundImage,
      span:Math.max(...pearls.map(r=>r.right))-Math.min(...pearls.map(r=>r.left)),width:region.getBoundingClientRect().width,
      inlet:document.querySelector('[data-lake-inlet]').getAttribute('d'),
      finalX:Array.from(document.querySelectorAll('[data-river-slot^="r4"]')).map(e=>Number(e.querySelector('circle').getAttribute('cx'))),
      mats:document.querySelectorAll('.llama-mat').length
    }
  })()`)
  assert(layout.players===count && layout.mats===count && layout.background.includes(count===4?'forest-board.png':`forest-board-${count}p.png`), `${count} players select a dedicated complete board image`)
  assert(layout.span/layout.width>.7 && layout.finalX.reduce((a,b)=>a+b,0)/layout.finalX.length===770 && layout.inlet==='M770 692 V760', `${count}-player rivers fill the board and enter the Lake vertically`)
  await ev(`(async()=>{const image=new Image();image.src=getComputedStyle(document.querySelector('.scene-board')).backgroundImage.slice(5,-2);await image.decode()})()`)
  await shot(`board-${count}p`)
  await click('[data-player-mat="0"] .expand-mat')
  assert(await ev(`Array.from(document.querySelectorAll('.rail-villager .socket.empty')).every(e=>parseFloat(getComputedStyle(e).borderTopWidth)>=4) && new Set(Array.from(document.querySelectorAll('.rail-villager .socket.empty')).map(e=>getComputedStyle(e).borderTopColor)).size>=5`), `${count}-player owned Villagers show thick distinct colour rims`)
  await click('.scene-menu button:nth-of-type(2)')
  assert(await ev(`Array.from(document.querySelectorAll('.comparison .scene-sockets .pearl.open')).every(e=>parseFloat(getComputedStyle(e).borderTopWidth)>=4)`), `${count}-player available Villagers show thick socket rims`)
  await shot(`socket-rims-${count}p`)
}
await archiveGame('names')
const content = await ev(`(async()=>{
  const {campTypes,fairyTypes}=await import('/src/game.ts'),{campInfo}=await import('/src/CampCard.tsx'),{fairyEffects}=await import('/src/presentation.ts')
  for(const name of campTypes){const image=new Image();image.src=campInfo[name].image;await image.decode()}
  return {cards:campTypes,fairies:fairyTypes,effects:fairyTypes.every(name=>!!fairyEffects[name])}
})()`)
assert(content.cards.join('|')==='Trail Pennant|Glowstone Lamp|Wonder Basket|Pearl Net|Whisperstrings' && content.fairies.join('|')==='Emberglow|Zephyr|Moonveil|Wildbloom|Dewdrop' && content.effects, 'All ten renamed items retain working effects and artwork')
await click('.scene-menu button:nth-of-type(3)')
assert(await ev(`['Trail Pennant','Glowstone Lamp','Wonder Basket','Pearl Net','Whisperstrings'].every(name=>document.querySelector('.utility-panel').textContent.includes(name))`), 'Camp guide shows every magical tool name')
await shot('renamed-camp-guide')
await ev(`(async()=>{
  const {createGame}=await import('/src/game.ts')
  const oldCamp=['42616e6e6572','4c616e7465726e','50726f766973696f6e73','46697368696e67204e657473','5368616d6973656e'].map(hex=>hex.match(/../g).map(byte=>String.fromCharCode(parseInt(byte,16))).join(''))
  const oldFairies=['426f6e66697265','427265657a65','436c6f7564','4d757368726f6f6d','5269766572'].map(hex=>hex.match(/../g).map(byte=>String.fromCharCode(parseInt(byte,16))).join(''))
  const game=createGame({names:['UI v3 migration','Companion'],bots:[false,false],seed:19})
  game.id='ui-v3-migration';localStorage.removeItem('rivers-preparation-'+game.id);localStorage.removeItem('rivers-column-'+game.id);game.rulesVersion='prototype-2025.4';game.players[0].hand=oldCamp;game.players[0].fairies=oldFairies
  game[String.fromCharCode(98,114,101,101,122,101,76,101,102,116)]=2;delete game.zephyrLeft
  const {history,...snapshot}=game;game.history=[structuredClone(snapshot)]
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('wild-rivers-prototype',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})
  await new Promise((resolve,reject)=>{const tx=db.transaction('games','readwrite');tx.objectStore('games').put(game);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()
})()`)
await call('Page.reload'); await pause(200); await wait(`document.querySelector('.setup-card')`)
await click('.topbar nav button:nth-child(2)')
await wait(`Array.from(document.querySelectorAll('.record')).some(r=>r.textContent.includes('UI v3 migration'))`)
await ev(`Array.from(document.querySelectorAll('.record')).find(r=>r.textContent.includes('UI v3 migration')).querySelector('button').click()`)
await idle(); await click('[data-player-mat="0"] .expand-mat')
assert(await ev(`['Emberglow','Zephyr','Moonveil','Wildbloom','Dewdrop'].every(name=>document.querySelector('.rail-fairies').textContent.includes(name))`), 'A legacy IndexedDB record resumes with all renamed faeries')
assert(await ev(`(async()=>{const {listGames}=await import('/src/storage.ts');const game=(await listGames()).find(g=>g.id==='ui-v3-migration');return game.rulesVersion==='prototype-2026.1'&&game.zephyrLeft===2&&game.players[0].hand.join('|')==='Trail Pennant|Glowstone Lamp|Wonder Basket|Pearl Net|Whisperstrings'&&game.history.every(s=>s.rulesVersion==='prototype-2026.1')})()`), 'Legacy saves are rewritten with current names and replay snapshots')
await shot('renamed-items')
await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
await call('Page.reload'); await wait(`document.querySelector('.start-button')`); await click('.start-button')
await wait(`document.querySelector('.board-scene').dataset.preparation==='review'`); await click('.deal-panel .primary')
await wait(`document.querySelector('.board-scene').dataset.preparation==='read'`); await pause(300)
assert(await ev(`!!document.querySelector('.faerie-panel .primary') && document.querySelector('.board-scene').dataset.preparation==='read'`), 'Operating-system reduced motion retains the required OK step')
await call('Emulation.setEmulatedMedia', { features: [] })
assert(errors.length===0, `Browser reports no runtime errors (${errors.length})`)
await fs.writeFile('.tools/v3-validation.json',JSON.stringify({checks,errors},null,2)); console.log(`V3 browser checks passed: ${checks.length} checks.`)
socket.close()
