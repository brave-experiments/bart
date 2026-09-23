# Presubmit checks

Install the locked Node dependencies with `npm --prefix node ci` and use the
Node version in `.nvmrc`. Run commands through `scripts/bart` from any directory.

| Command | Checks |
| --- | --- |
| `./scripts/bart check-all` | Types, tests, build, lockfile lint, security scan, and commit signature warnings. |
| `./scripts/bart pr-ready` | The same checks, but every branch commit must have a valid, trusted signature. |
| `./scripts/bart check-signatures` | Require valid, trusted signatures for every branch commit. |
| `./scripts/bart check-reviewdog` | Scan the branch and current source for security findings. |
| `./scripts/bart check-reviewdog --full` | Scan the whole current source tree, including findings that predate the branch. |

All commands accept `--base REF`, defaulting to `origin/main`. Branch checks use
the merge base with that ref. Fetch the intended base before checking; the commands
do not update it. Missing refs and shallow history fail rather than omit commits.
Full security scans do not need a base. `check-all` and `pr-ready` continue independent
checks after a failure and return nonzero if any required check fails.

## Signatures

Unsigned commits are expected during development. `check-all` lists them as
warnings without failing. It also warns about invalid, expired, revoked, or locally
unverifiable signatures. `pr-ready` and `check-signatures` fail on these cases.
The range includes every commit reachable from HEAD after the merge base, including
commits brought in through merges. The base commit itself is excluded.

Verification uses Git's local trust configuration, including
`gpg.ssh.allowedSignersFile` for SSH signatures or the local GPG keyring. A signature
that Git cannot verify is reported separately from an unsigned commit. Configure
trusted signers through your normal Git setup; these commands do not change trust,
create signatures, or rewrite commits. A GitHub Verified badge alone is not a local
verification result.

`pr-ready` checks committed signatures and the current source. It does not require
a clean working tree, publish a PR, or replace review and device testing.

## Security scan setup

Set `BART_WORK_DIR` to an absolute path outside the repository. No Brave Core
checkout, model credentials, or Android device is needed. The scanner keeps source
snapshots, rules, output, and failed attempts under
`$BART_WORK_DIR/cases/presubmit/runs/`. It caches OpenGrep under
`$BART_WORK_DIR/cache/`. These files are retained for inspection; there is no automatic
cleanup.

Install Git, Bash, Ruby, Python 3, jq, and reviewdog **0.17.5** on PATH. On macOS,
Git/Bash/Ruby are commonly already available; install missing tools through your
usual package manager. Reviewdog release binaries are available from
[reviewdog v0.17.5](https://github.com/reviewdog/reviewdog/releases/tag/v0.17.5).
Check the installed version with `reviewdog -version`.

The scanner downloads OpenGrep **1.30.0** and verifies the binary against the SHA256
pinned by Brave's security action. The initial supported hosts are macOS arm64 and
Linux x64, the distributions with checksums in that action revision. Missing tools,
unsupported hosts, downloads that fail, and checksum errors fail the check.

The rules and runner commands come from
[brave/security-action at 0e33cb6a9c05ff50538df044f7eda3983084d40c](https://github.com/brave/security-action/tree/0e33cb6a9c05ff50538df044f7eda3983084d40c).
Update that pin and the tool versions/checksums together after checking upstream.
The command prints these versions on each run. Organization CI can move ahead of
this pin, so a local pass does not promise the same result from future rules.

The selected runners are OpenGrep and npm-audit, covering Bart's TypeScript/JavaScript
and npm lockfile. Add other runners when Bart gains the corresponding inputs, such
as SVG, HTML/Svelte, or Python dependency manifests. This command does not claim to
run those checks today.

The scan copies tracked files and untracked files not excluded by Git, including
staged and unstaged edits and deletions, into a disposable Git checkout. It does not
modify the source checkout's index or refs. Ignored files, such as local configuration,
build output, and dependencies, are excluded unless tracked. Internal symlinks are recreated inside the snapshot. Links outside the repository,
links to content excluded from the snapshot, and submodules fail the check.

OpenGrep scans current source without a commit-only baseline; reviewdog filters
findings to the branch and working-tree diff. The npm-audit runner examines changed
lockfiles in branch mode and all tracked lockfiles in full mode. Full mode retains
all findings. Scanner failures fail the command even if a pipeline or diff filter
hides their output. OpenGrep runs in strict mode so partial parsing and other scan
warnings fail before the upstream formatter discards JSON errors. Runner stderr also fails the check so an incomplete scan cannot
look clean. No scan posts GitHub comments or uses a model. Rule downloads and npm
audit need network access.

## CI and follow-on checks

The Node workflow installs dependencies, sets up reviewdog, fetches full history,
and runs `check-all` using the PR base commit. Signature problems remain warnings
there; use `pr-ready` when preparing the branch for review.

Formatting, general TypeScript lint, workflow lint, documentation links, and a wider
Node/platform matrix are separate follow-on work. `doctor` and live agent/device
checks remain outside presubmit because they require local runtime setup.
