namespace One.Api;

public static class TratamentoDeErros
{
    public static IServiceCollection AddTratamentoDeErros(this IServiceCollection s)
    {
        s.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = false);
        s.AddProblemDetails(o => o.CustomizeProblemDetails = c =>
        {
            var status = c.ProblemDetails.Status ?? c.HttpContext.Response.StatusCode;
            c.ProblemDetails.Title = Problemas.Titulo(status);
            if (c.Exception is not null && Problemas.Conflito(c.Exception)) c.ProblemDetails.Detail = Problemas.AlteradoPorOutro;
            if (c.Exception is ArmazenamentoIndisponivel a) c.ProblemDetails.Detail = a.Message;
            c.ProblemDetails.Detail ??= Problemas.Detalhe(status);
            c.ProblemDetails.Type ??= $"https://developer.mozilla.org/docs/Web/HTTP/Reference/Status/{status}";
        });
        s.AddExceptionHandler(o => o.StatusCodeSelector = e => e is ArmazenamentoIndisponivel ? 503 : Problemas.Conflito(e) ? 409 : 500);
        return s;
    }

    public static IApplicationBuilder UseTratamentoDeErros(this IApplicationBuilder app) => app.UseExceptionHandler().UseStatusCodePages();
}
