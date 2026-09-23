# Project Engineering Guide

## Project Discovery

Before making non-trivial changes:

- inspect the repository structure and the build system actually in use;
- identify the affected components and their boundaries;
- inspect existing implementations of similar behavior;
- identify the relevant build and test commands;
- do not assume architecture, language conventions or tooling from directory names alone.

## Architecture

Follow the architecture already established by the repository.

- Respect existing dependency directions.
- Do not introduce new architectural layers without a concrete need.
- Prefer existing abstractions when they fit the problem.
- Do not move responsibilities between components as an unrelated refactor.
- Preserve public contracts unless the requested change requires otherwise.

When architectural intent is unclear, investigate before changing it.

## Implementation

Prefer small, cohesive changes.

Do not:

- refactor unrelated code;
- introduce abstractions for hypothetical future requirements;
- replace established libraries without a requirement;
- change public APIs unnecessarily;
- suppress errors only to make verification pass.

## Verification

The canonical verification for this repository is:

```powershell
.\.claude\scripts\verify.ps1
```

It runs this project's build and test steps in order and checks the diff for whitespace
damage. It prints `VERIFICATION PASSED` or `VERIFICATION FAILED` and exits non-zero on
failure.

Run it before reporting a code change as complete. **A task is not complete while it is
failing.** Do not substitute your own judgement for its result, and do not report success
without having run it.

If verification fails for reasons unrelated to your change, say so explicitly and name the
failures rather than working around them. Never weaken a test, suppress a warning, or narrow
the verification scope in order to make it pass.

> If `verify.ps1` reports that no verification steps are defined, the script has not been
> completed for this project yet. Populate `$VerificationSteps` in
> `.claude\scripts\verify.ps1` with the real build and test commands before relying on it.

## Repository State

Before substantial changes, inspect the current Git state.

Preserve:

- unrelated user changes;
- untracked work that is not part of the task;
- existing branch history.

Do not commit or push unless the active workflow explicitly requires it.
