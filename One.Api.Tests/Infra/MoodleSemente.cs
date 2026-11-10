using System.Net;
using Microsoft.EntityFrameworkCore;
using One.Api.Acesso;
using One.Api.Dados;

namespace One.Api.Tests.Infra;

public static class MoodleSemente
{
    public static Task<PlataformaMoodle> PlataformaMoodle(this OneFactory f, Instituicao i, bool ativa = true) =>
        f.Db(i.Id, async db =>
        {
            var p = new PlataformaMoodle();
            p.Configurar(ativa, MoodleFalso.Emissor, MoodleFalso.ClientId, MoodleFalso.DeploymentId, MoodleFalso.AuthUrl, MoodleFalso.JwksUrl);
            db.PlataformasMoodle.Add(p);
            await db.SaveChangesAsync();
            return p;
        });

    public static async Task<(string State, string Nonce)> NovoLancamento(this OneFactory f, Instituicao i, Func<DateTime, DateTime>? emitidoEm = null)
    {
        var (state, nonce) = (MoodleLti.Aleatorio(), MoodleLti.Aleatorio());
        var agora = f.Relogio.GetUtcNow().UtcDateTime;
        await f.Db(i.Id, async db =>
        {
            db.LtiLancamentos.Add(LtiLancamento.Abrir(state, nonce, emitidoEm?.Invoke(agora) ?? agora));
            await db.SaveChangesAsync();
        });
        return (state, nonce);
    }

    public static Task<HttpResponseMessage> Lancar(this HttpClient c, string slug, string? idToken, string? state)
    {
        var campos = new List<KeyValuePair<string, string>>();
        if (idToken is not null) campos.Add(new("id_token", idToken));
        if (state is not null) campos.Add(new("state", state));
        return c.PostAsync($"/api/moodle/{slug}/lancamento", new FormUrlEncodedContent(campos));
    }

    public static string Sessao(this HttpResponseMessage r) =>
        r.Headers.TryGetValues("Set-Cookie", out var c) ? c.FirstOrDefault(x => x.StartsWith("one.auth=")) ?? "" : "";

    public static string? Destino(this HttpResponseMessage r) => r.StatusCode == HttpStatusCode.Redirect ? r.Headers.Location?.OriginalString : null;

    public static Task<List<VinculoMoodle>> Vinculos(this OneFactory f, Instituicao i) => f.Db(i.Id, db => db.VinculosMoodle.AsNoTracking().ToListAsync());
}
