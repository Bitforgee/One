using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Assistente.ConversaRotas;

namespace One.Api.Assistente;

public sealed record VerConversa(long Id, Usuario Usuario) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/conversas/{id:long}", (long id, HttpContext ctx, IMediator m) => m.Send(new VerConversa(id, ctx.Usuario())));
}

public sealed class VerConversaHandler(OneDb db) : IRequestHandler<VerConversa, IResult>
{
    public async ValueTask<IResult> Handle(VerConversa m, CancellationToken ct)
    {
        var conversa = await DoAluno(db, m.Usuario, m.Id);
        if (conversa is null) return NaoEncontrada();
        var chamadoNumero = await db.Chamados.Where(c => c.ConversaId == m.Id).Select(c => c.Numero).FirstOrDefaultAsync();
        return Results.Ok(new
        {
            conversa = new { id = conversa.Id, criadaEm = conversa.CriadaEm },
            mensagens = conversa.Mensagens.OrderBy(x => x.Id)
                .Select(x => new { autor = x.Autor, texto = x.Texto, tipo = x.TipoFinal, criadaEm = x.CriadaEm }),
            desfecho = conversa.Desfecho,
            chamadoNumero,
        });
    }
}
