using System.Collections.Concurrent;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Chamados;
using One.Api.Dados;

namespace One.Api.Tests.Infra;

// Cliente .NET do SignalR contra o host de teste (WebSocket pelo TestServer), com o cookie de um usuário.
public static class TempoRealCliente
{
    public static async Task<string> Cookie(this OneFactory f, Instituicao i, Usuario u, string senha = Semente.Senha)
    {
        using var c = f.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = false, AllowAutoRedirect = false });
        var r = await c.Login(i.Slug, u.Cpf, senha);
        Assert.Equal(System.Net.HttpStatusCode.OK, r.StatusCode);
        return r.Headers.GetValues("Set-Cookie").First(x => x.StartsWith("one.auth=")).Split(';')[0];
    }

    public static HubConnection Conectar(this OneFactory f, string? cookie)
    {
        var uri = new Uri("https://localhost/api/tempo-real");
        return new HubConnectionBuilder().WithUrl(uri, o =>
        {
            o.Transports = HttpTransportType.WebSockets;
            o.SkipNegotiation = false;
            o.HttpMessageHandlerFactory = _ => f.Server.CreateHandler();
            if (cookie is not null) o.Headers["Cookie"] = cookie;
            o.WebSocketFactory = async (ctx, ct) =>
            {
                var ws = f.Server.CreateWebSocketClient();
                if (cookie is not null) ws.ConfigureRequest = r => r.Headers["Cookie"] = cookie;
                return await ws.ConnectAsync(ctx.Uri, ct);
            };
        }).Build();
    }

    public static async Task<Conectado> Abrir(this OneFactory f, Instituicao i, Usuario u)
    {
        var con = f.Conectar(await f.Cookie(i, u));
        var c = new Conectado(con);
        await con.StartAsync();
        return c;
    }

    // Sonda: um aviso qualquer mandado pelo IHubContext ao grupo; só chega a quem está no grupo.
    public static async Task Sonda(this OneFactory f, string grupo) =>
        await f.Services.GetRequiredService<IHubContext<TempoRealHub>>().Clients.Group(grupo).SendAsync("Sonda", grupo);

    public static Task Desativar(this OneFactory f, Instituicao i, Usuario u) =>
        f.Db(i.Id, db => db.Usuarios.Where(x => x.Id == u.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Ativo, false)));
}

// Conexão aberta que guarda o que o servidor mandar (ChamadoMudou, FilaMudou e a Sonda dos testes).
public sealed class Conectado : IAsyncDisposable
{
    public HubConnection Conexao { get; }
    public ConcurrentQueue<string> Recebidos { get; } = new();

    public Conectado(HubConnection con)
    {
        Conexao = con;
        con.On<string>("ChamadoMudou", n => Recebidos.Enqueue("ChamadoMudou:" + n));
        con.On("FilaMudou", () => Recebidos.Enqueue("FilaMudou"));
        con.On<string>("Sonda", g => Recebidos.Enqueue("Sonda:" + g));
    }

    public Task Entrar(string numero) => Conexao.InvokeAsync("EntrarNoChamado", numero);
    public Task Sair(string numero) => Conexao.InvokeAsync("SairDoChamado", numero);
    public Task EntrarNaFila() => Conexao.InvokeAsync("EntrarNaFila");

    // O cliente recebe "An unexpected error occurred invoking 'X' on the server. HubException: <texto>"; devolve só o texto do HubException.
    public async Task<string> Recusa(Func<Task> acao)
    {
        var m = (await Assert.ThrowsAsync<HubException>(acao)).Message;
        const string marca = "HubException: ";
        return m[(m.IndexOf(marca, StringComparison.Ordinal) + marca.Length)..];
    }

    // O servidor entrega em ordem; um "marcador" mandado depois prova que o que viria antes já chegou.
    public async Task<List<string>> Esperar(int quantos, TimeSpan? limite = null)
    {
        var fim = DateTime.UtcNow + (limite ?? TimeSpan.FromSeconds(5));
        while (Recebidos.Count < quantos && DateTime.UtcNow < fim) await Task.Delay(20);
        return [.. Recebidos];
    }

    // Para provar ausência: espera um instante curto e devolve o que chegou.
    public async Task<List<string>> Quieto()
    {
        await Task.Delay(400);
        return [.. Recebidos];
    }

    public ValueTask DisposeAsync() => Conexao.DisposeAsync();
}
