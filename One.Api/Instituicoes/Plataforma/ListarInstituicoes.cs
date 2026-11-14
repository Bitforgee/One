using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Instituicoes.Plataforma;

public sealed record ListarInstituicoes : IRequest<IResult>
{
    public sealed record Resposta(string Slug, string Nome, string Fuso, bool Ativa, DateTime CriadaEm, int Administradores);

    public static void Mapear(RouteGroupBuilder g) => g.MapGet("/instituicoes", (IMediator m) => m.Send(new ListarInstituicoes()));
}

public sealed class ListarInstituicoesHandler(OneDb db) : IRequestHandler<ListarInstituicoes, IResult>
{
    public sealed record Contagem(long InstituicaoId, int Total);

    public async ValueTask<IResult> Handle(ListarInstituicoes m, CancellationToken ct)
    {
        var administradores = (await db.Database.SqlQuery<Contagem>($"""
            SELECT u.instituicao_id AS "InstituicaoId", COUNT(*)::int AS "Total" FROM usuario u
            WHERE u.ativo AND EXISTS (SELECT 1 FROM usuario_papel p WHERE p.usuario_id = u.id AND p.papel = {Papeis.Administrador})
            GROUP BY u.instituicao_id
            """).ToListAsync(ct)).ToDictionary(c => c.InstituicaoId, c => c.Total);
        var lista = await db.Instituicoes.OrderByDescending(i => i.Ativa).ThenBy(i => i.Nome).ToListAsync(ct);
        return Results.Ok(lista.Select(i => new ListarInstituicoes.Resposta(i.Slug, i.Nome, i.Fuso, i.Ativa, i.CriadaEm, administradores.GetValueOrDefault(i.Id))));
    }
}
