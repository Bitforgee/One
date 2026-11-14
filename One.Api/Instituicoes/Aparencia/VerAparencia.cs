using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Instituicoes.Aparencia;

public sealed record VerAparencia : IRequest<IResult>
{
    public sealed record Resposta : AparenciaDados
    {
        public Resposta(AparenciaDados d) : base(d) { }
    }

    public static void Mapear(RouteGroupBuilder g) => g.MapGet("/aparencia", (IMediator m) => m.Send(new VerAparencia()));
}

public sealed class VerAparenciaHandler(OneDb db) : IRequestHandler<VerAparencia, IResult>
{
    public async ValueTask<IResult> Handle(VerAparencia m, CancellationToken ct)
    {
        var i = await db.Instituicoes.SingleAsync(x => x.Id == db.InstituicaoAtual, ct);
        return Results.Ok(new VerAparencia.Resposta(AparenciaDados.De(i, await db.ImagensInstituicao.ToListAsync(ct))));
    }
}
