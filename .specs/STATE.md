# Project state

## Decisions

| ID | Decision | Rationale | Status | Date |
| --- | --- | --- | --- | --- |
| AD-001 | One is built as a React SPA/PWA (Vite + vite-plugin-pwa) with an ASP.NET Core Web API (REST) back end and PostgreSQL | Carried from `D:\One\One\.specs\STATE.md`; the group's choice for PEI IV (Manual §2.1.4) | active | 2026-10-02 |
| AD-002 | `.claude/scripts/verify.ps1` is not a gate for this repository | User decision 2026-11-01 ("esqueça verify.ps1"); proofs are the test commands named in `checks.md` | active | 2026-11-01 |
| AD-003 | Requirements are identified as `RF-NN`, `RNF-NN`, `UC-NN`; the source of truth is `D:\One\One\docs\requisitos\conteudo.md` | Carried; that document is newer than `specs/mvp-business-rules/requirements.md` (2nd interview, Q18, Q19) | active | 2026-11-01 |
| AD-004 | UI uses Bootstrap 5.3 through react-bootstrap, icons from bootstrap-icons | User decision 2026-11-01 | active | 2026-11-01 |
| AD-005 | The code lives in `D:\one-system` as a monorepo: `api/`, `web/`, `docker-compose.yml` | Session opened here; the requirements repo stays a documentation repo | active | 2026-11-01 |
| AD-006 | The assistant calls an OpenAI-compatible Chat Completions endpoint by configuration; default DeepSeek `deepseek-flash` | User decision 2026-11-01; provider swap is config only, because the DeepSeek privacy policy stores data in China (LGPD art. 33) | active | 2026-11-01 |
| AD-007 | Users sign in with CPF and a One password; student enrolments (matrícula) come from a CSV exported by Univag, never from the Portal do Aluno | User wants CPF to identify enrolments; the portal signs in by matrícula behind a captcha and has no public API | superseded by AD-009 | 2026-11-01 |
| AD-008 | One is a multi-institution product in one deployment and one database: every table except `instituicao` carries `instituicao_id`, enforced by an EF Core global query filter; the institution is chosen by the `/{slug}` path and carried in the auth cookie; Univag is the first institution | User decision 2026-11-01 ("não é focado especificamente na Univag"); retrofitting tenancy after data exists means migrating every table | active | 2026-11-01 |
| AD-009 | Users sign in with CPF (unique per institution) and a One password; enrolments come from a CSV exported by each institution's academic system, never from a student portal | Generalizes AD-007 for multi-institution; the same person may study at two client institutions | active | 2026-11-01 |
| AD-010 | The assistant works like a bank's virtual agent: it writes answers grounded only on the institution's published articles and must cite them, may ask clarifying questions, suggests a category and summarizes the case; a human is reachable at any time; the routing rule per category still decides the sector | User decision 2026-11-01, bank-style automated service; supersedes the earlier spec line "roteamento por IA fora do MVP" | active | 2026-11-01 |
| AD-011 | Text written by the model is never shown to a student without a verified official excerpt: each excerpt must appear literally (case-insensitive, whitespace-collapsed, 20-400 chars) in the cited published article version; otherwise the student sees the article verbatim, and with no article, a fixed "não encontrei". Everything shown is stored append-only | User decision 2026-11-01 after the hallucination risk (Moffatt v. Air Canada, 2024 BCCRT 149); the institution answers for what its assistant says | superseded by AD-012 | 2026-11-01 |
| AD-012 | Knowledge-base articles are internal: they are only a source for the AI and are never shown to students (no public FAQ, no article link, no excerpt). Students see only the model's text plus an AI notice; the server still verifies each excerpt literally against the cited active article version and every URL against the article links; on any failure the student sees the fixed "não encontrei" text and the transfer button. Excerpts and cited versions are stored append-only and shown only to attendants and admins. Article states: RASCUNHO, ATIVO, ARQUIVADO | User decision 2026-11-01 ("os artigos não são públicos, são apenas fonte de conhecimento para a IA"); keeps AD-011's verification, replaces its verbatim-article fallback | active | 2026-11-01 |
| AD-013 | tlc-spec-lean profile `standard` for mvp-one (the Verifier recomputes coverage and injects one fault per assertion surface); build by handoff in 4 sequential batches (S1+S2+S12+S3; S4+S5+S8; S6+S7+S9+S11; S10+S13), each starting only on green | User decision 2026-11-01; the one-builder estimate (187k) exceeds the 150k budget, and the excerpt check and tenant isolation need fault injection to prove the tests can fail | active | 2026-11-01 |

## Handoff

**Feature**: mvp-one
**Where**: lotes 1 (S1, S2, S12, S3) e 2 (S4, S5, S8, mais as rotas do S6) verdes; 142 dos 195 checks marcados em `checks.md`; abertos e decisões do lote 2 em `checks.md` `## Handoff`
**In progress**: none
**Next step**: lote 3 (S6 na tela, S7, S9, S11), lendo `checks.md` e o diff do lote 2; telas de administração do S8 ainda faltam para a banca
**Blockers**: none para o build; as seis perguntas `blocks go-live` do plano continuam abertas
**Uncommitted**: nothing (lote 2 em e63e552 e 8746e74)
**Branch**: main
