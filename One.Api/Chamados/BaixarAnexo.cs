using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Chamados;

public sealed record BaixarAnexo(long Id, Usuario Usuario) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/anexos/{id:long}", (long id, HttpContext ctx, IMediator m) => m.Send(new BaixarAnexo(id, ctx.Usuario())));
}

public sealed class BaixarAnexoHandler(OneDb db, Armazenamento armazenamento) : IRequestHandler<BaixarAnexo, IResult>
{
    record AnexoComNumero(string Nome, string Tipo, string Chave, long Tamanho, string Numero);

    public async ValueTask<IResult> Handle(BaixarAnexo m, CancellationToken ct)
    {
        var anexo = await db.Anexos.Where(x => x.Id == m.Id)
            .Select(x => new AnexoComNumero(x.Nome, x.Tipo, x.Chave, x.Tamanho, db.Chamados.Where(c => db.MensagensChamado.Any(y => y.Id == x.MensagemChamadoId && y.ChamadoId == c.Id)).Select(c => c.Numero).Single()))
            .FirstOrDefaultAsync();
        if (anexo is null || (await ChamadoDoUsuario.Carregar(db, m.Usuario, anexo.Numero)).Item1 is null) return Problemas.Erro(404, "Anexo não encontrado.");
        return new ResultadoComTamanho(Results.Stream(await armazenamento.Baixar(anexo.Chave), anexo.Tipo, anexo.Nome), anexo.Tamanho);
    }
}
