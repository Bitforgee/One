using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Conhecimento;

public sealed record BaixarVersaoDocumento(long Id, Usuario Usuario) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/documentos/versoes/{id:long}", (long id, HttpContext ctx, IMediator m) => m.Send(new BaixarVersaoDocumento(id, ctx.Usuario())));
}

public sealed class BaixarVersaoDocumentoHandler(OneDb db) : IRequestHandler<BaixarVersaoDocumento, IResult>
{
    public async ValueTask<IResult> Handle(BaixarVersaoDocumento m, CancellationToken ct)
    {
        var u = m.Usuario;
        if (!u.Tem(Papeis.Atendente) && !u.Tem(Papeis.Administrador)) return Problemas.Erro(404, "Documento não encontrado.");
        var v = await db.VersoesDocumento.Where(x => x.Id == m.Id).Select(x => new { x.Conteudo, x.NomeArquivo }).FirstOrDefaultAsync();
        return v is null ? Problemas.Erro(404, "Documento não encontrado.") : Results.File(v.Conteudo, "application/pdf", v.NomeArquivo);
    }
}
