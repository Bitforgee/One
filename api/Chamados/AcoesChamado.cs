using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Chamados;

public record ResolverIn(string? Texto);
public record RejeitarIn(string? Motivo);
public record CancelarIn(string? Motivo);
public record EncaminharIn(long? SetorId, string? Motivo);
public record ReclassificarIn(long? CategoriaId);
public record DuplicadoIn(string? NumeroOriginal);

// As ações sobre o chamado passam todas pelo AgirNoChamado; aqui ficam as rotas e o que mais de uma ação usa.
public static class AcoesChamado
{
    public static void Mapear(RouteGroupBuilder api)
    {
        ResponderChamado.Mapear(api);
        AssumirChamado.Mapear(api);
        ResolverChamado.Mapear(api);
        ConfirmarChamado.Mapear(api);
        RejeitarChamado.Mapear(api);
        CancelarChamado.Mapear(api);
        EncaminharChamado.Mapear(api);
        ReclassificarChamado.Mapear(api);
        // AC 148 e 149: só outro chamado do mesmo aluno; o duplicado sai dos indicadores
        MarcarDuplicado.Mapear(api);
    }

    public static IResult? Texto(string? texto, string campo, string mensagem) =>
        string.IsNullOrWhiteSpace(texto) || texto.Length > 4000 ? Problemas.Invalido(mensagem, campo) : null;

    // Nome do responsável atual, que o domínio recebe pronto para os eventos de atribuição.
    public static async Task<string?> NomeDoResponsavel(OneDb db, Chamado c) =>
        c.ResponsavelId is { } id ? await db.Usuarios.Where(u => u.Id == id).Select(u => u.Nome).SingleAsync() : null;

    // AC 84 a 87: rejeição da resolução, pela rejeição ou pela resposta do aluno a um RESOLVIDO. Results.Empty quando aplicou.
    public static async Task<IResult> RejeitarResolucao(OneDb db, AcessoChamado a, string motivo, List<Anexo>? anexos = null)
    {
        var c = a.Chamado;
        var ativo = c.ResponsavelId is { } r && await db.Usuarios.AnyAsync(u => u.Id == r && u.Ativo);
        var recusa = c.Rejeitar(a.Usuario.Id, motivo, anexos ?? [], ativo, await NomeDoResponsavel(db, c), a.Prazos.RejeicaoDias, a.Agora);
        return recusa is null ? Results.Empty : Problemas.Erro(409, recusa.Motivo);
    }
}
