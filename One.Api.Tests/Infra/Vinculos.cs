using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Tests;

public static class Vinculos
{
    public static async Task VincularSetores(this OneDb db, long usuarioId, params long[] setores)
    {
        var u = await db.Usuarios.Include(x => x.Setores).SingleAsync(x => x.Id == usuarioId);
        u.VincularSetores(u.Setores.Select(a => a.SetorId).Concat(setores));
        await db.SaveChangesAsync();
    }

    public static async Task<Matricula> AdicionarMatricula(this OneDb db, long usuarioId, long cursoId, string numero, int semestre, string situacao = "ATIVA")
    {
        var u = await db.Usuarios.Include(x => x.Matriculas).SingleAsync(x => x.Id == usuarioId);
        var m = u.AdicionarMatricula(numero, cursoId, semestre, situacao);
        await db.SaveChangesAsync();
        return m;
    }
}
