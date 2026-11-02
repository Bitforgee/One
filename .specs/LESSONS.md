# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Plan/Checks)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Regra de 'último de vários' só é provada por um teste com dois ou mais itens diferentes; um item só não distingue primeiro de último.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api/chamados` · harmful: 0
- features: mvp-one
- evidence: api/Chamados/Transferencia.cs:30 (F5) (api/chamados)
- last seen: 2026-11-02T15:26:00Z

### L-002 - Confira que cada filtro de prova executa exatamente um teste: um FullyQualifiedName que não casa nada sai com código 0.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `api.Tests` · harmful: 0
- features: mvp-one
- evidence: checks.md C164 (api.Tests)
- last seen: 2026-11-02T15:26:00Z

### L-003 - Antes de entregar, liste todo Problemas.Invalido e todo 400/413/415 das rotas e ligue cada um a uma asserção; a lista tirada do código acha recusas que a lista tirada do plano esquece.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/rotas` · harmful: 0
- features: mvp-one
- evidence: verification.md rodadas 2 e 3, Test policy linha 3 (api/rotas)
- last seen: 2026-11-02T15:26:00Z

### L-004 - Varra também os canais de erro próprios (ErrosCsv, erros do comando de carga) e não só Problemas.Invalido; cada motivo deles precisa de um caso no teste.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api` · harmful: 0
- features: mvp-one
- evidence: verification.md rodada 4, AdminRotas.cs:272-295 (api)
- last seen: 2026-11-02T15:55:35Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
