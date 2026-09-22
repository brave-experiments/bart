# Agent configuration

BART will use agents inside its skills to orchestrate Clawperator. A skill will
supply the objective, instructions, target device, run directory and limits.
The agent will choose actions from current observations and assess the result;
Clawperator will execute device actions and return observations, screenshots
and recordings. BART will retain that evidence and validate the saved results.
The [implementation plan](plan.md) describes how these skills will fit together.

This follows Clawperator's [agent operating loop](https://docs.clawperator.com/quickstart/):
observe, decide, then act. See its [host-agent guidance](https://docs.clawperator.com/host-agents/)
for choosing between runtime skills, MCP and direct CLI use, and its
[skill authoring guide](https://docs.clawperator.com/skills/authoring/) for building
reusable workflows.

Claude Code is BART's intended agent runtime. The model provider is a separate
choice: Bedrock is one option, not a requirement. This guide covers Claude
login, API-key access, and Bedrock configuration. The optional `doctor --claude` check
verifies a model reply; the device-orchestration skills and general child-agent
launcher remain planned work.

## Choose how Claude accesses models

Install Claude Code and make `claude` available on PATH. Configure one access
method for the environment that will launch BART's skills.

### Claude account or Anthropic Console

Run `claude auth login` and follow the prompts for your account. BART's safe
and restricted modes do not require a separate account. Do not enable
`CLAUDE_CODE_USE_BEDROCK` or supply Bedrock model IDs for this route.

If you use an Anthropic API key instead, make `ANTHROPIC_API_KEY` available in
the child environment through your usual secret-management setup. Keep keys
out of committed files and logs. A key supplied only by a user-settings
`apiKeyHelper` will not be loaded by BART's restricted invocation.

See [Claude Code authentication](https://code.claude.com/docs/en/authentication)
for account types, API access and other provider options. Use the corresponding
provider setup if your organization uses another supported service; this guide
does not establish that BART has tested every provider.

### Amazon Bedrock

Use an AWS profile with access to the required Bedrock models. Add these
non-secret settings to your local `.envrc`, replacing the placeholders:

```sh
export CLAUDE_CODE_USE_BEDROCK=1
export AWS_REGION="your-aws-region"
export AWS_PROFILE="your-aws-profile"
export ANTHROPIC_DEFAULT_OPUS_MODEL="your-bedrock-opus-model-id"
export ANTHROPIC_DEFAULT_SONNET_MODEL="your-bedrock-sonnet-model-id"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="your-bedrock-haiku-model-id"
```

Use model IDs or inference profiles available to your account and region.
Existing Claude user settings can supply these non-secret values, but BART's
restricted invocation does not load that settings file. Do not copy the whole
file or credentials into BART configuration.

Claude uses the AWS credential chain. Set up or renew the profile through your
organization's normal AWS login flow. For SSO profiles, load `.envrc` and run
`aws sso login --profile "$AWS_PROFILE"` when login is needed. An Anthropic login
is not required for Bedrock. See the [Claude Code Bedrock setup guide](https://code.claude.com/docs/en/amazon-bedrock).

## Load configuration before starting the agent

Create `.envrc` from `.envrc.example` only if it does not already exist. Set
`BART_BRAVE_CORE_DIR` and `BART_WORK_DIR` for every provider, and add only the
provider settings you need. Then load it before starting BART or the parent
coding agent:

```sh
source .envrc
# Or approve the updated local file for direnv:
# direnv allow
```

BART does not source `.envrc` itself. An already running parent process does not
inherit exports from another terminal. Restart it from the configured shell,
or explicitly pass the configured environment to its Claude child. Removing
an export from `.envrc` also does not unset a value already loaded in a shell;
start a fresh shell or unset obsolete provider variables when switching routes.

Each worktree needs its own ignored `.envrc`, or must inherit configuration from
a shell that loaded the intended file. Keep local paths and account-specific
configuration out of commits. A worktree does not inherit ignored files from
the main checkout.

## Invoke Claude from BART skills

The checked preparation profile is:

```text
--safe-mode --restricted --strict-mcp-config
--tools Read,Write,Edit --permission-mode acceptEdits
```

`--restricted` skips user, project and local settings, including their `env`,
`apiKeyHelper` and `awsAuthRefresh` settings. Pass provider configuration through the inherited environment. Complete any
required login before starting a noninteractive run. `--safe-mode` retains authentication
but disables automatic skills, instructions and other customizations.
`--strict-mcp-config` excludes implicit MCP configuration. The tool list and
permission mode govern file operations, not AWS authentication. See the
[CLI reference](https://code.claude.com/docs/en/cli-reference).

For a skill-driven preparation:

1. Load the environment before launching the child. If a launcher sets `env`,
   merge the inherited environment with BART's resolved `childEnv`; the latter
   contains only the two BART paths and is not a complete child environment.
2. Supply the skill instructions and required reference files explicitly in
   the prompt or as readable saved copies. Do not expect `/bart-prepare-case`
   or automatic `SKILL.md` discovery to work in safe mode.
3. Use the intended case or run working directory and grant only the required
   file directories. Restricted file tools cannot read arbitrary directories.
4. Preserve the prompt, instructions and result with the preparation or run.
   Require a valid, non-error result and validate the output package separately.

The file-only profile supports work on saved evidence. It does not provide
shell-based research or Clawperator device access. The repository has no general
child-agent orchestrator yet; later skills must define and verify their own
required tools. Do not remove restrictions just to make a failing check pass.

## Verify the setup

Run `./scripts/bart doctor` from the environment that will launch the skill.
Add `--claude` to verify an actual reply; this opt-in check may incur model
charges. The default check sends no model request.
See [doctor](doctor.md) for checks, network use, model costs, limits, and
troubleshooting. A pass outside a sandbox does not prove access inside it.
