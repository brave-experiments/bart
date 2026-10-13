# BART capabilities and validation

BART provides three current-agent skills: a natural-language entry point, reporting and optional reproduction guidance. Shared docs cover development, QA and technical review, with optional local configuration. Initial QA workflows are demonstrated; runtime-backed technical review needs live validation. These statuses describe observed capabilities, not stages every request must follow or guarantees across devices and hosts.

## Available capabilities

| Capability | Status | Observed coverage and limits |
| --- | --- | --- |
| Source-aware investigation and current-Nightly QA | Demonstrated in initial local runs | Wallet theme-restoration and Appearance assessments used PR/source context and the running app. These are scoped trials, not a reliability benchmark. |
| Personal skill discovery | Checked with OpenCode 1.19.0 | All three skills were discovered from Core through personal links. Other host/version combinations need their own checks. |
| Phone/tablet and orientation coverage | Demonstrated with gaps | Appearance runs inspected physical/emulated phones and a tablet emulator in portrait/landscape. End-of-list landscape usability remained incomplete in the reviewed runs. |
| Foreground system-theme checks | Demonstrated | Wallet runs captured ADB-triggered theme changes with the affected page foreground. Later Appearance runs retained final-state observations but lacked equivalent transition footage. |
| Local HTML reports and text-only context ZIPs | Demonstrated | Reports linked captures and context exports. Browser-rendered layout/playback inspection was not established in the reviewed reports. |
| Live capture labels and action toasts | Demonstrated in a Wallet refresh | Captures showed package/version labels and theme announcements; overlap/truncation required adjustment. Current placement/Android metadata guidance still needs consistent use. |
| Configuration-specific visual findings | Demonstrated | A later Appearance run identified a tablet-only missing icon/alignment difference and a phone navigation-area concern, with classification/coverage limits. |

Task-specific reports and receipts remain in working directories. Use their observations as historical context, never as current device state. Documentation changes alone do not establish that later runs follow every evidence requirement.

## Next validation priorities

- Demonstrate local feature development from a plain request without prior conversation history: source edits, relevant tests, build/install, runtime inspection and a concise local summary. Honor requested discussion checkpoints without adding routine approval gates to autonomous execution.
- Demonstrate development-to-QA iteration using the changed APK, not Nightly, through the main entry point. Then demonstrate a runtime-backed PR review with pinned checkout/sync/build, focused task-local fixtures and findings-first evidence delivery, without implicitly fixing product code.
- Exercise the opt-in Brave Scaffold build/test route during that demonstration, loading its maintained local skill and using the selected Core checkout explicitly. Configuration and command-help checks establish integration setup only, not a successful feature build or runtime validation.
- Exercise an optional unattended local pre-submit QA pass on the developer's actual changed build. Complete the selected phone/tablet, landscape and foreground-theme scope, or return precise blockers and useful partial results.
- Complete full affected-screen/end-of-list coverage, per-device in-app identity and decisive transition inspection consistently in future QA runs. Finding a defect does not establish completion of the other selected checks.
- Validate model/harness/reasoning metadata reporting, privacy-safe report assets and portable text context exports against the current guidance.
- Validate first-use Android setup on a separately scoped clean host/environment where Androperator is absent, then resume a bounded app task. The maintained bootstrap route is documented but has not been demonstrated by BART's existing-install QA trials.

## Independent integrations

| Integration | Status | What remains to demonstrate |
| --- | --- | --- |
| Additional host/version coverage | Limited | Native invocation and linked-document access for each supported host, beyond the inspected local discovery route. |
| Exact PR APK retrieval | Not demonstrated | Existing job/artifact route, revision and installed APK identity. Normal merged-fix QA uses current Nightly instead. |
| Requested external publication | Not demonstrated | Resolved destination, accessible media/context ZIP and confirmed comment/issue URL. |
| Actual draft PR delivery | Not demonstrated | A real PR URL and draft state in the selected base repository; a preview is distinct. |
| Independent reproduction reuse | Not demonstrated | A fresh attempt following exported instructions and independently assessing the result. ZIP integrity alone does not establish this. |

Missing integration access does not invalidate completed scoped work. Add helpers only when actual repeated mechanical work demonstrates a need. [Builds](builds.md), [verification](verify.md) and [reporting](reporting.md) define how to attempt and describe the work.
