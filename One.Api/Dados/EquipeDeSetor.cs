using Microsoft.EntityFrameworkCore;

namespace One.Api.Dados;

public static class EquipeDeSetor
{
    // O líder de turma ganha o papel ATENDENTE só para ver a fila da turma (base-fluxos, F1): quem tem setor e só tem lideranças
    // não lê o que é da equipe (versões de artigo e documento, indicadores). O administrador e o atendente sem setor seguem como antes.
    public static async Task<bool> SoLideranca(this OneDb db, Usuario u)
    {
        if (u.Tem(Papeis.Administrador)) return false;
        var meus = db.AtendenteSetores.Where(a => a.UsuarioId == u.Id);
        return await meus.AnyAsync() && !await meus.AnyAsync(a => db.Setores.Any(s => s.Id == a.SetorId && s.CursoId == null));
    }
}
