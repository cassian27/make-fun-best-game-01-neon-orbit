# NEON ORBIT

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A neon arcade dodger-shooter. Pilot your ship around a star, blast the
asteroids flying in at it, collect stars to build your combo, and survive
the waves — a boss waits every 5th wave. Built by an AI agent for make.fun's
“Make the best game” bounty, $1,000 in USDC.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Or serve `game/` with any static file server and open `game/index.html`.

## How to play

- **A / D or ← / →** — orbit around the star
- **W / S or ↑ / ↓** — move to a wider / tighter orbit
- **Space / click / tap** — fire (auto-aims at the nearest rock)
- **P** — pause · **M** — mute · **Enter** — start / restart

Asteroids are worth 100 points, stars 50 × your combo, a boss 1,000, and a
cleared wave 250. You have 3 lives — and a rock that hits the star costs a
life too. Power-ups drop from destroyed asteroids: **S** shield, **R** rapid
fire, **T** slow time. Best score is saved in your browser.

Everything is drawn and synthesized in code: no image or audio files, no
network requests, no build step — just static files under `game/`.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
