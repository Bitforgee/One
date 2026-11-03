using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Chamados;

// AC 129: o anexo segue o acesso ao chamado
public sealed record BaixarAnexo(long Id, Usuario Usuario) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/anexos/{id:long}", (long id, HttpContext ctx, IMediator m) => m.Send(new BaixarAnexo(id, ctx.Usuario())));
}

public sealed class BaixarAnexoHandler(OneDb db) : IRequestHandler<BaixarAnexo, IResult>
{
    record AnexoComNumero(string Nome, string Tipo, byte[] Conteudo, string Numero);

    public async ValueTask<IResult> Handle(BaixarAnexo m, CancellationToken ct)
    {
        var anexo = await db.Anexos.Where(x => x.Id == m.Id)
            .Select(x => new AnexoComNumero(x.Nome, x.Tipo, x.Conteudo, db.Chamados.Where(c => db.MensagensChamado.Any(y => y.Id == x.MensagemChamadoId && y.ChamadoId == c.Id)).Select(c => c.Numero).Single()))
            .FirstOrDefaultAsync();
        if (anexo is null || (await ChamadoRotas.Carregar(db, m.Usuario, anexo.Numero)).Item1 is null) return Problemas.Erro(404, "Anexo não encontrado.");
        return Results.File(anexo.Conteudo, anexo.Tipo, anexo.Nome);
    }
}
