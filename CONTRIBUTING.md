# Contributing

Thank you for helping build Open Video Automation Framework.

Before changing code, read:

1. `docs/START_HERE.md`
2. `specs/PROJECT_PRINCIPLES.md`
3. `specs/MASTER_SPEC.md`
4. `docs/ROADMAP.md`
5. The current phase prompt in `ai-prompts/`

## Local Checks

Run from PowerShell or Command Prompt on Windows:

```powershell
npm install
npm run acceptance
```

For a shorter loop:

```powershell
npm run typecheck
npm test
npm run benchmark:render
```

## Change Rules

- Public contract, schema, pipeline stage, database schema and renderer/provider boundary changes need an ADR or proposal.
- Do not add provider-specific logic to core, renderer or UI.
- Do not log secrets.
- Keep JSON Script validation before render.
- Keep tests focused on the risk introduced by the change.

## Pull Requests

PRs should include:

- problem being solved;
- files/modules changed;
- tests run;
- docs updated;
- known limits or non-goals.
