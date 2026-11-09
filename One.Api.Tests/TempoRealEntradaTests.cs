using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using One.Api.Chamados;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class TempoRealEntradaTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string NaoEncontrado = "Chamado não encontrado.";
    const string SoAtendentes = "A fila é só para atendentes.";
    const string Invalida = "Sessão inválida.";

    HttpClient Cru() => f.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = false, AllowAutoRedirect = false });

    static HttpRequestMessage Pedido(HttpMethod metodo, string caminho, string? cookie)
    {
        var r = new HttpRequestMessage(metodo, caminho);
        if (cookie is not null) r.Headers.Add("Cookie", cookie);
        return r;
    }

    async Task<HttpResponseMessage> Negociar(string? cookie)
    {
        using var c = Cru();
        return await c.SendAsync(Pedido(HttpMethod.Post, "/api/tempo-real/negotiate?negotiateVersion=1", cookie));
    }

    async Task<string> StatusDoWebSocket(string? cookie, string id = "x")
    {
        var ws = f.Server.CreateWebSocketClient();
        if (cookie is not null) ws.ConfigureRequest = r => r.Headers["Cookie"] = cookie;
        var e = await Assert.ThrowsAsync<InvalidOperationException>(() => ws.ConnectAsync(new Uri($"wss://localhost/api/tempo-real?id={id}"), CancellationToken.None));
        return e.Message;
    }

    [Fact]
    public async Task Negociar_recusa_401_sem_cookie_e_com_sessao_inativa()
    {
        var b = await Balcao.Criar(f);
        var cookieUsuario = await f.Cookie(b.Instituicao, b.A.Usuario);
        var outra = await Balcao.Criar(f);
        var cookieInstituicao = await f.Cookie(outra.Instituicao, outra.A.Usuario);
        await f.Desativar(b.Instituicao, b.A.Usuario);
        await f.Db(null, db => db.Instituicoes.Where(i => i.Id == outra.Instituicao.Id).ExecuteUpdateAsync(s => s.SetProperty(i => i.Ativa, false)));

        foreach (var cookie in new string?[] { null, cookieUsuario, cookieInstituicao })
            Assert.Equal(HttpStatusCode.Unauthorized, (await Negociar(cookie)).StatusCode);

        await using var conexao = f.Conectar(null);
        await Assert.ThrowsAnyAsync<Exception>(() => conexao.StartAsync());
        Assert.Equal(HubConnectionState.Disconnected, conexao.State);
    }

    [Fact]
    public async Task WebSocket_sem_cookie_responde_401()
    {
        Assert.Contains("401", await StatusDoWebSocket(null));
        using var c = Cru();
        Assert.Equal(HttpStatusCode.Unauthorized, (await c.SendAsync(Pedido(HttpMethod.Get, "/api/tempo-real", null))).StatusCode);
    }

    async Task<string> CookieComTrocaPendente()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Aluno], deveTrocarSenha: true);
        return await f.Cookie(i, u);
    }

    [Fact]
    public async Task Negociar_com_troca_de_senha_pendente_responde_403()
    {
        var r = await Negociar(await CookieComTrocaPendente());
        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
        Assert.Equal("Troque a senha para continuar.", (await r.Json()).GetProperty("detail").GetString());
    }

    [Fact]
    public async Task WebSocket_com_troca_de_senha_pendente_responde_403()
    {
        var cookie = await CookieComTrocaPendente();
        Assert.Contains("403", await StatusDoWebSocket(cookie));
        using var c = Cru();
        var r = await c.SendAsync(Pedido(HttpMethod.Get, "/api/tempo-real", cookie));
        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
        Assert.Equal("Troque a senha para continuar.", (await r.Json()).GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Negociar_com_cookie_valido_responde_200()
    {
        var a = await f.AlunoLogado();
        var r = await Negociar(await f.Cookie(a.Instituicao, a.Usuario));
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.False(string.IsNullOrEmpty((await r.Json()).GetProperty("connectionId").GetString()));
    }

    [Fact]
    public async Task WebSocket_com_cookie_valido_responde_101()
    {
        var a = await f.AlunoLogado();
        var cookie = await f.Cookie(a.Instituicao, a.Usuario);
        var id = (await (await Negociar(cookie)).Json()).GetProperty("connectionToken").GetString();
        var ws = f.Server.CreateWebSocketClient();
        ws.ConfigureRequest = r => r.Headers["Cookie"] = cookie;
        using var socket = await ws.ConnectAsync(new Uri($"wss://localhost/api/tempo-real?id={id}"), CancellationToken.None);
        Assert.Equal(System.Net.WebSockets.WebSocketState.Open, socket.State);
    }

    [Fact]
    public async Task EntrarNoChamado_entra_no_grupo_do_solicitante_e_do_atendente_do_setor()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        await using var aluno = await f.Abrir(b.Instituicao, b.Aluno.Usuario);
        await using var atendente = await f.Abrir(b.Instituicao, b.A.Usuario);
        await aluno.Entrar(numero);
        await atendente.Entrar(numero);

        var grupo = TempoRealGrupos.Chamado(b.Instituicao.Id, numero);
        await f.Sonda(grupo);
        Assert.Equal([$"Sonda:{grupo}"], await aluno.Esperar(1));
        Assert.Equal([$"Sonda:{grupo}"], await atendente.Esperar(1));
    }

    [Fact]
    public async Task EntrarNoChamado_duas_vezes_entrega_um_aviso_so()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        await using var aluno = await f.Abrir(b.Instituicao, b.Aluno.Usuario);
        await aluno.Entrar(numero);
        await aluno.Entrar(numero);

        var grupo = TempoRealGrupos.Chamado(b.Instituicao.Id, numero);
        await f.Sonda(grupo);
        await aluno.Esperar(1);
        Assert.Equal([$"Sonda:{grupo}"], await aluno.Quieto());
    }

    [Fact]
    public async Task EntrarNoChamado_recusa_com_Chamado_nao_encontrado()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        var outraInstituicao = await f.AlunoLogado();
        var outroAluno = await f.Usuario(b.Instituicao, [Papeis.Aluno]);
        var admin = await f.Usuario(b.Instituicao, [Papeis.Administrador]);
        var casos = new (Usuario quem, string numero)[]
        {
            (b.Aluno.Usuario, "ONE-999"),
            (outraInstituicao.Usuario, numero),
            (outroAluno, numero),
            (b.Alheio.Usuario, numero),
            (admin, numero),
            (b.Aluno.Usuario, ""),
        };
        foreach (var (quem, n) in casos)
        {
            await using var c = await f.Abrir(quem.InstituicaoId == b.Instituicao.Id ? b.Instituicao : outraInstituicao.Instituicao, quem);
            Assert.Equal(NaoEncontrado, await c.Recusa(() => c.Entrar(n)));
            await f.Sonda(TempoRealGrupos.Chamado(b.Instituicao.Id, numero));
            await f.Sonda(TempoRealGrupos.Chamado(outraInstituicao.Instituicao.Id, numero));
            Assert.Empty(await c.Quieto());
        }

        var get = await b.Alheio.Cliente.GetAsync($"/api/chamados/{numero}");
        Assert.Equal(NaoEncontrado, (await get.Json()).GetProperty("detail").GetString());
    }

    [Fact]
    public async Task EntrarNaFila_entra_na_fila_de_cada_setor_do_atendente()
    {
        var b = await Balcao.Criar(f);
        var terceiro = await f.Setor(b.Instituicao, "Secretaria");
        var atendente = await f.Atendente(b.Instituicao, b.Triagem, b.Outro);
        await using var c = await f.Abrir(b.Instituicao, atendente.Usuario);
        await c.EntrarNaFila();

        var (g1, g2, g3) = (TempoRealGrupos.Fila(b.Instituicao.Id, b.Triagem.Id), TempoRealGrupos.Fila(b.Instituicao.Id, b.Outro.Id), TempoRealGrupos.Fila(b.Instituicao.Id, terceiro.Id));
        await f.Sonda(g1);
        await f.Sonda(g2);
        await f.Sonda(g3);
        await c.Esperar(2);
        Assert.Equal([$"Sonda:{g1}", $"Sonda:{g2}"], (await c.Quieto()).Order().ToList());
    }

    [Fact]
    public async Task EntrarNaFila_recusa_quem_nao_e_atendente()
    {
        var b = await Balcao.Criar(f);
        var admin = await f.Usuario(b.Instituicao, [Papeis.Administrador]);
        foreach (var quem in new[] { b.Aluno.Usuario, admin })
        {
            await using var c = await f.Abrir(b.Instituicao, quem);
            Assert.Equal(SoAtendentes, await c.Recusa(c.EntrarNaFila));
            await f.Sonda(TempoRealGrupos.Fila(b.Instituicao.Id, b.Triagem.Id));
            Assert.Empty(await c.Quieto());
        }
    }

    [Fact]
    public async Task Sessao_invalida_nos_tres_metodos()
    {
        var metodos = new (string nome, Func<Conectado, Task> chamar)[]
        {
            ("EntrarNoChamado", c => c.Entrar("ONE-1")),
            ("SairDoChamado", c => c.Sair("ONE-1")),
            ("EntrarNaFila", c => c.EntrarNaFila()),
        };
        foreach (var (nome, chamar) in metodos)
            foreach (var instituicaoInativa in new[] { false, true })
            {
                var b = await Balcao.Criar(f);
                await using var c = await f.Abrir(b.Instituicao, b.A.Usuario);
                if (instituicaoInativa) await f.Db(null, db => db.Instituicoes.Where(i => i.Id == b.Instituicao.Id).ExecuteUpdateAsync(s => s.SetProperty(i => i.Ativa, false)));
                else await f.Desativar(b.Instituicao, b.A.Usuario);
                Assert.True(Invalida == await c.Recusa(() => chamar(c)), $"{nome}, instituição inativa: {instituicaoInativa}");
            }

        var aluno = await f.AlunoLogado();
        await using var ca = await f.Abrir(aluno.Instituicao, aluno.Usuario);
        await f.Desativar(aluno.Instituicao, aluno.Usuario);
        Assert.Equal(Invalida, await ca.Recusa(() => ca.Entrar("ONE-999")));
        Assert.Equal(Invalida, await ca.Recusa(ca.EntrarNaFila));
    }

    [Fact]
    public async Task Papel_e_setor_sao_relidos_a_cada_chamada()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        await using var ca = await f.Abrir(b.Instituicao, b.A.Usuario);
        await using var cb = await f.Abrir(b.Instituicao, b.B.Usuario);
        await f.Db(b.Instituicao.Id, db => db.UsuarioPapeis.Where(p => p.UsuarioId == b.A.Usuario.Id && p.Papel == Papeis.Atendente).ExecuteDeleteAsync());
        await f.Db(b.Instituicao.Id, db => db.AtendenteSetores.Where(s => s.UsuarioId == b.B.Usuario.Id).ExecuteDeleteAsync());

        Assert.Equal(SoAtendentes, await ca.Recusa(ca.EntrarNaFila));
        Assert.Equal(NaoEncontrado, await cb.Recusa(() => cb.Entrar(numero)));
    }

    [Fact]
    public async Task SairDoChamado_tira_a_conexao_do_grupo()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        await using var aluno = await f.Abrir(b.Instituicao, b.Aluno.Usuario);
        await aluno.Entrar(numero);
        var grupo = TempoRealGrupos.Chamado(b.Instituicao.Id, numero);
        await f.Sonda(grupo);
        Assert.Equal([$"Sonda:{grupo}"], await aluno.Esperar(1));

        await aluno.Sair(numero);
        await f.Sonda(grupo);
        Assert.Equal([$"Sonda:{grupo}"], await aluno.Quieto());
    }

    [Fact]
    public async Task Metodos_do_hub_nao_devolvem_evento_ao_chamador()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        await using var atendente = await f.Abrir(b.Instituicao, b.A.Usuario);
        await atendente.Entrar(numero);
        await atendente.EntrarNaFila();
        await atendente.Sair(numero);
        Assert.Empty(await atendente.Quieto());
    }
}
