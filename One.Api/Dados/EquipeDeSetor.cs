using Microsoft.EntityFrameworkCore;

namespace One.Api.Dados;

public static class EquipeDeSetor
{
    public static async Task<bool> SoLideranca(this OneDb db, Usuario u)
    {
        if (u.Tem(Papeis.Administrador)) return false;
        var setores = db.AtendenteSetores.Where(a => a.UsuarioId == u.Id).Join(db.Setores, a => a.SetorId, s => s.Id, (a, s) => s);
        return await setores.AnyAsync(s => s.CursoId != null) && !await setores.AnyAsync(s => s.CursoId == null && s.Ativo);
    }
}
