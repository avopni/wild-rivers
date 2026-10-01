# Approved v3 presentation

The application implements [the approved v3 handoff](mockups/approved-rounds-v3/HANDOFF.md) using the existing React, TypeScript, Vite, SVG and Motion stack, with subsequent player-count layout and socket-contrast feedback applied. Four players retain the approved forest artwork; two and three players use separately composed full-board scenery in `public/board/`. [The scenery prompts](player-board-art.md) record the built-in imagegen assets. Portraits, llama and Camp art retain their existing assets. `assetUrl` resolves every asset through the Vite base path, including repository deployments.

`src/BoardScene.tsx` keeps the board beside the player column. Clicking a llama, Cards or Villagers expands that player's column; minus restores the normal mats. The expansion preference is saved per game and remains through round changes, setup and comparisons. The expanded column contains owned faeries, grouped human Camp cards or indistinguishable bot backs, then actual owned Villagers and their stored/open/wild sockets. Every row can open detail inside the column. Larger villages use 44px compact name/fill rows and scrolling; eight rows fit at the desktop reference size. At compact widths full detail offers 44px socket controls, and Choices offers explicit pearl and board-space controls. Phone is deferred.

Clicking any slim market portrait compares every currently available Villager and highlights the clicked instance. The comparison and dimming begin below the source pearls. Close and Escape restore the prior presentation, including any pending faerie explanation. Inspection never dispatches a rules action. Recruiting is a separate, explicitly labelled button available only during legal human recruitment. Owned and available Villagers use their distinct live instances.

`src/presentation.ts` derives a transient setup sequence from authoritative before/after states:

1. Reveal actual villagers individually: 360ms flip plus 180ms interval, then wait for Continue.
2. Settle those same cards into the market: 550ms movement with 70ms stagger.
3. Draw the already prepared pearls left-to-right from above the scene: 320ms flight with 100ms stagger. Gates remain closed.
4. Reveal each newly drawn faerie, show its complete ability and wait for OK. Then place it at its actual mapped site in 550ms. Prior unclaimed faeries remain.
5. Show the already prepared turn order with 220ms movement and 80ms stagger, then enable Exploration.

`PresentationClock` advances movement stages and never advances a Continue or OK stage. Completion events carry the current stage index, so duplicate clicks or a stale timer cannot acknowledge a subsequent faerie. Skip movement, Animations off and OS reduced motion shorten movement while preserving acknowledgement. Bots and rules actions wait until the sequence finishes. Leaving Play pauses its clock.

`src/preparationStorage.ts` saves setup progress separately in localStorage. Resume restores the pending acknowledgement without drawing, changing ownership, changing the prepared track or adding replay history. The IndexedDB game record remains the authoritative after-state. Completed setup checkpoints are cleared. Existing saves with no checkpoint open directly in their saved phase; replay displays existing snapshots without drawing or advancing the live game.

`src/boardLayout.ts` defines complete, centered two-, three- and four-player compositions: six, nine or twelve sources spread across the board width, with larger platforms for smaller player counts and a dedicated scenery image for each. `src/RiverBoard.tsx` retains the existing legal sections and slot counts. Four players have twelve individual sources, seven two-slot sections, four three-slot sections, two four-slot sections and one five-slot section. The same registered coordinates drive pearl paths. Every bottom river section is centered at x770 and drains vertically into the Lake; pearls follow that inlet before spreading into Lake seats. There are six Village spaces and an unlabelled Lake anchor at 770,779. No source letters, Lake label or pearl-bag widget are rendered. Legal placement cues come from game state; compact Choices also provides a labelled list of legal destinations. Villager sockets use saturated 4px colour rims, including the compact player column; legal targets retain their colour rim and add a separate gold selection ring.

Collection pearls stop above the next occupied section, follow registered merge paths when released, and travel to the collecting player's llama. Exchanges return the selected carried pearl to the rule-defined source. `src/PieceFlight.tsx` animates placement, token returns to the bottom empty track positions, Camp draws, recruitment and pearl delivery/Zephyr transfers. Placed Exploration tokens disappear from their used track positions. Hidden bot draws reveal a back rather than a Camp type. If an inspected player hides the acting player's mat, movement requiring that hidden target settles with the state update; inspection is retained.

Validation:

```powershell
npm run build
npm run test:sim
npm run test:presentation
```

For browser verification, start Vite on 4175 and headless Chrome with an isolated profile and a debugging endpoint on 9251, then run:

```powershell
npm run test:ui
```

`V3_ORIGIN` and `V3_DEBUG` override the server and Chrome endpoint. The script creates `ui-v3-*` test saves in that isolated browser, checks actual interaction and geometry at 1920×1080, 1366×768, 1180×820 and 1024×768, and writes screenshots and `v3-validation.json` into ignored `.tools/`. Its 45 checks cover setup acknowledgement/inspection/resume, turn markers, hidden hands, a maximum-size village, card and pearl movement, reduced motion, dedicated images and full-width rivers for every player count, coloured socket rims in both comparison and owned Villagers, renamed item artwork and guides, and persistent migration of old saves and replay snapshots. Use a test profile, as verification creates and replaces its own fixture saves.
