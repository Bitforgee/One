using Microsoft.EntityFrameworkCore;
using One.Api.Conhecimento;
using One.Api.Dados;
using One.Api.Dados.Fluxos;

namespace One.Api.Chamados;

public static class Transferencia
{
    public const string OrigemIa = "IA";
    public const string OrigemArtigo = "ARTIGO";
    public const string OrigemPadrao = "PADRAO";

    public static async Task<Matricula?> Matricula(OneDb db, long alunoId, long? matriculaId)
    {
        var ativas = await db.Matriculas.Where(m => m.UsuarioId == alunoId && m.Situacao == "ATIVA").ToListAsync();
        return matriculaId is null
            ? (ativas.Count == 1 ? ativas[0] : null)
            : ativas.FirstOrDefault(m => m.Id == matriculaId);
    }

    public static IResult MatriculaInvalida() =>
        Problemas.Invalido("Escolha uma das suas matrículas ativas.", "matriculaId");

    static List<MensagemConversa> DoAssistente(Conversa conversa) =>
        [.. conversa.Mensagens.Where(m => m.Autor == Assistente.Assistente.Autor).OrderByDescending(m => m.Id)];

    public static async Task<(Categoria Categoria, string Origem)> EscolherCategoria(OneDb db, Conversa conversa)
    {
        var assistente = DoAssistente(conversa);
        var categoriasAtivas = await db.Categorias.Where(c => c.Ativa).ToListAsync();
        var sugerida = assistente.Select(m => m.CategoriaIdSugerida).FirstOrDefault(id => id is not null && categoriasAtivas.Any(c => c.Id == id));
        if (sugerida is not null) return (await db.Categorias.SingleAsync(c => c.Id == sugerida), OrigemIa);
        if (assistente.FirstOrDefault(m => m.Citacoes.Count > 0) is not { } citou) return (categoriasAtivas.Single(c => c.Padrao), OrigemPadrao);
        var ultima = citou.Citacoes.OrderBy(c => c.Id).Last();
        var categoriaId = await db.CategoriasCitadas().Where(x => x.CitacaoId == ultima.Id).Select(x => x.CategoriaId).SingleAsync();
        return (await db.Categorias.SingleAsync(c => c.Id == categoriaId), OrigemArtigo);
    }

    public static async Task<Chamado> Criar(OneDb db, Instituicao instituicao, Conversa conversa, Matricula matricula, DateTime agora, bool comLideranca = true)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        if (conversa.Id == 0) await db.SaveChangesAsync();
        var (categoria, origem) = await EscolherCategoria(db, conversa);
        var titulo = Cortar(conversa.Mensagens.Where(m => m.Autor != Assistente.Assistente.Autor).OrderBy(m => m.Id).First().Texto, 120);
        var resumo = DoAssistente(conversa).Select(m => m.Resumo).FirstOrDefault(r => !string.IsNullOrWhiteSpace(r)) is { } r ? Cortar(r, 500) : null;
        var rota = await ResolverFluxo.Rotear(db, categoria, matricula, comLideranca);
        conversa.Transferir(agora);

        var numero = await db.Database
            .SqlQuery<long>($"UPDATE instituicao SET ultimo_numero_chamado = ultimo_numero_chamado + 1 WHERE id = {instituicao.Id} RETURNING ultimo_numero_chamado AS \"Value\"")
            .ToListAsync();
        var chamado = Chamado.Abrir($"ONE-{numero.Single()}", conversa.Id, conversa.AlunoId, matricula.Id, matricula.Semestre, titulo, resumo, categoria.Id, origem, rota.SetorId, agora, rota.Fluxo?.Vigente?.Id, rota.Passo?.Etapa.Ordem);
        db.Chamados.Add(chamado);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return chamado;
    }

    static string Cortar(string texto, int max) => texto.Length <= max ? texto : texto[..max];
}
