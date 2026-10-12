# Using Brave QA resources

Use maintained Brave QA material to find relevant expectations, prerequisites and nearby regression checks. Load the applicable section when it helps the task; an issue-specific assessment does not inherit a full release test pass. Report formatting is owned by [reporting](reporting.md#verification-summary-format).

## Where to look

The [qa-resources repository](https://github.com/brave/qa-resources) contains Android release/Wallet checklist templates and test inputs. Its [wiki](https://github.com/brave/qa-resources/wiki) contains feature-specific plans. Use an available local checkout or read the remote source; no prescribed machine path, new installation or generator run is required. Record the revision/section used when it supports the selected checks.

| Reference | When useful | Limits |
| --- | --- | --- |
| [Android full-pass template](https://github.com/brave/qa-resources/blob/master/WikiTemplate/Android/wikitemplate-android.md) | Relevant appearance/settings checks, actual version checks and upgrade persistence conditions. | Broad release checklist, not compulsory scope for a fix. Check current feature names/defaults against source and app. |
| [Android minor-Chromium/hotfix template](https://github.com/brave/qa-resources/blob/master/WikiTemplate/Android/wikitemplate-minorCRbumpAndroid.md) | Smaller settings, custom-tab and upgrade regression leads. | “Basic checks” still exceed many individual PR tasks; select meaningful sections. |
| [Android Wallet template](https://github.com/brave/qa-resources/blob/master/WikiTemplate/Crypto/wikitemplate-cryptoAndroid.md) | Wallet settings such as autolock, networks and Web3 notifications; feature-specific regression leads. | Includes onboarding, transactions and resets that are not implied by a settings verification. |
| [Android Sync V2 wiki plan](https://github.com/brave/qa-resources/wiki/Android-Sync-V2) | Sync identity, offline state, invalid inputs and multi-device prerequisite examples. | Historical navigation, defaults and clean-install requirements need current/task-specific interpretation. |
| [Test links](https://github.com/brave/qa-resources/blob/master/testlinks.json) | Candidate sites/input fixtures for a relevant check. | URLs may be stale or external content may have changed; a link alone is not an expectation or known-good fixture. |

The wiki page called “Brave Native Wallet Test Plan” describes Desktop, while “[TBA] Mobile Wallet Test Plan” is a placeholder in the inspected checkout. Do not select a plan by its title alone or claim mobile coverage from either. Inspect actual contents/platform and use the Android Wallet template when appropriate.

## Apply the useful knowledge

- Establish original settings/state before changing them, then observe persistence and usability after the relevant event. The Android templates explicitly check retained settings and expected installed versions; use those principles in scoped checks, not a compulsory setup package.
- For an upgrade assessment, establish the relevant pre-upgrade state before installing the new build. Merely observing data after an upgrade does not prove it was retained. Upgrade checks are distinct from verification on an already installed current Nightly.
- Keep phone/tablet and feature-state coverage explicit. The test-run generator separates device classes; testing one phone is not tablet coverage.
- Treat broad checklists as candidate coverage. Issue/PR requirements and current source/app determine the actual trigger and scope. Investigate conflicts or obsolete expectations rather than copy them as assertions.

The repository README and Python generators describe release-note/test-run creation, including GitHub writes and separate credential setup. They are not an agent runtime dependency or a required route for one PR's assessment. Reuse existing host access for reads; do not copy credential-handling instructions or run generators to obtain a checklist.

Maintain links to the upstream material rather than duplicate whole plans here. Keep task-specific selected checks and results in the working directory. Bring back only durable Brave-specific lessons that help future work.
