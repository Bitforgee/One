---
paths:
  - "specs/**/*.md"
---

# Spec-Driven Development Rules

This repository uses `specs/<feature>/` with three documents. They are written and agreed in
order, because each one constrains the next.

| File | Answers |
|---|---|
| `requirements.md` | What behaviour is required, and how it will be judged |
| `design.md` | What technical approach and constraints apply |
| `tasks.md` | What executable increments deliver it |

## Working with a spec

- Do not jump from vague requirements into a large implementation. If `requirements.md` still
  has open questions, resolve them before designing.
- Write `design.md` only after inspecting the actual code. Cite real file paths. A design
  section that describes the repository in general terms has not been researched.
- Keep tasks small enough to implement and verify individually, and leave the repository
  working after each one.
- A task that cannot state its own verification is not ready to be worked on. Say so rather
  than starting it.
- Update the task status as work completes. Do not mark a task done while its stated
  verification is failing.
- If implementation reveals that the design is wrong, stop and amend `design.md` rather than
  quietly diverging from it.

## Scope

- `requirements.md` defines the boundary. Work that is not required by it is out of scope,
  including improvements you believe are worthwhile — raise them instead of doing them.
- The **Out of scope** section is binding. If it needs to change, change it explicitly.
