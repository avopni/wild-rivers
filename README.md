# Wild Rivers — playable prototype

A responsive, local-first web game based on the rules research in `docs/` and the supplied board references. Some component faces are still invented prototype content, so the implementation identifies itself as **prototype-2026.1**.

## Launch

Install Node.js 20.19+ or 22.12+, then from this directory:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. For a production bundle, use `npm run build` and `npm run preview`.

On this workspace machine, a temporary portable Node runtime is already in `.tools/`; `powershell -ExecutionPolicy Bypass -File .\start.ps1` starts the game without a system Node install.

## Play online with GitHub Pages

The game runs entirely in the browser. GitHub Pages can host it without a game server or any installation for players.

1. Push this project to a GitHub repository with a `main` branch.
2. In the repository's **Settings > Pages**, set **Source** to **GitHub Actions**.
3. In **Actions**, run **Deploy game to GitHub Pages**, or push another change to `main`.
4. Open the website URL shown by the deployment. Normally it is `https://<username>.github.io/<repository>/`.

The workflow installs dependencies, builds the `dist/` folder, and publishes it automatically on later pushes to `main`. It obtains the site's base path from GitHub Pages, supporting both repository URLs and custom domains. For a local preview of a repository deployment, run `npm run build -- --base=/wild-rivers/` followed by `npm run preview -- --base=/wild-rivers/`, and open the `/wild-rivers/` path on the preview server.

Autosaves and records stay in each browser. To move an existing local game to the website, export it as JSON from Records and import it on the hosted site. Browsers do not share saves automatically.

## What works

- Approved v3 forest board with persistent llama columns, public goals, available-villager comparison, grouped human Camp hands and hidden bot hands. Setup deals and settles the real villagers, draws pearls behind closed gates, waits for each faerie’s OK, and presents the prepared turn order. Tribe tokens, Camp draws, recruitment, collection and delivery animate from the existing rules state. See [`docs/presentation.md`](docs/presentation.md).
- Elemental faeries and magical Camp tools use the names in [`docs/content-names.md`](docs/content-names.md). Older naming-version saves upgrade automatically, including replay and undo history. `npm run test:content` checks their powers and migration.
- Two to four local players, with any seat controlled by a basic versioned bot.
- Five rounds of seeded pearl, Fairy, Villager, Camp, and starting-order supplies.
- Placement, Camp costs and market draws, Fairy collection, river and Lake pearl selection, Alpaca exchange, goals, Village recruitment, delivery, and final score breakdown.
- Matching Camp pairs, single-use Fairies, and a River Guide that compares choices at placement, pearl collection, recruitment, and delivery. Policy estimates, exact next-draw chances, and fixed board outcomes are labeled separately.
- Delivery moves can be undone during the current player's delivery turn. Camp cards have illustrated artwork and hover descriptions; see [`docs/generated-art.md`](docs/generated-art.md) for the saved assets and prompts.
- IndexedDB autosave, resume, complete action and state history, step replay, JSON export/import, and basic record statistics.
- `npm run test:sim` simulates complete 2, 3, and 4 player games on repeatable seeds.
- `npm run test:presentation` checks state conservation, setup acknowledgements, resume checkpoints and complete five-round presentations. `scripts/verify-ui-v3.mjs` runs the browser checks against an isolated headless Chrome profile; see the presentation notes for commands.

## Prototype content and current limits

`src/game.ts` is the content and rules boundary. It contains the board slots and paths, 26 unique Villager definitions, a shared Starting Villager, five fixed one-time Llama goals worth four points each, and an evenly divided 50-card Camp deck. All player counts use one A–L river map: A–L merge into AB/CD/EF/GH/I/JK/L, then ABCD/EF/GHI/JKL, then ABCDEF/GHIJKL, then ABCDEFGHIJKL. Two, three, and four players activate A–F, A–I, and A–L respectively, with downstream sections included when they contain an active source. Each player count has its own full-board image and centered layout; the active sources span the playing area and the final river drains vertically into the Lake. Unclaimed Fairy tokens stay on their site and can stack across rounds. Final scoring occurs after round five. Sections have 1/2/3/4/5 marker sockets by tier. White and purple goals require three matching pearls; pink, blue, and green require four. Pearl values are white 5, purple 4, pink 3, blue 2, and green 1. The vector Villager portraits live in `public/villagers/`, with a viewable `gallery.html` in that folder. Regenerate them with `node scripts/generate-villagers.mjs`. The remaining content gaps are listed in `docs/physics.md`.

The approved visual reference is [`docs/mockups/approved-rounds-v3/HANDOFF.md`](docs/mockups/approved-rounds-v3/HANDOFF.md). Desktop, laptop and landscape tablet are supported. The compact player column scrolls when necessary; inspecting a row opens full detail with 44px socket controls. Phone layout remains deferred.

Camp placement payments are chosen automatically, keeping pairs when possible. The bot is a simple deterministic heuristic and does not play every optional special action. Its explanations compare estimates; they do not establish optimal play. Game records are scoped to one browser origin, so export JSON before clearing browser data. Earlier saves remain in the Records list for export; their older rules versions prevent resuming or replaying them under the current rules.

The intended extension points are `makeSlots`, `makeVillagers`, and `createGame` for content, `reduceGame` for rules, and `chooseBotAction` / `explainChoice` for policy. Saved records include the content and policy version, seed, action log, decisions, and replay snapshots.
