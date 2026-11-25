# Thunder Knight

A casual third-person wave shooter for Poki. One stranger with modern guns holds Queen Ada's banner against the Iron
Baron's medieval army: knock out soldiers, rout captains, collect gold, and spend it at Rosie's truck on guns,
upgrades and soldiers. "Knight Makers" is the folder name only.

```bash
npm install
npm run dev        # http://localhost:5180 (Browser pane launch config "knight")
npm test
npm run package    # release/thunder-knight-<version>-poki.zip
```

Start with [CLAUDE.md](CLAUDE.md) for commands and rules, then [docs/milestones.md](docs/milestones.md) for status.
The design is in [docs/vision.md](docs/vision.md), [docs/gdd.md](docs/gdd.md), [docs/onboarding.md](docs/onboarding.md)
and [docs/tech-design.md](docs/tech-design.md). Research is in [docs/research/](docs/research/).

Dev URL flags:
- `?dev` shows fps, tier and draw calls.
- `?noads` plays as the ad-free build.
- `?lang=xx` picks a language.
- `?scene=clash` (or `hill`, `front`, `empty`) starts at a crowd test scene.
- `?battle=2&wave=3&gold=500` jumps into a battle (dev builds only).
