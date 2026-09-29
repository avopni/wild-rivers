# Tabletop presentation

The interface uses React, SVG and the MIT-licensed core of Motion. No paid Motion features or game engine are required.

`src/presentation.ts` maps the existing rules state to individual visible pearls and river paths. Source pearls arrive in order behind sluice gates. During collection, pearls wait above the next occupied section; a lane with no remaining blocker flows to the Lake. These visual Lake arrivals become available according to the existing Lake rules. Returning a marker releases the remaining pearls along the merge paths.

`src/Tabletop.tsx` presents the current instruction and coordinates the playback clock, pearl flights, large Villager cards and Camp reveals. A selected pearl travels to a focused llama card. A full llama returns the exchanged pearl to its source. The rules calculate the resulting state immediately and autosave it; the UI holds the previous turn until playback completes. Bot actions wait for playback too.

The Animations toggle and Skip animation button bypass waiting. The operating system's reduced motion preference also shortens playback. Resumed games and replay snapshots render their existing state directly. Animation progress is never written into saved games.

The initial presentation uses controlled paths rather than physical collision or water simulation. Artwork, motion timing, card dealing and water effects can be refined on this foundation. The board and active pieces sit beside each other on desktop; the action area stacks above the board on smaller screens.

Run `npm run test:presentation` to check arrivals, blockers, exchanges, extra collection, Lake capacity and presentation consistency across complete games. `npm run test:sim` continues to exercise the rules. `npm run build` checks TypeScript and builds the game.
