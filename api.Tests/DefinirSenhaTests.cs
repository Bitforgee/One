using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class DefinirSenhaTests(OneFactory f) : IClassFixture<OneFactory>
{
    async Task<(Instituicao i, Usuario u, string token)> ComToken()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Aluno], senha: null);
        var (token, registro) = Tokens.Novo(i.Slug, u.Id, f.Relogio.GetUtcNow().UtcDateTime);
        await f.Db(i.Id, db => { db.Tokens.Add(registro); return db.SaveChangesAsync(); });
        return (i, u, token);
    }

    Task<TokenAcesso> Registro(Instituicao i, string token) => f.Db(i.Id, db => db.Tokens.SingleAsync(t => t.Hash == Tokens.Hash(token)));

    [Fact]
    public async Task Token_valido_204()
    {
        foreach (var senha in new[] { new string('a', 8), new string('b', 128) })
        {
            var (i, u, token) = await ComToken();

            var r = await f.Cliente().PostAsJsonAsync("/api/auth/definir-senha", new { token, novaSenha = senha });

            Assert.Equal(HttpStatusCode.NoContent, r.StatusCode);
            var hash = await f.Db(i.Id, db => db.Usuarios.Where(x => x.Id == u.Id).Select(x => x.SenhaHash).SingleAsync());
            Assert.Equal(PasswordVerificationResult.Success, new PasswordHasher<Usuario>().VerifyHashedPassword(u, hash!, senha));
            Assert.NotNull((await Registro(i, token)).UsadoEm);
        }
    }

    [Fact]
    public async Task Senha_fora_de_8_a_128_400()
    {
        foreach (var senha in new[] { new string('a', 7), new string('b', 129) })
        {
            var (i, u, token) = await ComToken();

            var r = await f.Cliente().PostAsJsonAsync("/api/auth/definir-senha", new { token, novaSenha = senha });

            Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
            Assert.Null((await Registro(i, token)).UsadoEm);
            Assert.Null(await f.Db(i.Id, db => db.Usuarios.Where(x => x.Id == u.Id).Select(x => x.SenhaHash).SingleAsync()));
        }
    }

    [Fact]
    public async Task Link_usado_vencido_ou_inexistente_400()
    {
        var (_, _, usado) = await ComToken();
        Assert.Equal(HttpStatusCode.NoContent, (await f.Cliente().PostAsJsonAsync("/api/auth/definir-senha", new { token = usado, novaSenha = "primeira-senha" })).StatusCode);
        var (iDesativado, uDesativado, deContaDesativada) = await ComToken();
        await f.Db(iDesativado.Id, db => db.Usuarios.Where(u => u.Id == uDesativado.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.Ativo, false)));
        var (iVencido, _, vencido) = await ComToken();
        f.Relogio.Advance(TimeSpan.FromMinutes(61));

        foreach (var token in new[] { usado, vencido, iVencido.Slug + ".nao-existe", "qualquer-coisa", deContaDesativada })
        {
            var r = await f.Cliente().PostAsJsonAsync("/api/auth/definir-senha", new { token, novaSenha = "outra-senha-boa" });
            Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
            Assert.Equal("Link inválido ou vencido.", (await r.Json()).GetProperty("detail").GetString());
        }
    }
}
