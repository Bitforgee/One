using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Instituicoes;

public sealed record ReativarInstituicao(string Slug) : IRequest<IResult>
{
    public sealed record Resposta(string Slug, bool Ativa);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/instituicoes/{slug}/reativar", (string slug, IMediator m) => m.Send(new ReativarInstituicao(slug)));
}

public sealed class ReativarInstituicaoHandler(OneDb db) : IRequestHandler<ReativarInstituicao, IResult>
{
    public async ValueTask<IResult> Handle(ReativarInstituicao m, CancellationToken ct)
    {
        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(i => i.Slug == m.Slug, ct);
        if (instituicao is null) return Problemas.Erro(404, ErrosDaPlataforma.NaoEncontrada);
        instituicao.Reativar();
        await db.SaveChangesAsync(ct);
        return Results.Ok(new ReativarInstituicao.Resposta(instituicao.Slug, instituicao.Ativa));
    }
}
