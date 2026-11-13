using Mediator;
using One.Api.Dados;
using static One.Api.Conhecimento.ValidacaoDeArtigo;

namespace One.Api.Conhecimento;

public sealed record AlterarArtigo(long Id, AlterarArtigo.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Titulo, string[]? Perguntas, long? CategoriaId, string? Resposta, string[]? Links, DateOnly? VisivelDe = null, DateOnly? VisivelAte = null);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/artigos/{id:long}", (long id, AlterarArtigo.Entrada i, IMediator m) => m.Send(new AlterarArtigo(id, i)));
}

public sealed class AlterarArtigoHandler(OneDb db, TimeProvider relogio) : IRequestHandler<AlterarArtigo, IResult>
{
    public async ValueTask<IResult> Handle(AlterarArtigo m, CancellationToken ct)
    {
        var i = m.Corpo;
        var a = await ArtigoComVersoes.Ler(db, m.Id);
        if (a is null) return Problemas.Erro(404, "Artigo não encontrado.");
        if (await Validar(db, i.Titulo, i.Perguntas, i.CategoriaId, i.Resposta, i.Links, i.VisivelDe, i.VisivelAte) is { } erro) return erro;
        var agora = relogio.GetUtcNow().UtcDateTime;
        var nova = Versao(i.Titulo, i.Perguntas, i.Resposta, i.Links, a.UltimaVersao.Numero + 1, agora);
        a.NovaVersao(nova, i.CategoriaId!.Value, i.VisivelDe, i.VisivelAte);
        if (a.Estado == EstadosArtigo.Ativo) db.TrechosFonte.Add(TrechoFonte.DoArtigo(nova, agora));
        await db.SaveChangesAsync();
        return Results.Ok(await ArtigoResposta.De(db, a));
    }
}
