using Microsoft.EntityFrameworkCore;
using One.Api.Assistente;
using One.Api.Dados;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Indicadores;

// S11: os 14 indicadores do Quadro 12 (conteudo.md), com as definições da seção I das regras de negócio.
public static class IndicadorRotas
{
    record ChamadoLido(long Id, DateTime CriadoEm, string Estado, string? MotivoFechamento, int Reaberturas, int Encaminhamentos, long CategoriaOriginalId, long SetorId, long SolicitanteId);

    static double? Taxa(int parte, int todo) => todo == 0 ? null : Math.Round((double)parte / todo, 4);
    static double? Media(IEnumerable<TimeSpan> tempos) => tempos.Any() ? Math.Round(tempos.Average(t => t.TotalHours), 2) : null;

    public static void Mapear(RouteGroupBuilder api)
    {
        api.MapGet("/indicadores", async (DateOnly? de, DateOnly? ate, long? setorId, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        {
            var u = ctx.Usuario();
            if (!u.Tem(Papeis.Administrador) && !u.Tem(Papeis.Atendente)) return Problemas.Erro(403, "Os indicadores são para administradores e atendentes.");
            if (de is null || ate is null) return Problemas.Invalido("Informe o período (de e ate).", "de");
            if (de > ate) return Problemas.Invalido("A data inicial deve ser anterior ou igual à final.", "de");

            // AC 134: o atendente vê só os setores dele; o administrador, a instituição ou o setor pedido.
            List<long>? setores = null;
            if (!u.Tem(Papeis.Administrador))
            {
                var meus = await db.AtendenteSetores.Where(a => a.UsuarioId == u.Id).Select(a => a.SetorId).ToListAsync();
                if (setorId is not null && !meus.Contains(setorId.Value)) return Problemas.Erro(403, "Este setor não é seu.");
                setores = setorId is null ? meus : [setorId.Value];
            }
            else if (setorId is not null)
            {
                if (!await db.Setores.AnyAsync(s => s.Id == setorId)) return Problemas.Invalido("Setor inexistente.", "setorId");
                setores = [setorId.Value];
            }

            // AC 9: o período são dias inteiros no fuso da instituição
            var fuso = TimeZoneInfo.FindSystemTimeZoneById(ctx.Instituicao().Fuso);
            var inicio = TimeZoneInfo.ConvertTimeToUtc(de.Value.ToDateTime(TimeOnly.MinValue), fuso);
            var fim = TimeZoneInfo.ConvertTimeToUtc(ate.Value.AddDays(1).ToDateTime(TimeOnly.MinValue), fuso);
            bool NoPeriodo(DateTime t) => t >= inicio && t < fim;

            // shortcut: calcula em memória sobre os chamados do escopo; com milhares de chamados por instituição, agregar em SQL
            // AC 148: chamado duplicado não conta
            var todos = await db.Chamados.Where(c => c.MotivoFechamento != "DUPLICADO" || c.MotivoFechamento == null).Select(c => new ChamadoLido(c.Id, c.CriadoEm, c.Estado, c.MotivoFechamento, c.Reaberturas, c.Encaminhamentos, c.CategoriaOriginalId, c.SetorId, c.SolicitanteId)).ToListAsync();
            var eventos = (await db.EventosChamado.Where(e => e.Tipo == "TRANSICAO" || e.Tipo == "ENCAMINHAMENTO").OrderBy(e => e.CriadoEm).ThenBy(e => e.Id).ToListAsync())
                .ToLookup(e => e.ChamadoId);
            if (setores is not null)
            {
                // "estão ou estiveram": o setor atual ou o de origem de algum encaminhamento (o evento guarda o nome do setor)
                var nomes = await db.Setores.Where(s => setores.Contains(s.Id)).Select(s => s.Nome).ToListAsync();
                todos = todos.Where(c => setores.Contains(c.SetorId) || eventos[c.Id].Any(e => e.Tipo == "ENCAMINHAMENTO" && nomes.Contains(e.De!))).ToList();
            }
            var ids = todos.Select(c => c.Id).ToList();
            var primeiraResposta = (await db.MensagensChamado.Where(m => ids.Contains(m.ChamadoId) && m.Tipo == "PUBLICA")
                    .Select(m => new { m.ChamadoId, m.AutorId, m.CriadaEm }).ToListAsync())
                .Where(m => m.AutorId != todos.First(c => c.Id == m.ChamadoId).SolicitanteId)
                .GroupBy(m => m.ChamadoId).ToDictionary(g => g.Key, g => g.Min(m => m.CriadaEm));

            IEnumerable<EventoChamado> Resolucoes(long id) => eventos[id].Where(e => e.Tipo == "TRANSICAO" && e.Para == Resolvido);
            var criados = todos.Where(c => NoPeriodo(c.CriadoEm)).ToList();
            var resolvidos = todos.Where(c => Resolucoes(c.Id).Any(e => NoPeriodo(e.CriadoEm))).ToList();

            // AC 133: da criação à última resolução, sem o tempo em AGUARDANDO_ALUNO
            TimeSpan Resolucao(ChamadoLido c)
            {
                var fimResolucao = Resolucoes(c.Id).Last().CriadoEm;
                var aguardando = TimeSpan.Zero;
                DateTime? desde = null;
                foreach (var e in eventos[c.Id].Where(e => e.Tipo == "TRANSICAO" && e.CriadoEm <= fimResolucao))
                {
                    if (e.Para == AguardandoAluno) desde = e.CriadoEm;
                    else if (e.De == AguardandoAluno && desde is not null) { aguardando += e.CriadoEm - desde.Value; desde = null; }
                }
                return fimResolucao - c.CriadoEm - aguardando;
            }

            var categorias = await db.Categorias.ToDictionaryAsync(c => c.Id, c => c.Nome);
            object Ranking(IEnumerable<long> categoriaIds) => categoriaIds.GroupBy(x => x).OrderByDescending(g => g.Count()).ThenBy(g => categorias[g.Key])
                .Take(5).Select(g => new { categoria = categorias[g.Key], total = g.Count() });

            // Conversas não pertencem a setor: com escopo de setor os indicadores de conversa ficam vazios.
            var conversas = setores is not null ? [] : await db.Conversas.Where(c => c.CriadaEm >= inicio && c.CriadaEm < fim)
                .Select(c => new { c.AlunoId, c.Desfecho, SemBase = db.MensagensConversa.Any(m => m.ConversaId == c.Id && m.TipoFinal == Tipos.SemBase) })
                .ToListAsync();
            var categoriasDasConversas = setores is not null ? [] : await (
                from ci in db.Citacoes
                join m in db.MensagensConversa on ci.MensagemConversaId equals m.Id
                join c in db.Conversas on m.ConversaId equals c.Id
                where c.CriadaEm >= inicio && c.CriadaEm < fim
                select new
                {
                    c.Id,
                    CategoriaId = ci.TrechoFonteId != null
                        ? db.TrechosFonte.Where(t => t.Id == ci.TrechoFonteId)
                            .Select(t => t.VersaoArtigoId != null ? t.VersaoArtigo!.Artigo!.CategoriaId : t.VersaoDocumento!.Documento!.CategoriaId).First()
                        : db.VersoesArtigo.Where(v => v.Id == ci.VersaoArtigoId).Select(v => v.Artigo!.CategoriaId).First(),
                }).Distinct().ToListAsync();
            var comDesfecho = conversas.Count(c => c.Desfecho != null);
            int Desfecho(string d) => conversas.Count(c => c.Desfecho == d);
            var confirmadosSemReabertura = criados.Count(c => c.Estado == Fechado && c.MotivoFechamento is "CONFIRMADO" or "FECHADO_AUTOMATICAMENTE" && c.Reaberturas == 0);
            var semDados = conversas.Count == 0 && criados.Count == 0 && resolvidos.Count == 0;
            var porConversa = setores is null;

            return Results.Ok(new
            {
                de = de.Value,
                ate = ate.Value,
                setorId,
                semDados,
                alunosAtivos = porConversa ? conversas.Select(c => c.AlunoId).Distinct().Count() : (int?)null,
                conversas = porConversa ? conversas.Count : (int?)null,
                taxaAutoatendimento = Taxa(Desfecho(Desfechos.Resolvida), comDesfecho),
                taxaEscalonamento = Taxa(Desfecho(Desfechos.Transferida), comDesfecho),
                taxaAbandono = Taxa(Desfecho(Desfechos.Abandonada), comDesfecho),
                taxaPerguntasSemArtigo = Taxa(conversas.Count(c => c.SemBase), conversas.Count),
                chamadosAbertos = todos.Count(c => c.Estado != Fechado),
                chamadosResolvidos = resolvidos.Count,
                tempoPrimeiraRespostaHoras = Media(criados.Where(c => primeiraResposta.ContainsKey(c.Id)).Select(c => primeiraResposta[c.Id] - c.CriadoEm)),
                tempoResolucaoHoras = Media(criados.Where(c => Resolucoes(c.Id).Any()).Select(Resolucao)),
                roteamentoCorreto = Taxa(resolvidos.Count(c => c.Encaminhamentos == 0), resolvidos.Count),
                taxaReabertura = Taxa(resolvidos.Count(c => c.Reaberturas >= 1), resolvidos.Count),
                principaisCategorias = new
                {
                    porConversas = porConversa ? Ranking(categoriasDasConversas.Select(x => x.CategoriaId)) : null,
                    porChamados = Ranking(criados.Select(c => c.CategoriaOriginalId)),
                },
                indicadorPrincipal = Taxa(Desfecho(Desfechos.Resolvida) + confirmadosSemReabertura, comDesfecho),
            });
        });
    }
}
