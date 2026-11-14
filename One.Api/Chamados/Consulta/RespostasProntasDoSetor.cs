using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Chamados.Consulta;

public sealed record RespostasProntasDoSetor(long? SetorId, Usuario Usuario) : IRequest<IResult>
{
    public sealed record Resposta(long Id, string Titulo, string Texto);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/respostas-prontas", (long? setorId, HttpContext ctx, IMediator m) => m.Send(new RespostasProntasDoSetor(setorId, ctx.Usuario())));
}

public sealed class RespostasProntasDoSetorHandler(OneDb db) : IRequestHandler<RespostasProntasDoSetor, IResult>
{
    public async ValueTask<IResult> Handle(RespostasProntasDoSetor m, CancellationToken ct)
    {
        var u = m.Usuario;
        if (!u.Tem(Papeis.Atendente) || !await db.AtendenteSetores.AnyAsync(a => a.UsuarioId == u.Id && a.SetorId == m.SetorId))
            return Problemas.Erro(404, "Setor não encontrado.");
        return Results.Ok(await db.RespostasProntas.Where(r => r.SetorId == m.SetorId).OrderBy(r => r.Titulo)
            .Select(r => new RespostasProntasDoSetor.Resposta(r.Id, r.Titulo, r.Texto)).ToListAsync());
    }
}
