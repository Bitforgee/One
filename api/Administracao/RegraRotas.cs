using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

public record RegraIn(long? CategoriaId, string? Destino, long? SetorId);

// AC 114: uma regra por categoria; salvar de novo substitui a anterior.
public static class RegraRotas
{
    public static void Mapear(RouteGroupBuilder admin)
    {
        admin.MapGet("/regras", Listar);
        admin.MapPost("/regras", Salvar);
        admin.MapPut("/regras/{id:long}", Alterar);
    }

    static object Saida(RegraRoteamento r) => new { id = r.Id, categoriaId = r.CategoriaId, destino = r.Destino, setorId = r.SetorId };

    static async Task<IResult?> Validar(OneDb db, RegraIn i)
    {
        if (!await db.Categorias.AnyAsync(c => c.Id == i.CategoriaId && !c.Padrao)) return Problemas.Invalido("Escolha uma categoria que não seja \"Não classificado\".", "categoriaId");
        if (i.Destino is not ("SETOR" or "COORDENACAO_CURSO")) return Problemas.Invalido("O destino deve ser SETOR ou COORDENACAO_CURSO.", "destino");
        if (i.Destino == "SETOR" && !await db.Setores.AnyAsync(s => s.Id == i.SetorId)) return Problemas.Invalido("Informe o setor de destino.", "setorId"); // AC 115
        return null;
    }

    static void Aplicar(RegraRoteamento r, RegraIn i)
    {
        r.CategoriaId = i.CategoriaId!.Value;
        r.Destino = i.Destino!;
        r.SetorId = i.Destino == "SETOR" ? i.SetorId : null;
    }

    static async Task<IResult> Listar(OneDb db) => Results.Ok((await db.Regras.OrderBy(r => r.Id).ToListAsync()).Select(Saida));

    static async Task<IResult> Salvar(RegraIn i, OneDb db)
    {
        if (await Validar(db, i) is { } erro) return erro;
        var regra = await db.Regras.FirstOrDefaultAsync(r => r.CategoriaId == i.CategoriaId);
        var nova = regra is null;
        regra ??= db.Regras.Add(new RegraRoteamento()).Entity;
        Aplicar(regra, i);
        await db.SaveChangesAsync();
        return nova ? Results.Created($"/api/admin/regras/{regra.Id}", Saida(regra)) : Results.Ok(Saida(regra));
    }

    static async Task<IResult> Alterar(long id, RegraIn i, OneDb db)
    {
        var regra = await db.Regras.FirstOrDefaultAsync(r => r.Id == id);
        if (regra is null) return AdminRotas.NaoEncontrado();
        if (await Validar(db, i) is { } erro) return erro;
        if (await db.Regras.AnyAsync(r => r.CategoriaId == i.CategoriaId && r.Id != id)) return AdminRotas.Repetido("Esta categoria já tem uma regra.");
        Aplicar(regra, i);
        await db.SaveChangesAsync();
        return Results.Ok(Saida(regra));
    }
}
