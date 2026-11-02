using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

public record RegraIn(long? CategoriaId, string? Destino, long? SetorId);

// AC 114: uma regra por categoria; salvar de novo substitui a anterior.
public static class RegraRotas
{
    public static void Mapear(RouteGroupBuilder admin)
    {
        ListarRegras.Mapear(admin);
        SalvarRegra.Mapear(admin);
        AlterarRegra.Mapear(admin);
    }

    public static object Saida(RegraRoteamento r) => new { id = r.Id, categoriaId = r.CategoriaId, destino = r.Destino, setorId = r.SetorId };

    public static async Task<IResult?> Validar(OneDb db, RegraIn i)
    {
        if (!await db.Categorias.AnyAsync(c => c.Id == i.CategoriaId && !c.Padrao)) return Problemas.Invalido("Escolha uma categoria que não seja \"Não classificado\".", "categoriaId");
        if (i.Destino is not ("SETOR" or "COORDENACAO_CURSO")) return Problemas.Invalido("O destino deve ser SETOR ou COORDENACAO_CURSO.", "destino");
        if (i.Destino == "SETOR" && !await db.Setores.AnyAsync(s => s.Id == i.SetorId)) return Problemas.Invalido("Informe o setor de destino.", "setorId"); // AC 115
        return null;
    }

    public static void Aplicar(RegraRoteamento r, RegraIn i)
    {
        r.CategoriaId = i.CategoriaId!.Value;
        r.Destino = i.Destino!;
        r.SetorId = i.Destino == "SETOR" ? i.SetorId : null;
    }
}
