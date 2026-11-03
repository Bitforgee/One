using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

// Cadastros simples da instituição: GET lista, POST cria, PUT {id} altera; validar devolve 400/409 ou null.
// Cada cadastro tem 3 casos de uso; a projeção, a validação e a aplicação ficam no arquivo do Criar dele.
public static class CadastroRotas
{
    public static void Mapear(RouteGroupBuilder admin)
    {
        ListarSetores.Mapear(admin);
        CriarSetor.Mapear(admin);
        AlterarSetor.Mapear(admin);

        ListarCategorias.Mapear(admin);
        CriarCategoria.Mapear(admin);
        AlterarCategoria.Mapear(admin);

        ListarCursos.Mapear(admin);
        CriarCurso.Mapear(admin);
        AlterarCurso.Mapear(admin);

        ListarRespostasProntas.Mapear(admin);
        CriarRespostaPronta.Mapear(admin);
        AlterarRespostaPronta.Mapear(admin);
    }

    public static async Task<IResult> Listar<T, TOut>(OneDb db, Func<T, TOut> saida) where T : class =>
        Results.Ok((await db.Set<T>().OrderBy(e => EF.Property<long>(e, "Id")).ToListAsync()).Select(saida));

    // validar e aplicar fecham sobre os campos do Entrada do caso de uso; aqui só o roteiro comum.
    public static async Task<IResult> Criar<T, TOut>(OneDb db, string rota, Func<T?, Task<IResult?>> validar, Action<T> aplicar, Func<T, TOut> saida)
        where T : class, IDaInstituicao, new()
    {
        if (await validar(null) is { } erro) return erro;
        var novo = new T();
        aplicar(novo);
        db.Set<T>().Add(novo);
        await db.SaveChangesAsync();
        return Results.Created($"/api/admin{rota}/{db.Entry(novo).Property<long>("Id").CurrentValue}", saida(novo));
    }

    public static async Task<IResult> Alterar<T, TOut>(OneDb db, long id, Func<T?, Task<IResult?>> validar, Action<T> aplicar, Func<T, TOut> saida)
        where T : class, IDaInstituicao, new()
    {
        var atual = await db.Set<T>().FirstOrDefaultAsync(e => EF.Property<long>(e, "Id") == id);
        if (atual is null) return AdminRotas.NaoEncontrado();
        if (await validar(atual) is { } erro) return erro;
        aplicar(atual);
        await db.SaveChangesAsync();
        return Results.Ok(saida(atual));
    }
}
