using System.Text.Json.Serialization;
using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Instituicoes;

namespace One.Api.Acesso;

public sealed record VerInstituicao(string Slug) : IRequest<IResult>
{
    public sealed record Resposta : AparenciaDados
    {
        public Resposta(string nome, AparenciaDados aparencia) : base(aparencia) => Nome = nome;

        [JsonPropertyOrder(-1)] public string Nome { get; }
    }

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/instituicoes/{slug}", (string slug, IMediator m) => m.Send(new VerInstituicao(slug))).AllowAnonymous();
}

public sealed class VerInstituicaoHandler(OneDb db) : IRequestHandler<VerInstituicao, IResult>
{
    public async ValueTask<IResult> Handle(VerInstituicao m, CancellationToken ct)
    {
        if (await db.Instituicoes.FirstOrDefaultAsync(i => i.Slug == m.Slug && i.Ativa, ct) is not { } i) return Problemas.Erro(404, "Instituição não encontrada.");
        db.InstituicaoAtual = i.Id;
        return Results.Ok(new VerInstituicao.Resposta(i.Nome, AparenciaDados.De(i, await db.ImagensInstituicao.ToListAsync(ct))));
    }
}
