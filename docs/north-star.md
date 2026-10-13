# BART's goal

An agent already working in Brave Core should be able to take an ordinary Brave Android request, use source and the running app, and deliver a useful result with evidence that supports its claims.

That result may be an explanation, bug investigation, code change, prototype, scoped verification assessment or draft PR. A well-observed failure or a supported finding that no change is needed can be a useful result. Completion follows the request, not a required product pass.

## Responsibilities

| Component | Responsibility |
| --- | --- |
| Current host agent | Reason, inspect/edit source, choose tools/actions, iterate and assess outcomes. |
| Androperator | Execute explicit Android actions and return observations, results and evidence. |
| BART | Supply Brave-specific knowledge, workflow judgment and reporting/reproduction guidance. |
| Core and existing development tools | Build, install, retrieve artifacts and perform authorized repository operations. |

Use the smallest useful skill set. One-off work needs no formal preparation package or saved reproduction skill. BART supplies instructions to the current agent rather than a separate execution framework.

## Working model

Understanding, acting and reporting are capabilities that the agent can revisit freely. A runtime surprise can lead back to source; a code change can require new setup research; a report can reveal missing evidence. The next action follows current evidence and the user's scope.

Development can iterate through inspect → edit → build/install → observe → revise. Verification can assess an existing build without editing it. Reuse sufficient context and capture evidence while the behavior happens.

Useful delivery is readable, scoped and truthful about the actual build, observations, failures and omissions. Requested publication has accessible evidence and a confirmed destination. An automated BART assessment is not an official QA sign-off. [Reporting](reporting.md) defines these distinctions.
