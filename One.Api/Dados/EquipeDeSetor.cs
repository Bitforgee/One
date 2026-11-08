using Microsoft.EntityFrameworkCore;

namespace One.Api.Dados;

public static class EquipeDeSetor
{
    // O líder de turma ganha o papel ATENDENTE só para ver a fila da turma (base-fluxos, F1): quem tem setor e só tem lideranças
    // não lê o que é da equipe (versões de artigo e documento, indicadores). Um setor comum desativado não faz ninguém equipe.
    public static async Task<bool> SoLideranca(this OneDb db, Usuario u)
    {
        if (u.Tem(Papeis.Administrador)) return false;
        var setores = db.AtendenteSetores.Where(a => a.UsuarioId == u.Id).Join(db.Setores, a => a.SetorId, s => s.Id, (a, s) => s);
        return await setores.AnyAsync(s => s.CursoId != null) && !await setores.AnyAsync(s => s.CursoId == null && s.Ativo);
    }
}
