using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Acesso;

public sealed record VerInstituicao(string Slug) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/instituicoes/{slug}", (string slug, IMediator m) => m.Send(new VerInstituicao(slug))).AllowAnonymous();
}

public sealed class VerInstituicaoHandler(OneDb db) : IRequestHandler<VerInstituicao, IResult>
{
    public async ValueTask<IResult> Handle(VerInstituicao m, CancellationToken ct) =>
        await db.Instituicoes.FirstOrDefaultAsync(i => i.Slug == m.Slug && i.Ativa) is { } i
            ? Results.Ok(new { nome = i.Nome })
            : Problemas.Erro(404, "Instituição não encontrada.");
}
