using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class PrimeiroAcessoTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string Mensagem = "Se o CPF estiver cadastrado, enviamos um link para o e-mail registrado na instituição.";

    public static async Task<JsonElement?> EmailNoMailpit(string para)
    {
        using var http = new HttpClient { BaseAddress = new Uri("http://localhost:8025") };
        for (var tentativa = 0; tentativa < 20; tentativa++)
        {
            var busca = JsonDocument.Parse(await http.GetStringAsync($"/api/v1/search?query={Uri.EscapeDataString($"to:\"{para}\"")}")).RootElement;
            var mensagens = busca.GetProperty("messages");
            if (mensagens.GetArrayLength() > 0)
                return JsonDocument.Parse(await http.GetStringAsync($"/api/v1/message/{mensagens[0].GetProperty("ID").GetString()}")).RootElement;
            await Task.Delay(250);
        }
        return null;
    }

    [Fact]
    public async Task Resposta_202_igual_com_ou_sem_cpf()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Aluno], senha: null);

        foreach (var cpf in new[] { u.Cpf, Semente.NovoCpf() })
        {
            var r = await f.Cliente().PostAsJsonAsync("/api/auth/primeiro-acesso", new { instituicao = i.Slug, cpf });
            Assert.Equal(HttpStatusCode.Accepted, r.StatusCode);
            Assert.Equal(Mensagem, (await r.Json()).GetProperty("mensagem").GetString());
        }
    }

    [Fact]
    public async Task Cpf_invalido_400()
    {
        var i = await f.Instituicao();
        var cpf = Semente.NovoCpf();
        var dvErrado = cpf[..10] + (char)('0' + (cpf[10] - '0' + 1) % 10);

        var r = await f.Cliente().PostAsJsonAsync("/api/auth/primeiro-acesso", new { instituicao = i.Slug, cpf = dvErrado });

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Equal("CPF inválido.", (await r.Json()).GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Envia_link_e_guarda_so_o_hash()
    {
        var i = await f.Instituicao(nome: "Univag");
        var email = $"aluno-{Guid.NewGuid():N}@teste.one";
        var u = await f.Usuario(i, [Papeis.Aluno], senha: null, email: email);

        var r = await f.Cliente().PostAsJsonAsync("/api/auth/primeiro-acesso", new { instituicao = i.Slug, cpf = u.Cpf });

        Assert.Equal(HttpStatusCode.Accepted, r.StatusCode);
        var msg = await EmailNoMailpit(email);
        Assert.NotNull(msg);
        Assert.Equal("[Univag] Crie sua senha", msg.Value.GetProperty("Subject").GetString());
        var texto = msg.Value.GetProperty("Text").GetString()!;
        var link = Regex.Match(texto, $@"http://localhost:8080/{i.Slug}/definir-senha\?token=(\S+)");
        Assert.True(link.Success, texto);
        var token = link.Groups[1].Value;

        var registro = await f.Db(i.Id, db => db.Tokens.SingleAsync(t => t.UsuarioId == u.Id));
        Assert.Equal(Tokens.Hash(token), registro.Hash);
        Assert.DoesNotContain(token, registro.Hash);
        Assert.Equal(registro.CriadoEm.AddMinutes(60), registro.ExpiraEm);
        Assert.Equal(f.Relogio.GetUtcNow().UtcDateTime, registro.CriadoEm);
    }

    [Fact]
    public async Task Nao_usa_email_saida()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Aluno], senha: null);

        var r = await f.Cliente().PostAsJsonAsync("/api/auth/primeiro-acesso", new { instituicao = i.Slug, cpf = u.Cpf });

        Assert.Equal(HttpStatusCode.Accepted, r.StatusCode);
        Assert.NotNull(await EmailNoMailpit(u.Email));
        Assert.Equal(0, await f.Db(null, db => db.EmailsSaida.IgnoreQueryFilters().CountAsync()));
    }

    [Fact]
    public async Task Smtp_fora_202_e_log()
    {
        await using var fora = new OneFactorySmtpFora();
        await fora.InitializeAsync();
        var i = await fora.Instituicao();
        var u = await fora.Usuario(i, [Papeis.Aluno], senha: null);

        var r = await fora.Cliente().PostAsJsonAsync("/api/auth/primeiro-acesso", new { instituicao = i.Slug, cpf = u.Cpf });

        Assert.Equal(HttpStatusCode.Accepted, r.StatusCode);
        Assert.Equal(Mensagem, (await r.Json()).GetProperty("mensagem").GetString());
        Assert.Contains(fora.Logs.Entradas, l => l.Nivel == LogLevel.Error && Equals(l.Campos.GetValueOrDefault("InstituicaoId"), i.Id));
    }

    [Fact]
    public async Task Smtp_fora_loga_na_categoria_Email()
    {
        await using var fora = new OneFactorySmtpFora();
        await fora.InitializeAsync();
        var i = await fora.Instituicao();
        var u = await fora.Usuario(i, [Papeis.Aluno], senha: null);

        var r = await fora.Cliente().PostAsJsonAsync("/api/auth/primeiro-acesso", new { instituicao = i.Slug, cpf = u.Cpf });

        Assert.Equal(HttpStatusCode.Accepted, r.StatusCode);
        var log = Assert.Single(fora.Logs.Entradas, l => l.Nivel == LogLevel.Error && Equals(l.Campos.GetValueOrDefault("InstituicaoId"), i.Id));
        Assert.Equal("One.Api.Email", log.Categoria);
    }
}
