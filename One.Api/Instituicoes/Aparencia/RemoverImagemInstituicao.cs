using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Instituicoes.Aparencia;

public sealed record RemoverImagemInstituicao(string Tipo) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapDelete("/aparencia/imagens/{tipo}", (string tipo, IMediator m) => m.Send(new RemoverImagemInstituicao(tipo)));
}

public sealed class RemoverImagemInstituicaoHandler(OneDb db) : IRequestHandler<RemoverImagemInstituicao, IResult>
{
    public async ValueTask<IResult> Handle(RemoverImagemInstituicao m, CancellationToken ct)
    {
        var imagem = await db.ImagensInstituicao.FirstOrDefaultAsync(x => x.Tipo == m.Tipo && x.RemovidaEm == null, ct);
        if (imagem is null) return Problemas.Erro(404, "Imagem não encontrada.");
        imagem.Remover(DateTimeOffset.UtcNow);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }
}
