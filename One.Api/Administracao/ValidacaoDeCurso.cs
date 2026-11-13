using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

public static class ValidacaoDeCurso
{
    public static async Task<IResult?> Coordenacao(OneDb db, long? setorCoordenacaoId)
    {
        if (setorCoordenacaoId is not { } id) return null;
        if (await db.Setores.AnyAsync(x => x.Id == id && x.CursoId != null)) return Problemas.Invalido("Uma liderança de semestre não pode ser a coordenação de um curso.", "setorCoordenacaoId");
        return await db.Setores.AnyAsync(x => x.Id == id) ? null : Problemas.Invalido("Setor de coordenação inexistente.", "setorCoordenacaoId");
    }
}
