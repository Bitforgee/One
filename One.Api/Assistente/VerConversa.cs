using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Assistente.ConversaDoAluno;

namespace One.Api.Assistente;

public sealed record VerConversa(long Id, Usuario Usuario) : IRequest<IResult>
{
    public sealed record Resposta(Resposta.DaConversa Conversa, IReadOnlyList<Resposta.DaMensagem> Mensagens, string? Desfecho, string? ChamadoNumero)
    {
        public sealed record DaConversa(long Id, DateTime CriadaEm);

        public sealed record DaMensagem(string Autor, string Texto, string? Tipo, DateTime CriadaEm, IReadOnlyList<DoAnexo> Anexos);

        public sealed record DoAnexo(long Id, string Nome, string Tipo, long Tamanho);
    }

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
        return Results.Ok(new VerConversa.Resposta(new(conversa.Id, conversa.CriadaEm),
            [.. conversa.Mensagens.OrderBy(x => x.Id).Select(x => new VerConversa.Resposta.DaMensagem(x.Autor, x.Texto, x.TipoFinal, x.CriadaEm, [.. x.Anexos.OrderBy(a => a.Id).Select(a => new VerConversa.Resposta.DoAnexo(a.Id, a.Nome, a.Tipo, a.Tamanho))]))],
            conversa.Desfecho, chamadoNumero));
    }
}
