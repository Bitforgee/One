using Mediator;
using One.Api.Dados;
using static One.Api.Conhecimento.ArtigoRotas;

namespace One.Api.Conhecimento;

public sealed record AlterarArtigo(long Id, ArtigoIn Corpo) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/artigos/{id:long}", (long id, ArtigoIn i, IMediator m) => m.Send(new AlterarArtigo(id, i)));
}

public sealed class AlterarArtigoHandler(OneDb db, TimeProvider relogio) : IRequestHandler<AlterarArtigo, IResult>
{
    public async ValueTask<IResult> Handle(AlterarArtigo m, CancellationToken ct)
    {
        var i = m.Corpo;
        var a = await Ler(db, m.Id);
        if (a is null) return Problemas.Erro(404, "Artigo não encontrado.");
        if (await Validar(db, i) is { } erro) return erro;
        var agora = relogio.GetUtcNow().UtcDateTime;
        var nova = Versao(i, a.Ultima().Numero + 1, agora);
        a.NovaVersao(nova, i.CategoriaId!.Value, i.VisivelDe, i.VisivelAte);
        if (a.Estado == EstadosArtigo.Ativo) db.TrechosFonte.Add(Fontes.DoArtigo(nova, agora));
        await db.SaveChangesAsync();
        return await Responder(db, a);
    }
}
