using System.Text.Json;
using Lib.Net.Http.WebPush;
using Lib.Net.Http.WebPush.Authentication;

namespace One.Api.Chamados;

public interface IEnviadorPush
{
    // Falha com PushServiceClientException (StatusCode do serviço de push) ou outra exceção; quem chama decide repetir ou apagar a subscrição.
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
        // RFC 8291 (aes128gcm) e RFC 8292 (Authorization: vapid t=,k=)
        await cliente.RequestPushMessageDeliveryAsync(inscricao, new PushMessage(payload), vapid, VapidAuthenticationScheme.Vapid, ct);
    }
}

// door 4: o JSON que o service worker lê; sem nome, e-mail, CPF, texto nem assunto do chamado
public sealed record PayloadPush(string Titulo, string Corpo, string Url)
{
    public static string De(string slug, string numero) =>
        JsonSerializer.Serialize(new PayloadPush("One", $"Seu chamado {numero} foi atualizado.", $"/{slug}/chamados/{numero}"), JsonSerializerOptions.Web);
}
