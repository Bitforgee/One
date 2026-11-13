using Microsoft.EntityFrameworkCore;
using One.Api.Conhecimento;
using One.Api.Dados;

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

    public static List<MensagemConversa> DoAssistente(Conversa conversa) =>
        [.. conversa.Mensagens.Where(m => m.Autor == MensagemConversa.AutorAssistente).OrderByDescending(m => m.Id)];

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
}
