using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

public record SetorIn(string? Nome, bool? Triagem, bool? Ativo);
public record CategoriaIn(string? Nome, bool? Ativa);
public record CursoIn(string? Nome, long? SetorCoordenacaoId);
public record RespostaProntaIn(long? SetorId, string? Titulo, string? Texto);

// Cadastros simples da instituição: GET lista, POST cria, PUT {id} altera; validar devolve 400/409 ou null.
public static class CadastroRotas
{
    public static void Mapear(RouteGroupBuilder admin)
    {
        Cadastro<Setor, SetorIn>(admin, "/setores",
            s => new { id = s.Id, nome = s.Nome, triagem = s.Triagem, ativo = s.Ativo },
            ValidarSetor,
            (s, i) => { s.Nome = i.Nome!; s.Triagem = i.Triagem == true; s.Ativo = i.Ativo ?? true; });

        Cadastro<Categoria, CategoriaIn>(admin, "/categorias",
            c => new { id = c.Id, nome = c.Nome, ativa = c.Ativa, padrao = c.Padrao },
            ValidarCategoria,
            (c, i) => { c.Nome = i.Nome!; c.Ativa = i.Ativa ?? true; });

        Cadastro<Curso, CursoIn>(admin, "/cursos",
            c => new { id = c.Id, nome = c.Nome, setorCoordenacaoId = c.SetorCoordenacaoId },
            ValidarCurso,
            (c, i) => { c.Nome = i.Nome!; c.SetorCoordenacaoId = i.SetorCoordenacaoId; });

        Cadastro<RespostaPronta, RespostaProntaIn>(admin, "/respostas-prontas",
            r => new { id = r.Id, setorId = r.SetorId, titulo = r.Titulo, texto = r.Texto },
            ValidarRespostaPronta,
            (r, i) => { r.SetorId = i.SetorId!.Value; r.Titulo = i.Titulo!; r.Texto = i.Texto!; });
    }

    static void Cadastro<T, TIn>(RouteGroupBuilder admin, string rota, Func<T, object> saida, Func<OneDb, TIn, T?, Task<IResult?>> validar, Action<T, TIn> aplicar)
        where T : class, IDaInstituicao, new()
    {
        admin.MapGet(rota, async (OneDb db) =>
            Results.Ok((await db.Set<T>().OrderBy(e => EF.Property<long>(e, "Id")).ToListAsync()).Select(saida)));

        admin.MapPost(rota, async (TIn i, OneDb db) =>
        {
            if (await validar(db, i, null) is { } erro) return erro;
            var novo = new T();
            aplicar(novo, i);
            db.Set<T>().Add(novo);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin{rota}/{db.Entry(novo).Property<long>("Id").CurrentValue}", saida(novo));
        });

        admin.MapPut(rota + "/{id:long}", async (long id, TIn i, OneDb db) =>
        {
            var atual = await db.Set<T>().FirstOrDefaultAsync(e => EF.Property<long>(e, "Id") == id);
            if (atual is null) return AdminRotas.NaoEncontrado();
            if (await validar(db, i, atual) is { } erro) return erro;
            aplicar(atual, i);
            await db.SaveChangesAsync();
            return Results.Ok(saida(atual));
        });
    }

    static async Task<IResult?> ValidarSetor(OneDb db, SetorIn i, Setor? atual)
    {
        if (!AdminRotas.Nome(i.Nome)) return Problemas.Invalido("Informe o nome do setor.", "nome");
        // AC 113: a instituição fica sempre com exatamente um setor de triagem
        var triagens = await db.Setores.CountAsync(s => s.Triagem && s.Id != (atual == null ? 0 : atual.Id)) + (i.Triagem == true ? 1 : 0);
        if (triagens != 1) return Problemas.Invalido("A instituição precisa de exatamente um setor de triagem.", "triagem");
        return await db.Setores.AnyAsync(s => s.Nome == i.Nome && s.Id != (atual == null ? 0 : atual.Id)) ? AdminRotas.Repetido("Já existe um setor com este nome.") : null;
    }

    static async Task<IResult?> ValidarCategoria(OneDb db, CategoriaIn i, Categoria? atual)
    {
        if (!AdminRotas.Nome(i.Nome)) return Problemas.Invalido("Informe o nome da categoria.", "nome");
        if (atual is { Padrao: true } && (i.Nome != atual.Nome || i.Ativa == false))
            return Problemas.Invalido("A categoria \"Não classificado\" não pode ser renomeada nem desativada.", "nome"); // AC 117
        return await db.Categorias.AnyAsync(c => c.Nome == i.Nome && c.Id != (atual == null ? 0 : atual.Id)) ? AdminRotas.Repetido("Já existe uma categoria com este nome.") : null;
    }

    static async Task<IResult?> ValidarCurso(OneDb db, CursoIn i, Curso? atual)
    {
        if (!AdminRotas.Nome(i.Nome, 200)) return Problemas.Invalido("Informe o nome do curso.", "nome");
        if (i.SetorCoordenacaoId is { } s && !await db.Setores.AnyAsync(x => x.Id == s)) return Problemas.Invalido("Setor de coordenação inexistente.", "setorCoordenacaoId");
        return await db.Cursos.AnyAsync(c => c.Nome == i.Nome && c.Id != (atual == null ? 0 : atual.Id)) ? AdminRotas.Repetido("Já existe um curso com este nome.") : null;
    }

    static async Task<IResult?> ValidarRespostaPronta(OneDb db, RespostaProntaIn i, RespostaPronta? atual)
    {
        if (!await db.Setores.AnyAsync(s => s.Id == i.SetorId)) return Problemas.Invalido("Setor inexistente.", "setorId");
        if (!AdminRotas.Nome(i.Titulo, 200)) return Problemas.Invalido("Informe o título.", "titulo");
        if (string.IsNullOrWhiteSpace(i.Texto) || i.Texto.Length > 4000) return Problemas.Invalido("O texto deve ter de 1 a 4000 caracteres.", "texto");
        return await db.RespostasProntas.AnyAsync(r => r.SetorId == i.SetorId && r.Titulo == i.Titulo && r.Id != (atual == null ? 0 : atual.Id)) ? AdminRotas.Repetido("Já existe uma resposta pronta com este título no setor.") : null;
    }
}
