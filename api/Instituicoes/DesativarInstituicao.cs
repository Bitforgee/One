using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Instituicoes;

public sealed record DesativarInstituicao(string Slug) : IRequest<IResult>
{
    public sealed record Resposta(string Slug, bool Ativa);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/instituicoes/{slug}/desativar", (string slug, IMediator m) => m.Send(new DesativarInstituicao(slug)));
}

public sealed class DesativarInstituicaoHandler(OneDb db) : IRequestHandler<DesativarInstituicao, IResult>
{
    public async ValueTask<IResult> Handle(DesativarInstituicao m, CancellationToken ct)
    {
        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(i => i.Slug == m.Slug, ct);
        if (instituicao is null) return Problemas.Erro(404, PlataformaRotas.NaoEncontrada);
        if (instituicao.Id == db.InstituicaoAtual) return Problemas.Erro(409, "Você não pode desativar a instituição em que está.");
        instituicao.Ativa = false;
        await db.SaveChangesAsync(ct);
        return Results.Ok(new DesativarInstituicao.Resposta(instituicao.Slug, instituicao.Ativa));
    }
}
