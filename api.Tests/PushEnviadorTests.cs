using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Chamados;
using One.Api.Tests.Infra;
using Lib.Net.Http.WebPush;

namespace One.Api.Tests;

public class PushEnviadorTests : IClassFixture<OneFactoryEnviadorReal>
{
    readonly OneFactoryEnviadorReal f;
    public PushEnviadorTests(OneFactoryEnviadorReal f) => this.f = f;

    sealed class Capturador(HttpStatusCode status) : HttpMessageHandler
    {
        public List<(HttpMethod Metodo, Uri Uri, string? Codificacao, string? Autorizacao, byte[] Corpo)> Pedidos { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage r, CancellationToken ct)
        {
            Pedidos.Add((r.Method, r.RequestUri!, string.Join(",", r.Content!.Headers.ContentEncoding), r.Headers.Authorization?.ToString(), await r.Content.ReadAsByteArrayAsync(ct)));
            return new HttpResponseMessage(status);
        }
    }

    static string Url(byte[] b) => Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    static (EnviadorPush envio, Capturador rede) Montar(HttpStatusCode status)
    {
        var rede = new Capturador(status);
        var servicos = new ServiceCollection();
        servicos.AddHttpClient("push").ConfigurePrimaryHttpMessageHandler(() => rede);
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Push:ChavePublica"] = OneFactory.Vapid.PublicKey, ["Push:ChavePrivada"] = OneFactory.Vapid.PrivateKey, ["Push:Assunto"] = "mailto:teste@one.test",
        }).Build();
        return (new EnviadorPush(servicos.BuildServiceProvider().GetRequiredService<IHttpClientFactory>(), cfg), rede);
    }

    // uma subscrição de navegador de teste: chave pública P-256 não comprimida e segredo de autenticação de 16 bytes
    static (string p256dh, string auth) Navegador()
    {
        using var ec = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        var p = ec.ExportParameters(false);
        return (Url([0x04, .. p.Q.X!, .. p.Q.Y!]), Url(RandomNumberGenerator.GetBytes(16)));
    }

    [Fact]
    public async Task Real_envia_post_cifrado_com_vapid()
    {
        var (envio, rede) = Montar(HttpStatusCode.Created);
        var (p256dh, auth) = Navegador();
        var payload = PayloadPush.De("univag", "ONE-1", "Univag", "ABERTO", null);

        await envio.Enviar("https://push.teste/abc", p256dh, auth, payload, CancellationToken.None);

        var pedido = Assert.Single(rede.Pedidos);
        Assert.Equal((HttpMethod.Post, new Uri("https://push.teste/abc"), "aes128gcm"), (pedido.Metodo, pedido.Uri, pedido.Codificacao));
        Assert.StartsWith("vapid ", pedido.Autorizacao);
        Assert.Matches(@"\bt=[\w-]+\.[\w-]+\.[\w-]+", pedido.Autorizacao);
        Assert.Contains($"k={OneFactory.Vapid.PublicKey}", pedido.Autorizacao);
        Assert.True(pedido.Corpo.AsSpan().IndexOf(System.Text.Encoding.UTF8.GetBytes(payload)) < 0, "o corpo deve ir cifrado");
    }

    [Theory]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.Gone)]
    public async Task Real_expoe_404_e_410_como_status(HttpStatusCode status)
    {
        var (envio, _) = Montar(status);
        var (p256dh, auth) = Navegador();
        var falha = await Assert.ThrowsAsync<PushServiceClientException>(() => envio.Enviar("https://push.teste/abc", p256dh, auth, "{}", CancellationToken.None));
        Assert.Equal(status, falha.StatusCode);
    }

    [Fact]
    public void Producao_registra_o_enviador_real() =>
        Assert.IsType<EnviadorPush>(f.Services.GetRequiredService<IEnviadorPush>());
}
