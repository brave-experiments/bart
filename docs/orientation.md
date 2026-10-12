# Brave Android orientation

Use this map to locate the source, tools or guidance needed for the current request. Load detailed references only when they matter.

## Source map

| Location | Useful starting point |
| --- | --- |
| Core root, normally `src/brave` | Brave customizations and package build tools. Read its own agent instructions. |
| Core `docs/README.md` and `docs/best_practices.md` | Indexes for current source, test, patch and review practices. |
| Core `android/java/` | Brave Android Java code, layouts, styles and resources. Search the visible label/resource and trace its owner. |
| Core `components/`, `browser/` and relevant native Android code | Behavior behind UI, feature gates, services and lifecycle. |
| Parent Chromium `src/` | Upstream behavior and dependencies; compare its actual revision to the one required by Core. |
| `brave/brave-browser` | Issue reports, releases and [development wiki](https://github.com/brave/brave-browser/wiki). |
| `brave/brave-core` | Product PRs, diff/reviews and build status links. |

A label search identifies a starting point, not necessarily the behavior's owner. Follow the relevant call sites, layouts/themes, feature guards and tests. [Understand](understand.md) covers research depth and revision handling.

## Running app

Androperator exposes UI hierarchies, screenshots, semantic selection, gestures, text entry and evidence capture through maintained interfaces. The current agent supplies strategy and assessment. Use installed orientation/control-loop instructions or the [host guide](https://docs.androperator.com/host-agents/) and [documentation index](https://docs.androperator.com/llms.txt).

Select an explicit device and matching Operator, then use readiness for the needed capability. Interactive UI work and background observations have different gates; consult current Androperator guidance rather than require every tool for every task. Keep one controller on the device and one writer in the build workspace. Resolve conflicting use before acting.

Use [action recipes](recipes.md) for system theme, rotation and adaptive Brave settings navigation. Find controls from current UI rather than fixed taps. Hierarchy labels help target controls; screenshots are needed for visual shape, color, focus or occlusion. [Evidence](evidence.md) covers how to support conclusions.

## Work and delivery

Use [develop](develop.md) for source changes, [verify](verify.md) for existing-build assessment and [builds](builds.md) for artifacts/build/install. Optional Scaffold tools can help if present; Core's supported standalone workflow remains usable.

Use [reporting](reporting.md) for output/delivery and [reproduction](reproduction.md) only when future-attempt instructions help. [Setup](setup.md) selects local defaults. A configured posting repository is independent of the repo being investigated.
