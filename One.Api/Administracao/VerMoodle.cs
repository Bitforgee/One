using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record VerMoodle : IRequest<IResult>
{
    public sealed record Resposta : MoodleDados
    {
        public Resposta(MoodleDados d) : base(d) { }
    }

    public static void Mapear(RouteGroupBuilder g) => g.MapGet("/moodle", (IMediator m) => m.Send(new VerMoodle()));
}

public sealed class VerMoodleHandler(OneDb db, IConfiguration cfg) : IRequestHandler<VerMoodle, IResult>
{
    public async ValueTask<IResult> Handle(VerMoodle m, CancellationToken ct)
    {
        var i = await db.Instituicoes.SingleAsync(x => x.Id == db.InstituicaoAtual, ct);
        var p = await db.PlataformasMoodle.FirstOrDefaultAsync(ct);
        return Results.Ok(new VerMoodle.Resposta(MoodleDados.De(p, cfg, i.Slug)));
    }
}
