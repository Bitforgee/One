using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao.Shared;

public sealed record UsuarioResposta(long Id, string Cpf, string Nome, string Email, bool Ativo, bool DeveTrocarSenha, IReadOnlyList<string> Papeis, IReadOnlyList<long> Setores)
{
    public static async Task<UsuarioResposta> De(OneDb db, Usuario u) =>
        new(u.Id, u.Cpf.Valor, u.Nome, u.Email, u.Ativo, u.DeveTrocarSenha, [.. u.Papeis.Select(p => p.Papel)],
            await db.AtendenteSetores.Where(a => a.UsuarioId == u.Id).Select(a => a.SetorId).ToListAsync());
}
