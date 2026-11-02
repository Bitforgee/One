using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

// A projeção, a validação e a aplicação do cadastro de Categoria; ListarCategorias e AlterarCategoria usam as daqui.
public sealed record CriarCategoria(CategoriaIn Corpo) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/categorias", (CategoriaIn i, IMediator m) => m.Send(new CriarCategoria(i)));

    public static object Saida(Categoria c) => new { id = c.Id, nome = c.Nome, ativa = c.Ativa, padrao = c.Padrao };

    public static void Aplicar(Categoria c, CategoriaIn i) { c.Nome = i.Nome!; c.Ativa = i.Ativa ?? true; }

    public static async Task<IResult?> Validar(OneDb db, CategoriaIn i, Categoria? atual)
    {
        if (!AdminRotas.Nome(i.Nome)) return Problemas.Invalido("Informe o nome da categoria.", "nome");
        if (atual is { Padrao: true } && (i.Nome != atual.Nome || i.Ativa == false))
            return Problemas.Invalido("A categoria \"Não classificado\" não pode ser renomeada nem desativada.", "nome"); // AC 117
        return await db.Categorias.AnyAsync(c => c.Nome == i.Nome && c.Id != (atual == null ? 0 : atual.Id)) ? AdminRotas.Repetido("Já existe uma categoria com este nome.") : null;
    }
}

public sealed class CriarCategoriaHandler(OneDb db) : IRequestHandler<CriarCategoria, IResult>
{
    public async ValueTask<IResult> Handle(CriarCategoria m, CancellationToken ct) =>
        await CadastroRotas.Criar<Categoria, CategoriaIn>(db, "/categorias", m.Corpo, CriarCategoria.Saida, CriarCategoria.Validar, CriarCategoria.Aplicar);
}
