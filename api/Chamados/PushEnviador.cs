using System.Text.Json;
using WebPush;

namespace One.Api.Chamados;

public interface IEnviadorPush
{
    // Falha com WebPushException (StatusCode do serviço de push) ou outra exceção; quem chama decide repetir ou apagar a subscrição.
    Task Enviar(string endpoint, string p256dh, string auth, string payload, CancellationToken ct);
}

public sealed class EnviadorPush(IHttpClientFactory http, IConfiguration cfg) : IEnviadorPush
{
    public async Task Enviar(string endpoint, string p256dh, string auth, string payload, CancellationToken ct)
    {
        var c = ConfigPush.Ler(cfg);
        var cliente = new WebPushClient(http.CreateClient("push"));
        await cliente.SendNotificationAsync(new PushSubscription(endpoint, p256dh, auth), payload, new VapidDetails(c.Assunto, c.ChavePublica, c.ChavePrivada), ct);
    }
}

// door 4: o JSON que o service worker lê; sem nome, e-mail, CPF, texto nem assunto do chamado
public sealed record PayloadPush(string Titulo, string Corpo, string Url)
{
    public static string De(string slug, string numero) =>
        JsonSerializer.Serialize(new PayloadPush("One", $"Seu chamado {numero} foi atualizado.", $"/{slug}/chamados/{numero}"), JsonSerializerOptions.Web);
}
