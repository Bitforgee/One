using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record CriarCategoria(CriarCategoria.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Nome, bool? Ativa);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/categorias", (CriarCategoria.Entrada i, IMediator m) => m.Send(new CriarCategoria(i)));

    public static void Aplicar(Categoria c, string? nome, bool? ativa) { c.Nome = nome!; c.Ativa = ativa ?? true; }

    public static async Task<IResult?> Validar(OneDb db, string? nome, bool? ativa, Categoria? atual)
    {
        if (!AdminRotas.Nome(nome)) return Problemas.Invalido("Informe o nome da categoria.", "nome");
        if (atual is { Padrao: true } && (nome != atual.Nome || ativa == false))
            return Problemas.Invalido("A categoria \"Não classificado\" não pode ser renomeada nem desativada.", "nome");
        return await db.Categorias.AnyAsync(c => c.Nome == nome && c.Id != (atual == null ? 0 : atual.Id)) ? AdminRotas.Repetido("Já existe uma categoria com este nome.") : null;
    }
}

public sealed class CriarCategoriaHandler(OneDb db) : IRequestHandler<CriarCategoria, IResult>
{
    public async ValueTask<IResult> Handle(CriarCategoria m, CancellationToken ct)
    {
        var e = m.Corpo;
        return await CadastroRotas.Criar<Categoria, CategoriaResposta>(db, "/categorias", a => CriarCategoria.Validar(db, e.Nome, e.Ativa, a), s => CriarCategoria.Aplicar(s, e.Nome, e.Ativa), CategoriaResposta.De);
    }
}
