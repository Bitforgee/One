using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

public static class RegraRotas
{
    public static void Mapear(RouteGroupBuilder admin)
    {
        ListarRegras.Mapear(admin);
        SalvarRegra.Mapear(admin);
        AlterarRegra.Mapear(admin);
    }

    public static async Task<IResult?> Validar(OneDb db, long? categoriaId, string? destino, long? setorId)
    {
        if (!await db.Categorias.AnyAsync(c => c.Id == categoriaId && !c.Padrao)) return Problemas.Invalido("Escolha uma categoria que não seja \"Não classificado\".", "categoriaId");
        if (destino is not ("SETOR" or "COORDENACAO_CURSO")) return Problemas.Invalido("O destino deve ser SETOR ou COORDENACAO_CURSO.", "destino");
        if (destino == "SETOR" && !await db.Setores.AnyAsync(s => s.Id == setorId)) return Problemas.Invalido("Informe o setor de destino.", "setorId");
        return null;
    }

    public static void Aplicar(RegraRoteamento r, long? categoriaId, string? destino, long? setorId)
    {
        r.CategoriaId = categoriaId!.Value;
        r.Destino = destino!;
        r.SetorId = destino == "SETOR" ? setorId : null;
    }
}
