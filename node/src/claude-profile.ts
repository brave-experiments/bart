// File-only profile for tasks on saved inputs. Provider settings come from the environment.
export const claudePreparationArgs = [
  "--safe-mode", "--restricted", "--strict-mcp-config",
  "--tools", "Read,Write,Edit", "--permission-mode", "acceptEdits",
];
