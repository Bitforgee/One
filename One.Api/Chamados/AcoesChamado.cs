using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Chamados;

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
        MarcarDuplicado.Mapear(api);
        SubirChamado.Mapear(api);
    }

    public static IResult? Texto(string? texto, string campo, string mensagem) =>
        string.IsNullOrWhiteSpace(texto) || texto.Length > 4000 ? Problemas.Invalido(mensagem, campo) : null;

    public static async Task<string?> NomeDoResponsavel(OneDb db, Chamado c) =>
        c.ResponsavelId is { } id ? await db.Usuarios.Where(u => u.Id == id).Select(u => u.Nome).SingleAsync() : null;

    public static async Task<IResult> RejeitarResolucao(OneDb db, AcessoChamado a, string motivo, List<Anexo>? anexos = null)
    {
        var c = a.Chamado;
        var ativo = c.ResponsavelId is { } r && await db.Usuarios.AnyAsync(u => u.Id == r && u.Ativo);
        var recusa = c.Rejeitar(a.Usuario.Id, motivo, anexos ?? [], ativo, await NomeDoResponsavel(db, c), a.Prazos.RejeicaoDias, a.Agora);
        return recusa is null ? Results.Empty : Problemas.Erro(409, recusa.Motivo);
    }
}
