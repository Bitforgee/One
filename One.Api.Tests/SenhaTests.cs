using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class SenhaTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Hash_e_pbkdf2_v3()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Aluno], senha: null);
        var (token, registro) = TokenAcesso.Criar(i.Slug, u.Id, f.Relogio.GetUtcNow().UtcDateTime);
        await f.Db(i.Id, db => { db.Tokens.Add(registro); return db.SaveChangesAsync(); });
        const string senha = "minha-senha-secreta";

        var r = await f.Cliente().PostAsJsonAsync("/api/auth/definir-senha", new { token, novaSenha = senha });

        Assert.Equal(HttpStatusCode.NoContent, r.StatusCode);
        var hash = await f.Db(i.Id, db => db.Usuarios.Where(x => x.Id == u.Id).Select(x => x.SenhaHash!).SingleAsync());
        Assert.Equal(0x01, Convert.FromBase64String(hash)[0]);
        Assert.DoesNotContain(senha, hash);
    }

    [Fact]
    public async Task Troca_valida_204()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Atendente], deveTrocarSenha: true);
        var c = await f.Entrar(i, u);

        var r = await c.PostAsJsonAsync("/api/auth/senha", new { senhaAtual = Semente.Senha, novaSenha = "12345678" });

        Assert.Equal(HttpStatusCode.NoContent, r.StatusCode);
        var login = await f.Cliente().Login(i.Slug, u.Cpf.Valor, "12345678");
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        Assert.False((await login.Json()).GetProperty("deveTrocarSenha").GetBoolean());
    }

    [Fact]
    public async Task Atual_errada_ou_nova_curta_400()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Aluno]);
        var c = await f.Entrar(i, u);

        var errada = await c.PostAsJsonAsync("/api/auth/senha", new { senhaAtual = "nao-e-essa", novaSenha = "12345678" });
        var curta = await c.PostAsJsonAsync("/api/auth/senha", new { senhaAtual = Semente.Senha, novaSenha = "1234567" });
        var longa = await c.PostAsJsonAsync("/api/auth/senha", new { senhaAtual = Semente.Senha, novaSenha = new string('s', 129) });

        Assert.Equal(HttpStatusCode.BadRequest, errada.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, curta.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, longa.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await f.Cliente().Login(i.Slug, u.Cpf.Valor, Semente.Senha)).StatusCode);
    }

    [Fact]
    public async Task Limites_7_8_128_129()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Aluno]);
        var c = await f.Entrar(i, u);
        Task<HttpResponseMessage> Trocar(string atual, string nova) => c.PostAsJsonAsync("/api/auth/senha", new { senhaAtual = atual, novaSenha = nova });
        var (oito, cento28) = (new string('8', 8), new string('x', 128));

        Assert.Equal(HttpStatusCode.BadRequest, (await Trocar(Semente.Senha, new string('7', 7))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Trocar(Semente.Senha, new string('9', 129))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Trocar(Semente.Senha, oito)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Trocar(oito, cento28)).StatusCode);

        var admin = await f.Entrar(i, await f.Usuario(i, [Papeis.Administrador]));
        Task<HttpResponseMessage> Cadastrar(string senha) => admin.PostAsJsonAsync("/api/admin/usuarios", new
        {
            cpf = Semente.NovoCpf(), nome = "Aluno Novo", email = $"{Guid.NewGuid():N}@univag.edu.br", senhaTemporaria = senha, papeis = new[] { Papeis.Aluno },
        });
        foreach (var recusada in new[] { new string('7', 7), new string('9', 129) })
        {
            var r = await Cadastrar(recusada);
            Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
            Assert.True((await r.Json()).GetProperty("errors").TryGetProperty("senhaTemporaria", out _));
        }
        Assert.Equal(HttpStatusCode.Created, (await Cadastrar(oito)).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await Cadastrar(cento28)).StatusCode);
    }
}
