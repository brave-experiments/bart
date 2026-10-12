# Reproduction packages

Save reusable instructions when requested or worthwhile, especially when unusual setup or discovered navigation would help another attempt. Ordinary steps may fit directly in an assessment/PR. Packaging is optional, not a gate for development or verification.

## Small, portable contents

```text
reproduction/
  SKILL.md
  README.md
  original-attempt.md
  evidence/
  helpers/
```

Create only needed files/directories. `SKILL.md` leads with the goal and expected observations, then necessary build/feature/site/account/device prerequisites, adaptive actions and stopping conditions. The later agent follows current Androperator instructions, observes fresh UI and independently assesses results. No runtime registry, installation manifest or schema is required.

`original-attempt.md` records the actual historical build/device/conditions, observations, failures, evidence and limits. Do not put an inherited pass verdict into the future instructions. Historical settings and coordinates are leads, not current state. `README.md` explains how to read the skill, choose the target and locate dependencies/evidence without requiring the BART checkout.

Use portable relative files or accessible remote links. Include helpers only for a concrete mechanical need, with explicit inputs and source or retrievable versioned dependencies. Remove hard-coded local/device paths and credentials from shared contents. [Build identity](builds.md) and [evidence](evidence.md) explain what the original receipts support.

Include relevant task-local [recipe candidates](recipes.md#save-recipe-candidates-from-a-session) when they help a future attempt, or incorporate their necessary adaptive actions and restoration steps. Keep observed evidence/limits with them; an exported candidate does not automatically become a maintained BART recipe.

## Creation, reuse and sharing

Writing the package can complete a request to save instructions. Check that links and dependencies are available and the observations distinguish success, failure and uncertainty. A ZIP is optional when transport benefits from it.

When a live reuse test is requested, start a new attempt from a different app screen, reacquire relevant prerequisites and assess outcomes independently. Preserve failed attempts and deviations. A successful archive command, syntactically valid skill or author's repeat run is not proof of fresh-agent portability. Report whether reuse was tested and its coverage.

Sharing is separately scoped through [reporting](reporting.md#publication). Do not upload or launch extra live sessions merely because packaging is useful. A later agent stores its own result separately rather than editing the original history into a new verdict.
