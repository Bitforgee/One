using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol;
using One.Api.Dados;

namespace One.Api.Mcp;

public static class ContextoMcp
{
    const string DoUsuario = "sub";
    const string DaInstituicao = "instituicao_id";

    public static ClaimsPrincipal Principal(Usuario usuario, Instituicao instituicao, string esquema) =>
        new(new ClaimsIdentity([new Claim(DoUsuario, usuario.Id.ToString()), new Claim(DaInstituicao, instituicao.Id.ToString())], esquema));

    public static async Task<(Usuario, Instituicao)> Carregar(OneDb db, ClaimsPrincipal? principal)
    {
        if (!long.TryParse(principal?.FindFirstValue(DoUsuario), out var usuarioId) || !long.TryParse(principal.FindFirstValue(DaInstituicao), out var instituicaoId))
            throw new McpException("Não autenticado.");
        db.InstituicaoAtual = instituicaoId;
        var usuario = await db.Usuarios.Include(u => u.Papeis).FirstAsync(u => u.Id == usuarioId);
        return (usuario, await db.Instituicoes.FirstAsync(i => i.Id == instituicaoId));
    }
}
