# BitLiquid VS Code Extension

A practical VS Code companion for BitLiquid with a project-aware **Control Center**, predictable terminal launch behavior, and quick access to useful BitLiquid workflows.

## Features

- **Real Control Center status** in the Activity Bar:
  - whether the configured `bitliquid` command is installed
  - the launch command being used
  - whether the launch shim injects `CLAUDE_CODE_USE_OPENAI=1`
  - the current workspace folder
  - the launch cwd that will be used for terminal sessions
  - whether `.bitliquid-profile.json` exists in the current workspace root
  - a conservative provider summary derived from the workspace profile or known environment flags
- **Project-aware launch behavior**:
  - `Launch BitLiquid` launches from the active editor's workspace when possible
  - falls back to the first workspace folder when needed
  - avoids launching from an arbitrary default cwd when a project is open
- **Practical sidebar actions**:
  - Launch BitLiquid
  - Launch in Workspace Root
  - Open Workspace Profile
  - Open Repository
  - Open Setup Guide
  - Open Command Palette
- **Built-in dark theme**: `BitLiquid Terminal Black`
- **Microsoft Foundry / Azure OpenAI**: optional wizard and settings store endpoint, API version, deployment name, and API key (Secret Storage); launch injects `OPENAI_*` and `AZURE_OPENAI_API_VERSION` into the BitLiquid terminal (see `docs/advanced-setup.md` on the repo).

## Requirements

- VS Code `1.95+`
- `bitliquid` available in your terminal PATH (`npm install -g @gitlawb/bitliquid@latest`)

## Commands

- `BitLiquid: Open Control Center`
- `BitLiquid: Launch in Terminal`
- `BitLiquid: Launch in Workspace Root`
- `BitLiquid: Open Repository`
- `BitLiquid: Open Setup Guide`
- `BitLiquid: Open Workspace Profile`
- `BitLiquid: New Chat` / `BitLiquid: Open Chat Panel` / `BitLiquid: Resume Session` / `BitLiquid: Abort Generation`
- `BitLiquid: Configure Azure / Foundry Chat (wizard)`
- `BitLiquid: Set Azure / Foundry API Key (Secret Storage)`
- `BitLiquid: Clear Azure / Foundry API Key`
- `BitLiquid: Open Azure / Foundry Settings`

## Microsoft Foundry / Azure OpenAI (terminal chat)

1. Command Palette → **BitLiquid: Configure Azure / Foundry Chat (wizard)** and enter endpoint, API version, deployment name, and API key; or set `bitliquid.azure.*` in Settings and use **BitLiquid: Set Azure / Foundry API Key**.
2. Enable **BitLiquid: Azure: Enabled** (the wizard turns this on).
3. **BitLiquid: Launch in Terminal** — the extension merges env vars the OpenAI shim expects (`CLAUDE_CODE_USE_OPENAI`, `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AZURE_OPENAI_API_VERSION`, and `OPENAI_AZURE_STYLE` when forced).

If you use `.bitliquid-profile.json` for the same workspace, leave Azure injection off to avoid conflicting provider configuration.

## Settings

- `bitliquid.launchCommand` (default: `bitliquid`)
- `bitliquid.terminalName` (default: `BitLiquid`)
- `bitliquid.useOpenAIShim` (default: `false`)
- `bitliquid.azure.*` — Foundry / Azure OpenAI terminal injection (see Settings UI)
- `bitliquid.permissionMode` — chat permission mode

`bitliquid.useOpenAIShim` only injects `CLAUDE_CODE_USE_OPENAI=1` when Azure injection did not already set it. It does not configure endpoints or keys by itself.

## Notes on Status Detection

- Provider status prefers the real workspace `.bitliquid-profile.json` file when present.
- If no saved profile exists, the extension falls back to known environment flags available to the VS Code extension host.
- If the source of truth is unclear, the extension shows `unknown` instead of guessing.

## Development

From this folder:

```bash
npm run test
npm run lint
```

To package (optional):

```bash
npm run package
```

