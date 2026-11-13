namespace One.Api;

public sealed class ResultadoComTamanho(IResult resultado, long tamanho) : IResult
{
    public Task ExecuteAsync(HttpContext ctx)
    {
        ctx.Response.ContentLength = tamanho;
        return resultado.ExecuteAsync(ctx);
    }
}