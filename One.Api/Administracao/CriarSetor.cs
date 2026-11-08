using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record CriarSetor(CriarSetor.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Nome, bool? Triagem, bool? Ativo);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/setores", (CriarSetor.Entrada i, IMediator m) => m.Send(new CriarSetor(i)));

    public static void Aplicar(Setor s, string? nome, bool? triagem, bool? ativo) { s.Nome = nome!; s.Triagem = triagem == true; s.Ativo = ativo ?? true; }

    public static async Task<IResult?> Validar(OneDb db, string? nome, bool? triagem, Setor? atual)
    {
        if (!AdminRotas.Nome(nome)) return Problemas.Invalido("Informe o nome do setor.", "nome");
        var triagens = await db.Setores.CountAsync(s => s.Triagem && s.Id != (atual == null ? 0 : atual.Id)) + (triagem == true ? 1 : 0);
        if (triagens != 1) return Problemas.Invalido("A instituição precisa de exatamente um setor de triagem.", "triagem");
        return await db.Setores.AnyAsync(s => s.Nome == nome && s.Id != (atual == null ? 0 : atual.Id)) ? AdminRotas.Repetido("Já existe um setor com este nome.") : null;
    }
}

public sealed class CriarSetorHandler(OneDb db) : IRequestHandler<CriarSetor, IResult>
{
    public async ValueTask<IResult> Handle(CriarSetor m, CancellationToken ct)
    {
        var e = m.Corpo;
        return await CadastroRotas.Criar<Setor, SetorResposta>(db, "/setores", a => CriarSetor.Validar(db, e.Nome, e.Triagem, a), s => CriarSetor.Aplicar(s, e.Nome, e.Triagem, e.Ativo), SetorResposta.De);
    }
}
