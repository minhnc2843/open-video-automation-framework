# Release Checklist

Use this checklist before tagging or sharing a release candidate.

## Required Checks

```powershell
npm install
npm run acceptance
```

Acceptance expands to:

- workspace baseline check;
- TypeScript project build;
- unit and integration tests;
- dry-run render benchmark;
- npm audit.

## Manual Review

- Confirm README phase status is current.
- Confirm `docs/ROADMAP.md` reflects completed phase scope.
- Confirm new public contracts have ADR coverage.
- Confirm generated `dist/`, runtime storage and media outputs are not committed.
- Confirm no `.env` or secret values are committed.
- Confirm Colab docs still point to non-Docker workflow.

## Release Notes Draft

Include:

- completed phase range;
- major package additions;
- test count and benchmark summary;
- known limitations;
- migration notes, if any.
