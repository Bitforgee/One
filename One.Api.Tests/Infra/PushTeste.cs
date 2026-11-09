using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using One.Api.Chamados;
using One.Api.Dados;
using Lib.Net.Http.WebPush;

namespace One.Api.Tests.Infra;

public record EnvioPush(string Endpoint, string P256dh, string Auth, string Payload);

public class EnviadorFalso : IEnviadorPush
{
    readonly List<EnvioPush> envios = [];
    public IReadOnlyList<EnvioPush> Envios { get { lock (envios) return [.. envios]; } }
    public Func<EnvioPush, CancellationToken, Task>? Comportamento { get; set; }

    public async Task Enviar(string endpoint, string p256dh, string auth, string payload, CancellationToken ct)
    {
        var e = new EnvioPush(endpoint, p256dh, auth, payload);
        lock (envios) envios.Add(e);
        if (Comportamento is { } c) await c(e, ct);
    }

    public static PushServiceClientException Falha(System.Net.HttpStatusCode status) => new("falha simulada", status);
}

public static class PushSemente
{
    public static string Endpoint(string nome = "") => $"https://push.teste/{Guid.NewGuid():N}{nome}";

    public static Task<SubscricaoPush> Subscrever(this OneFactory f, Instituicao i, Usuario u, string? endpoint = null) =>
        f.Db(i.Id, async db =>
        {
            var s = SubscricaoPush.Registrar(u.Id, i.Id, endpoint ?? Endpoint(), "p256dh-" + u.Id, "auth-" + u.Id, f.Relogio.GetUtcNow().UtcDateTime);
            db.SubscricoesPush.Add(s);
            await db.SaveChangesAsync();
            return s;
        });

    public static Task<List<SubscricaoPush>> Subscricoes(this OneFactory f, Func<IQueryable<SubscricaoPush>, IQueryable<SubscricaoPush>>? filtro = null) =>
        f.Db(null, db => (filtro?.Invoke(db.SubscricoesPush.IgnoreQueryFilters()) ?? db.SubscricoesPush.IgnoreQueryFilters()).OrderBy(s => s.Id).ToListAsync());

    public static Task<List<PushSaida>> Pushes(this OneFactory f, Func<IQueryable<PushSaida>, IQueryable<PushSaida>>? filtro = null) =>
        f.Db(null, db => (filtro?.Invoke(db.PushesSaida.IgnoreQueryFilters()) ?? db.PushesSaida.IgnoreQueryFilters()).OrderBy(p => p.Id).ToListAsync());

    public static Task<HttpClient> EntrarEm(this WebApplicationFactory<Program> fx, Aluno a) => fx.EntrarEm(a.Instituicao, a.Usuario);

    public static async Task<HttpClient> EntrarEm(this WebApplicationFactory<Program> fx, Instituicao i, Usuario u)
    {
        var c = fx.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), AllowAutoRedirect = false });
        Assert.Equal(System.Net.HttpStatusCode.OK, (await c.Login(i.Slug, u.Cpf)).StatusCode);
        return c;
    }
}
