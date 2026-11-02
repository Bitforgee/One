using Microsoft.EntityFrameworkCore;
using One.Api.Conhecimento;
using One.Api.Dados;

namespace One.Api.Chamados;

// AC 73 a 75: o detalhe do chamado; o aluno não recebe resumo, notas, eventos nem as fontes do assistente.
public static class DetalheChamado
{
    // O que só a equipe vê; para o aluno tudo nulo e sem fontes.
    record DaEquipe(string? Solicitante, string? Resumo, string? OrigemCategoria, Dictionary<long, IEnumerable<Fontes.FonteCitada>> Fontes,
        object? Eventos, object? Setores, object? Categorias)
    {
        public static readonly DaEquipe Nada = new(null, null, null, [], null, null, null);
    }

    record LinhaDaTranscricao(long Id, string Autor, string Texto, DateTime CriadaEm, List<CitacaoArtigo> Citacoes);

    public static async Task<object> Montar(OneDb db, long usuarioId, Chamado c, string papel)
    {
        var equipe = papel == PermissoesChamado.Atendente;
        var matricula = await db.Matriculas.Where(m => m.Id == c.MatriculaId).Select(m => new { numero = m.Numero, curso = m.Curso!.Nome, semestre = c.Semestre }).SingleAsync();
        var nomes = await db.Usuarios.Where(x => x.Id == c.SolicitanteId || x.Id == c.ResponsavelId
                || db.MensagensChamado.Any(m => m.ChamadoId == c.Id && m.AutorId == x.Id) || db.EventosChamado.Any(e => e.ChamadoId == c.Id && e.AtorId == x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Nome);
        var transcricao = (await db.MensagensConversa.Where(m => m.ConversaId == c.ConversaId).OrderBy(m => m.Id)
            .Select(m => new { m.Id, m.Autor, m.Texto, m.CriadaEm, m.Citacoes }).ToListAsync())
            .Select(m => new LinhaDaTranscricao(m.Id, m.Autor, m.Texto, m.CriadaEm, m.Citacoes)).ToList();
        var daEquipe = equipe ? await Equipe(db, c, nomes, transcricao) : DaEquipe.Nada;

        return new
        {
            numero = c.Numero,
            titulo = c.Titulo,
            estado = c.Estado,
            motivoFechamento = c.MotivoFechamento,
            numeroOriginal = c.NumeroOriginal,
            setorId = c.SetorId,
            setor = await db.Setores.Where(s => s.Id == c.SetorId).Select(s => s.Nome).SingleAsync(),
            categoria = await db.Categorias.Where(x => x.Id == c.CategoriaId).Select(x => x.Nome).SingleAsync(),
            responsavel = c.ResponsavelId is { } r ? nomes[r] : null,
            criadoEm = c.CriadoEm,
            resolvidoEm = c.ResolvidoEm,
            matricula,
            solicitante = daEquipe.Solicitante,
            resumo = daEquipe.Resumo,
            origemCategoria = daEquipe.OrigemCategoria,
            transcricao = transcricao.Select(m => equipe
                ? new { autor = m.Autor, texto = m.Texto, criadaEm = m.CriadaEm, fontes = daEquipe.Fontes.GetValueOrDefault(m.Id) }
                : (object)new { autor = m.Autor, texto = m.Texto, criadaEm = m.CriadaEm }),
            mensagens = await Mensagens(db, c, equipe, nomes),
            eventos = daEquipe.Eventos,
            acoes = PermissoesChamado.Acoes(c.Estado, papel, c.ResponsavelId, usuarioId),
            // destinos de encaminhar e reclassificar (S6), só para a equipe
            setores = daEquipe.Setores,
            categorias = daEquipe.Categorias,
        };
    }

    // Mensagens do chamado com os anexos; o aluno só vê as públicas.
    static async Task<object> Mensagens(OneDb db, Chamado c, bool equipe, Dictionary<long, string> nomes)
    {
        var mensagens = await db.MensagensChamado.Where(m => m.ChamadoId == c.Id && (equipe || m.Tipo == TiposMensagem.Publica)).OrderBy(m => m.Id).ToListAsync();
        var ids = mensagens.Select(m => m.Id).ToList();
        var anexos = (await db.Anexos.Where(x => ids.Contains(x.MensagemChamadoId)).OrderBy(x => x.Id)
            .Select(x => new { x.Id, x.MensagemChamadoId, x.Nome, x.Tipo, x.Tamanho }).ToListAsync()).ToLookup(x => x.MensagemChamadoId);
        return mensagens.Select(m => new
        {
            id = m.Id, tipo = m.Tipo, texto = m.Texto, autor = m.AutorId is { } a ? nomes[a] : "Sistema", doAluno = m.AutorId == c.SolicitanteId, criadaEm = m.CriadaEm,
            anexos = anexos[m.Id].Select(x => new { id = x.Id, nome = x.Nome, tipo = x.Tipo, tamanho = x.Tamanho }),
        });
    }

    static async Task<DaEquipe> Equipe(OneDb db, Chamado c, Dictionary<long, string> nomes, List<LinhaDaTranscricao> transcricao)
    {
        var fonte = await Fontes.Citadas(db, transcricao.SelectMany(m => m.Citacoes).ToList());
        var fontes = transcricao.Where(m => m.Citacoes.Count > 0).ToDictionary(m => m.Id, m => m.Citacoes.Select(fonte));
        var eventos = (await db.EventosChamado.Where(e => e.ChamadoId == c.Id).OrderBy(e => e.CriadoEm).ThenBy(e => e.Id).ToListAsync())
            .Select(e => new { tipo = e.Tipo, ator = e.AtorId is { } a ? nomes[a] : "Sistema", de = e.De, para = e.Para, detalhe = e.Detalhe, criadoEm = e.CriadoEm });
        var setores = await db.Setores.Where(s => s.Ativo && s.Id != c.SetorId).OrderBy(s => s.Nome).Select(s => new { id = s.Id, nome = s.Nome }).ToListAsync();
        var categorias = await db.Categorias.Where(x => x.Ativa).OrderBy(x => x.Nome).Select(x => new { id = x.Id, nome = x.Nome }).ToListAsync();
        return new DaEquipe(nomes[c.SolicitanteId], c.Resumo, c.OrigemCategoria, fontes, eventos, setores, categorias);
    }
}
