using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Instituicoes;

public sealed record BaixarImagemInstituicao(string Slug, string Tipo) : IRequest<IResult>
{
    public const string Cache = "public, max-age=31536000, immutable";

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/instituicoes/{slug}/imagens/{tipo}", (string slug, string tipo, IMediator m) => m.Send(new BaixarImagemInstituicao(slug, tipo))).AllowAnonymous();

    public static IResult ComCache(IResult resultado) => new ResultadoComCache(resultado);

    sealed class ResultadoComCache(IResult resultado) : IResult
    {
        public Task ExecuteAsync(HttpContext ctx)
        {
            ctx.Response.Headers.CacheControl = Cache;
            return resultado.ExecuteAsync(ctx);
        }
    }
}

public sealed class BaixarImagemInstituicaoHandler(OneDb db, Armazenamento armazenamento) : IRequestHandler<BaixarImagemInstituicao, IResult>
{
    record ImagemBaixada(string Conteudo, string Chave, long Tamanho);

    public async ValueTask<IResult> Handle(BaixarImagemInstituicao m, CancellationToken ct)
    {
        var i = await db.Instituicoes.FirstOrDefaultAsync(x => x.Slug == m.Slug && x.Ativa, ct);
        if (i is null || !TiposDeImagem.Todos.Contains(m.Tipo)) return Problemas.Erro(404, "Imagem não encontrada.");
        db.InstituicaoAtual = i.Id;
        var imagem = await db.ImagensInstituicao.Where(x => x.Tipo == m.Tipo && x.RemovidaEm == null).Select(x => new ImagemBaixada(x.Conteudo, x.Chave, x.Tamanho)).FirstOrDefaultAsync(ct);
        return imagem is null ? Problemas.Erro(404, "Imagem não encontrada.")
            : BaixarImagemInstituicao.ComCache(Armazenamento.ComTamanho(Results.Stream(await armazenamento.Baixar(imagem.Chave), imagem.Conteudo), imagem.Tamanho));
    }
}
