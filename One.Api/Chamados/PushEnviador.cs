using System.Text.Json;
using Lib.Net.Http.WebPush;
using Lib.Net.Http.WebPush.Authentication;
using One.Api.Dados;

namespace One.Api.Chamados;

public interface IEnviadorPush
{
    Task Enviar(string endpoint, string p256dh, string auth, string payload, CancellationToken ct);
}

public sealed class EnviadorPush(IHttpClientFactory http, IConfiguration cfg) : IEnviadorPush
{
    public async Task Enviar(string endpoint, string p256dh, string auth, string payload, CancellationToken ct)
    {
        var c = ConfigPush.Ler(cfg);
        var cliente = new PushServiceClient(http.CreateClient("push"));
        var inscricao = new PushSubscription { Endpoint = endpoint };
        inscricao.SetKey(PushEncryptionKeyName.P256DH, p256dh);
        inscricao.SetKey(PushEncryptionKeyName.Auth, auth);
        using var vapid = new VapidAuthentication(c.ChavePublica, c.ChavePrivada) { Subject = c.Assunto };
        await cliente.RequestPushMessageDeliveryAsync(inscricao, new PushMessage(payload), vapid, VapidAuthenticationScheme.Vapid, ct);
    }
}

public sealed record PayloadPush(string Titulo, string Corpo, string Url, string Icone)
{
    static readonly JsonSerializerOptions Json = new(JsonSerializerOptions.Web) { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };
    public const string IconePadrao = "/icons/icon-192.png";

    public static string De(string slug, string numero, string titulo, string estado, int? versaoIcone) =>
        JsonSerializer.Serialize(new PayloadPush(titulo, $"Sua solicitação {numero} " + estado switch
        {
            EstadosChamado.Resolvido => "foi resolvida.",
            EstadosChamado.AguardandoAluno => "aguarda sua resposta.",
            _ => "tem uma resposta nova.",
        }, $"/{slug}/chamados/{numero}", versaoIcone is { } v ? $"/api/instituicoes/{slug}/imagens/icone?v={v}" : IconePadrao), Json);
}
