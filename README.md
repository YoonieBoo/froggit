# Bug-Eating Frog 🐸

A cozy pixel-art frog that lives in your VS Code sidebar and **eats your bugs as you fix them**.

When your code has errors, little beetles fly into the frog's pond. Fix an error and the frog
hops over and snaps one up with its tongue. Get everything clean and it celebrates. Keep coding,
and your frog grows up — starting from an egg.

## How it works

| In your code | In the pond |
| --- | --- |
| An error appears | A red beetle flies in |
| A warning appears | A small yellow gnat flies in |
| You fix a problem | The frog notices, hops over and eats a bug |
| Zero errors and warnings | The frog celebrates 🎉 |

The pond doesn't show one bug per problem — 25 errors won't flood your sidebar. Up to 3 errors
show one beetle each; beyond that the swarm grows slowly to a maximum of 6 beetles and 3 gnats.

Bugs come from VS Code's own **Problems** list, so they work with any language that reports
problems: TypeScript, Python, Rust, ESLint, and so on. Note that many language tools only report
problems for files that are **open**.

## Growing up

Your frog earns XP from real coding activity:

| Activity | XP |
| --- | --- |
| Fix an error | +5 |
| Fix a warning | +2 |
| Get everything clean | +10 |
| Save a file with real changes | +1 |
| 25 minutes of active coding | +15 |

🥚 **Egg** → 🐸 **Baby Frog** (40 XP) → 💻 **Developer Frog** (600 XP) → 👑 **Senior Frog** (2500 XP)

XP is designed to reward coding, not gaming the system: problems must exist for at least 15
seconds before fixing them counts, saves only count when the file actually changed (and at most
once a minute per file), and there are hourly and daily limits.

Progress is saved on your machine and follows you across all your projects. If you use
Settings Sync, it follows you to other machines too.

## Getting started

1. Install the extension.
2. Open the **Explorer** sidebar and expand **Frog Pond** (or run **Frog: Show Pond**).
3. Code as usual. You can drag the pond to the bottom panel if you prefer a wider view.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `frogPet.countWarnings` | `true` | Show warnings as gnats and award XP for fixing them. Turn off if a linter reports many warnings you don't plan to fix. |
| `frogPet.reducedMotion` | `false` | Calmer pond: the frog stays put unless it's eating, with no confetti or water shimmer. Also turns on automatically when your OS "reduce motion" setting is on. |

## Commands

- **Frog: Show Pond** — open the pond.
- **Frog: Reset Progress** — start over from an egg (asks for confirmation).

## Privacy and safety

- **Never touches your code.** The frog only reads the Problems list; it never edits files.
- **Works fully offline.** No network requests, no accounts, no telemetry.
- **The pond only sees counts.** File names, paths and code are never sent to the pond view.
- The pond runs in a locked-down webview with a strict Content Security Policy.

## Development

```bash
npm install
npm run build      # bundle extension + pond
npm run typecheck  # type-check both
npm test           # unit tests (XP rules, diagnostics diffing, bug mapping)
npm run package    # build a .vsix
```

Press **F5** in VS Code to launch a development window with the `playground/` folder, which
contains deliberate errors and warnings to test with. In development mode there is also a
**Frog: Debug — Add 10 XP** command.

All art is original and drawn in code (see `src/webview/sprites/`).

## License

MIT — see the LICENSE file.
