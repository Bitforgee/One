using System.Net;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class LoginTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Login_valido_200_com_cookie()
    {
        var i = await f.Instituicao(nome: "Univag");
        var cpf = Semente.NovoCpf();
        var u = await f.Usuario(i, [Papeis.Aluno], cpf: cpf);
        var comMascara = $"{cpf[..3]}.{cpf[3..6]}.{cpf[6..9]}-{cpf[9..]}";

        var r = await f.Cliente().Login(i.Slug, comMascara);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Json();
        Assert.Equal(u.Id, j.GetProperty("id").GetInt64());
        Assert.Equal(u.Nome, j.GetProperty("nome").GetString());
        Assert.Equal([Papeis.Aluno], j.GetProperty("papeis").EnumerateArray().Select(p => p.GetString()));
        Assert.False(j.GetProperty("deveTrocarSenha").GetBoolean());
        Assert.Equal(i.Slug, j.GetProperty("instituicao").GetProperty("slug").GetString());
        Assert.Equal("Univag", j.GetProperty("instituicao").GetProperty("nome").GetString());

        var cookie = Assert.Single(r.Headers.GetValues("Set-Cookie"), c => c.StartsWith("one.auth="));
        Assert.Contains("httponly", cookie.ToLowerInvariant());
        Assert.Contains("secure", cookie.ToLowerInvariant());
        Assert.Contains("samesite=strict", cookie.ToLowerInvariant());
    }

    [Fact]
    public async Task Login_com_cpf_123_456_789_09()
    {
        var i = await f.Instituicao();
        await f.Usuario(i, [Papeis.Aluno], cpf: "12345678909");
        Assert.Equal(HttpStatusCode.OK, (await f.Cliente().Login(i.Slug, "123.456.789-09")).StatusCode);
    }

    [Fact]
    public async Task Cookie_expira_8h_deslizante()
    {
        var aluno = await f.AlunoLogado();

        f.Relogio.Advance(TimeSpan.FromHours(1));
        Assert.Equal(HttpStatusCode.OK, (await aluno.Cliente.GetAsync("/api/auth/me")).StatusCode);
        f.Relogio.Advance(TimeSpan.FromHours(7) + TimeSpan.FromMinutes(59));
        Assert.Equal(HttpStatusCode.OK, (await aluno.Cliente.GetAsync("/api/auth/me")).StatusCode);
        f.Relogio.Advance(TimeSpan.FromHours(7) + TimeSpan.FromMinutes(59));
        Assert.Equal(HttpStatusCode.OK, (await aluno.Cliente.GetAsync("/api/auth/me")).StatusCode);
        f.Relogio.Advance(TimeSpan.FromHours(8) + TimeSpan.FromMinutes(1));
        Assert.Equal(HttpStatusCode.Unauthorized, (await aluno.Cliente.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Cpf_invalido_400_sem_consultar_senha()
    {
        var i = await f.Instituicao();
        var cpf = Semente.NovoCpf();
        await f.Usuario(i, [Papeis.Aluno], cpf: cpf);
        var dvErrado = cpf[..10] + (char)('0' + (cpf[10] - '0' + 1) % 10);

        foreach (var invalido in new[] { cpf[..10], cpf + "1", dvErrado })
        {
            var antes = f.Hasher.Verificacoes;
            var r = await f.Cliente().Login(i.Slug, invalido);
            Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
            Assert.Equal("CPF inválido.", (await r.Json()).GetProperty("detail").GetString());
            Assert.Equal(antes, f.Hasher.Verificacoes);
        }

        var semSenha = f.Hasher.Verificacoes;
        var vazia = await f.Cliente().Login(i.Slug, cpf, "");
        Assert.Equal(HttpStatusCode.BadRequest, vazia.StatusCode);
        Assert.Equal("Informe a senha.", (await vazia.Json()).GetProperty("detail").GetString());
        Assert.Equal(semSenha, f.Hasher.Verificacoes);
    }

    [Fact]
    public async Task Tres_falhas_mesmo_401()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Aluno]);
        var inativa = await f.Instituicao();
        var daInativa = await f.Usuario(inativa, [Papeis.Aluno]);
        await f.Db(null, db => db.Instituicoes.Where(x => x.Id == inativa.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Ativa, false)));

        var respostas = new[]
        {
            await f.Cliente().Login("instituicao-inexistente", u.Cpf.Valor),
            await f.Cliente().Login(inativa.Slug, daInativa.Cpf.Valor),
            await f.Cliente().Login(i.Slug, Semente.NovoCpf()),
            await f.Cliente().Login(i.Slug, u.Cpf.Valor, "senha-errada-1"),
        };

        foreach (var r in respostas)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
            Assert.Equal("CPF ou senha inválidos.", (await r.Json()).GetProperty("detail").GetString());
        }
    }

    [Fact]
    public async Task Conta_desativada_ou_sem_senha_401_sem_cookie()
    {
        var i = await f.Instituicao();
        var desativada = await f.Usuario(i, [Papeis.Aluno]);
        await f.Db(i.Id, db => db.Usuarios.Where(u => u.Id == desativada.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.Ativo, false)));
        var semSenha = await f.Usuario(i, [Papeis.Aluno], senha: null);

        foreach (var cpf in new[] { desativada.Cpf.Valor, semSenha.Cpf.Valor })
        {
            var r = await f.Cliente().Login(i.Slug, cpf);
            Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
            Assert.Equal("CPF ou senha inválidos.", (await r.Json()).GetProperty("detail").GetString());
            Assert.False(r.Headers.Contains("Set-Cookie"));
        }
    }
}
