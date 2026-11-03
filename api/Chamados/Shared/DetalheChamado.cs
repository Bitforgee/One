using Microsoft.EntityFrameworkCore;
using One.Api.Conhecimento;
using One.Api.Dados;

namespace One.Api.Chamados.Shared;

// AC 73 a 75: o detalhe do chamado; o aluno não recebe resumo, notas, eventos nem as fontes do assistente.
// Usado por VerChamado e pelas 9 ações (que o devolvem pelo AgirNoChamado).
public sealed record DetalheChamado(
    string Numero, string Titulo, string Estado, string? MotivoFechamento, string? NumeroOriginal, long SetorId, string Setor, string Categoria,
    string? Responsavel, DateTime CriadoEm, DateTime? ResolvidoEm, DetalheChamado.DaMatricula Matricula, string? Solicitante, string? Resumo,
    string? OrigemCategoria, IReadOnlyList<object> Transcricao, IReadOnlyList<DetalheChamado.DaMensagem> Mensagens,
    IReadOnlyList<DetalheChamado.DoEvento>? Eventos, IEnumerable<string> Acoes, IReadOnlyList<DetalheChamado.Destino>? Setores,
    IReadOnlyList<DetalheChamado.Destino>? Categorias)
{
    public sealed record DaMatricula(string Numero, string Curso, int Semestre);

    // Item da transcrição: a equipe vê as fontes (a chave sai nula sem citação); o aluno não recebe a chave.
    public sealed record TranscricaoDaEquipe(string Autor, string Texto, DateTime CriadaEm, IEnumerable<Fontes.FonteCitada>? Fontes);

    public sealed record TranscricaoDoAluno(string Autor, string Texto, DateTime CriadaEm);

    public sealed record DaMensagem(long Id, string Tipo, string Texto, string Autor, bool DoAluno, DateTime CriadaEm, IReadOnlyList<DoAnexo> Anexos);

    public sealed record DoAnexo(long Id, string Nome, string Tipo, long Tamanho);

    public sealed record DoEvento(string Tipo, string Ator, string? De, string? Para, string? Detalhe, DateTime CriadoEm);

    public sealed record Destino(long Id, string Nome);

    // O que só a equipe vê; para o aluno tudo nulo e sem fontes.
    record DaEquipe(string? Solicitante, string? Resumo, string? OrigemCategoria, Dictionary<long, IEnumerable<Fontes.FonteCitada>> Fontes,
        IReadOnlyList<DoEvento>? Eventos, IReadOnlyList<Destino>? Setores, IReadOnlyList<Destino>? Categorias)
    {
        public static readonly DaEquipe Nada = new(null, null, null, [], null, null, null);
    }

    record LinhaDaTranscricao(long Id, string Autor, string Texto, DateTime CriadaEm, List<CitacaoArtigo> Citacoes);

    record AnexoLido(long Id, long MensagemChamadoId, string Nome, string Tipo, long Tamanho);

    public static async Task<DetalheChamado> Montar(OneDb db, long usuarioId, Chamado c, string papel)
    {
        var equipe = papel == PermissoesChamado.Atendente;
        var matricula = await db.Matriculas.Where(m => m.Id == c.MatriculaId).Select(m => new DaMatricula(m.Numero, m.Curso!.Nome, c.Semestre)).SingleAsync();
        var nomes = await db.Usuarios.Where(x => x.Id == c.SolicitanteId || x.Id == c.ResponsavelId
                || db.MensagensChamado.Any(m => m.ChamadoId == c.Id && m.AutorId == x.Id) || db.EventosChamado.Any(e => e.ChamadoId == c.Id && e.AtorId == x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Nome);
        var transcricao = await db.MensagensConversa.Where(m => m.ConversaId == c.ConversaId).OrderBy(m => m.Id)
            .Select(m => new LinhaDaTranscricao(m.Id, m.Autor, m.Texto, m.CriadaEm, m.Citacoes)).ToListAsync();
        var daEquipe = equipe ? await Equipe(db, c, nomes, transcricao) : DaEquipe.Nada;

        return new DetalheChamado(
            c.Numero, c.Titulo, c.Estado, c.MotivoFechamento, c.NumeroOriginal, c.SetorId,
            await db.Setores.Where(s => s.Id == c.SetorId).Select(s => s.Nome).SingleAsync(),
            await db.Categorias.Where(x => x.Id == c.CategoriaId).Select(x => x.Nome).SingleAsync(),
            c.ResponsavelId is { } r ? nomes[r] : null, c.CriadoEm, c.ResolvidoEm, matricula,
            daEquipe.Solicitante, daEquipe.Resumo, daEquipe.OrigemCategoria,
            [.. transcricao.Select(m => equipe
                ? (object)new TranscricaoDaEquipe(m.Autor, m.Texto, m.CriadaEm, daEquipe.Fontes.GetValueOrDefault(m.Id))
                : new TranscricaoDoAluno(m.Autor, m.Texto, m.CriadaEm))],
            await DasMensagens(db, c, equipe, nomes), daEquipe.Eventos, PermissoesChamado.Acoes(c.Estado, papel, c.ResponsavelId, usuarioId),
            // destinos de encaminhar e reclassificar (S6), só para a equipe
            daEquipe.Setores, daEquipe.Categorias);
    }

    // Mensagens do chamado com os anexos; o aluno só vê as públicas.
    static async Task<IReadOnlyList<DaMensagem>> DasMensagens(OneDb db, Chamado c, bool equipe, Dictionary<long, string> nomes)
    {
        var mensagens = await db.MensagensChamado.Where(m => m.ChamadoId == c.Id && (equipe || m.Tipo == TiposMensagem.Publica)).OrderBy(m => m.Id).ToListAsync();
        var ids = mensagens.Select(m => m.Id).ToList();
        var anexos = (await db.Anexos.Where(x => ids.Contains(x.MensagemChamadoId)).OrderBy(x => x.Id)
            .Select(x => new AnexoLido(x.Id, x.MensagemChamadoId, x.Nome, x.Tipo, x.Tamanho)).ToListAsync()).ToLookup(x => x.MensagemChamadoId);
        return [.. mensagens.Select(m => new DaMensagem(m.Id, m.Tipo, m.Texto, m.AutorId is { } a ? nomes[a] : "Sistema", m.AutorId == c.SolicitanteId, m.CriadaEm,
            [.. anexos[m.Id].Select(x => new DoAnexo(x.Id, x.Nome, x.Tipo, x.Tamanho))]))];
    }

    static async Task<DaEquipe> Equipe(OneDb db, Chamado c, Dictionary<long, string> nomes, List<LinhaDaTranscricao> transcricao)
    {
        var fonte = await Fontes.Citadas(db, transcricao.SelectMany(m => m.Citacoes).ToList());
        var fontes = transcricao.Where(m => m.Citacoes.Count > 0).ToDictionary(m => m.Id, m => m.Citacoes.Select(fonte));
        var eventos = (await db.EventosChamado.Where(e => e.ChamadoId == c.Id).OrderBy(e => e.CriadoEm).ThenBy(e => e.Id).ToListAsync())
            .Select(e => new DoEvento(e.Tipo, e.AtorId is { } a ? nomes[a] : "Sistema", e.De, e.Para, e.Detalhe, e.CriadoEm)).ToList();
        var setores = await db.Setores.Where(s => s.Ativo && s.Id != c.SetorId).OrderBy(s => s.Nome).Select(s => new Destino(s.Id, s.Nome)).ToListAsync();
        var categorias = await db.Categorias.Where(x => x.Ativa).OrderBy(x => x.Nome).Select(x => new Destino(x.Id, x.Nome)).ToListAsync();
        return new DaEquipe(nomes[c.SolicitanteId], c.Resumo, c.OrigemCategoria, fontes, eventos, setores, categorias);
    }
}
