using System.Net;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class MoodleLancamentoTests(OneFactory f) : IClassFixture<OneFactory>
{
    async Task<Instituicao> Univag()
    {
        var i = await f.Instituicao();
        await f.PlataformaMoodle(i);
        return i;
    }

    Task Vincular(Instituicao i, Usuario u, string sub) =>
        f.Db(i.Id, async db =>
        {
            db.VinculosMoodle.Add(VinculoMoodle.Criar(u.Id, MoodleFalso.Emissor, sub, f.Relogio.GetUtcNow().UtcDateTime));
            await db.SaveChangesAsync();
        });

    async Task<HttpResponseMessage> Entrar(Instituicao i, string sub, string? username, HttpClient? c = null, Action<Dictionary<string, object?>>? ajustar = null,
        bool outraChave = false, bool simetrica = false)
    {
        var (state, nonce) = await f.NovoLancamento(i);
        var corpo = f.Moodle.Corpo(nonce, f.Relogio.GetUtcNow(), sub, username);
        ajustar?.Invoke(corpo);
        var token = simetrica ? f.Moodle.AssinarHs256(corpo) : f.Moodle.Assinar(corpo, outraChave);
        return await (c ?? f.Cliente()).Lancar(i.Slug, token, state);
    }

    static void SemSessao(HttpResponseMessage r) => Assert.Equal("", r.Sessao());

    [Fact]
    public async Task Token_valido_de_aluno_vinculado_abre_a_sessao()
    {
        var i = await Univag();
        var u = await f.Usuario(i, [Papeis.Aluno]);
        await Vincular(i, u, "42");
        var c = f.Cliente();

        var r = await Entrar(i, "42", null, c);

        Assert.Equal(HttpStatusCode.Redirect, r.StatusCode);
        Assert.Equal($"/{i.Slug}", r.Destino());
        Assert.StartsWith("one.auth=", r.Sessao());
        var eu = await c.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, eu.StatusCode);
        Assert.Equal(u.Id, (await eu.Json()).GetProperty("id").GetInt64());
        var l = Assert.Single(await f.Db(i.Id, db => db.LtiLancamentos.AsNoTracking().ToListAsync()));
        Assert.NotNull(l.UsadoEm);
    }

    [Theory]
    [InlineData("assinatura")]
    [InlineData("iss")]
    [InlineData("aud")]
    [InlineData("exp-61s")]
    [InlineData("nonce")]
    [InlineData("deployment_id")]
    [InlineData("message_type")]
    [InlineData("version")]
    [InlineData("chaves-fora")]
    [InlineData("sub-vazio")]
    [InlineData("alg-hs256")]
    public async Task Token_invalido_400(string caso)
    {
        var i = await Univag();
        var u = await f.Usuario(i, [Papeis.Aluno]);
        await Vincular(i, u, "42");
        var agora = f.Relogio.GetUtcNow();
        f.Moodle.JwksFora = caso == "chaves-fora";
        try
        {
            var r = await Entrar(i, "42", null, ajustar: d =>
            {
                switch (caso)
                {
                    case "iss": d["iss"] = "https://outro.teste"; break;
                    case "aud": d["aud"] = "outro-cliente"; break;
                    case "exp-61s": d["exp"] = agora.AddSeconds(-61).ToUnixTimeSeconds(); break;
                    case "nonce": d["nonce"] = "outro-nonce"; break;
                    case "deployment_id": d[MoodleFalso.Lti + "deployment_id"] = "99"; break;
                    case "message_type": d[MoodleFalso.Lti + "message_type"] = "LtiDeepLinkingRequest"; break;
                    case "version": d[MoodleFalso.Lti + "version"] = "1.2.0"; break;
                    case "sub-vazio": d["sub"] = ""; break;
                }
            }, outraChave: caso == "assinatura", simetrica: caso == "alg-hs256");

            Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
            SemSessao(r);
        }
        finally { f.Moodle.JwksFora = false; }
    }

    [Theory]
    [InlineData("inativa")]
    [InlineData("sem-plataforma")]
    public async Task Lancamento_sem_plataforma_ativa_400(string caso)
    {
        var i = await f.Instituicao();
        if (caso == "inativa") await f.PlataformaMoodle(i, ativa: false);
        var u = await f.Usuario(i, [Papeis.Aluno]);
        await Vincular(i, u, "42");

        var r = await Entrar(i, "42", null);

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        SemSessao(r);
    }

    [Fact]
    public async Task Token_vencido_ha_59s_ainda_vale()
    {
        var i = await Univag();
        var u = await f.Usuario(i, [Papeis.Aluno]);
        await Vincular(i, u, "42");
        var agora = f.Relogio.GetUtcNow();

        var r = await Entrar(i, "42", null, ajustar: d => d["exp"] = agora.AddSeconds(-59).ToUnixTimeSeconds());

        Assert.Equal(HttpStatusCode.Redirect, r.StatusCode);
        Assert.StartsWith("one.auth=", r.Sessao());
    }

    [Theory]
    [InlineData("inexistente")]
    [InlineData("expirado")]
    [InlineData("usado")]
    public async Task State_invalido_400(string caso)
    {
        var i = await Univag();
        var u = await f.Usuario(i, [Papeis.Aluno]);
        await Vincular(i, u, "42");
        var (state, nonce) = caso == "expirado"
            ? await f.NovoLancamento(i, agora => agora - TimeSpan.FromMinutes(10) - TimeSpan.FromSeconds(1))
            : await f.NovoLancamento(i);
        if (caso == "usado")
            await f.Db(i.Id, db => db.LtiLancamentos.Where(x => x.State == state).ExecuteUpdateAsync(s => s.SetProperty(x => x.UsadoEm, f.Relogio.GetUtcNow().UtcDateTime)));
        var token = f.Moodle.Assinar(f.Moodle.Corpo(nonce, f.Relogio.GetUtcNow(), "42", null));

        var r = await f.Cliente().Lancar(i.Slug, token, caso == "inexistente" ? "estado-que-nao-existe" : state);

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        SemSessao(r);
    }

    [Fact]
    public async Task State_a_9min59s_ainda_entra()
    {
        var i = await Univag();
        var u = await f.Usuario(i, [Papeis.Aluno]);
        await Vincular(i, u, "42");
        var (state, nonce) = await f.NovoLancamento(i, agora => agora - TimeSpan.FromMinutes(9) - TimeSpan.FromSeconds(59));
        var token = f.Moodle.Assinar(f.Moodle.Corpo(nonce, f.Relogio.GetUtcNow(), "42", null));

        var r = await f.Cliente().Lancar(i.Slug, token, state);

        Assert.Equal(HttpStatusCode.Redirect, r.StatusCode);
        Assert.StartsWith("one.auth=", r.Sessao());
    }

    [Fact]
    public async Task Vinculo_existente_ignora_cpf_e_email_do_token()
    {
        var i = await Univag();
        var dono = await f.Usuario(i, [Papeis.Aluno]);
        var outro = await f.Usuario(i, [Papeis.Aluno]);
        await Vincular(i, dono, "42");
        var c = f.Cliente();

        var r = await Entrar(i, "42", outro.Cpf, c, d =>
        {
            d["email"] = outro.Email;
            d["name"] = outro.Nome;
        });

        Assert.Equal($"/{i.Slug}", r.Destino());
        Assert.Equal(dono.Id, (await (await c.GetAsync("/api/auth/me")).Json()).GetProperty("id").GetInt64());
        Assert.Single(await f.Vinculos(i));
    }

    [Fact]
    public async Task Primeiro_clique_vincula_pelo_cpf()
    {
        var i = await Univag();
        var u = await f.Usuario(i, [Papeis.Aluno]);
        var c = f.Cliente();

        var primeiro = await Entrar(i, "77", u.Cpf, c);

        Assert.Equal($"/{i.Slug}", primeiro.Destino());
        Assert.StartsWith("one.auth=", primeiro.Sessao());
        var v = Assert.Single(await f.Vinculos(i));
        Assert.Equal((u.Id, MoodleFalso.Emissor, "77"), (v.UsuarioId, v.Emissor, v.Sub));

        var segundo = await Entrar(i, "77", null);
        Assert.Equal($"/{i.Slug}", segundo.Destino());
        Assert.StartsWith("one.auth=", segundo.Sessao());
        Assert.Single(await f.Vinculos(i));
    }

    [Theory]
    [InlineData("cpf-de-ninguem")]
    [InlineData("abc")]
    [InlineData("sem-claim")]
    public async Task Sem_cadastro_redireciona_com_motivo(string caso)
    {
        var i = await Univag();
        var username = caso switch { "cpf-de-ninguem" => Semente.NovoCpf(), "abc" => "abc", _ => null };

        var r = await Entrar(i, "55", username);

        Assert.Equal($"/{i.Slug}?moodle=sem-cadastro", r.Destino());
        SemSessao(r);
        Assert.Empty(await f.Vinculos(i));
    }

    [Theory]
    [InlineData("vinculado")]
    [InlineData("pelo-cpf")]
    public async Task Usuario_inativo_redireciona_com_motivo(string caso)
    {
        var i = await Univag();
        var u = await f.Usuario(i, [Papeis.Aluno]);
        if (caso == "vinculado") await Vincular(i, u, "42");
        await f.Db(i.Id, db => db.Usuarios.Where(x => x.Id == u.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Ativo, false)));
        var antes = (await f.Vinculos(i)).Count;

        var r = await Entrar(i, "42", u.Cpf);

        Assert.Equal($"/{i.Slug}?moodle=inativo", r.Destino());
        SemSessao(r);
        Assert.Equal(antes, (await f.Vinculos(i)).Count);
    }

    public static TheoryData<string> PapeisDeEquipe() =>
    [
        Papeis.Atendente, $"{Papeis.Aluno},{Papeis.Atendente}", Papeis.Administrador, $"{Papeis.Aluno},{Papeis.Administrador}",
        Papeis.Operador, $"{Papeis.Aluno},{Papeis.Operador}",
    ];

    [Theory]
    [MemberData(nameof(PapeisDeEquipe))]
    public async Task Equipe_nao_entra_pelo_moodle(string papeis)
    {
        var i = await Univag();
        var u = await f.Usuario(i, papeis.Split(','));

        var r = await Entrar(i, "42", u.Cpf);

        Assert.Equal($"/{i.Slug}?moodle=use-senha", r.Destino());
        SemSessao(r);
        Assert.Empty(await f.Vinculos(i));
    }

    [Fact]
    public async Task Reenvio_do_mesmo_par_400()
    {
        var i = await Univag();
        var u = await f.Usuario(i, [Papeis.Aluno]);
        await Vincular(i, u, "42");
        var (state, nonce) = await f.NovoLancamento(i);
        var token = f.Moodle.Assinar(f.Moodle.Corpo(nonce, f.Relogio.GetUtcNow(), "42", null));

        var primeiro = await f.Cliente().Lancar(i.Slug, token, state);
        var segundo = await f.Cliente().Lancar(i.Slug, token, state);

        Assert.Equal(HttpStatusCode.Redirect, primeiro.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, segundo.StatusCode);
        SemSessao(segundo);
    }

    [Fact]
    public async Task Dois_envios_simultaneos_um_so_entra()
    {
        var i = await Univag();
        var u = await f.Usuario(i, [Papeis.Aluno]);
        await Vincular(i, u, "42");
        var (state, nonce) = await f.NovoLancamento(i);
        var token = f.Moodle.Assinar(f.Moodle.Corpo(nonce, f.Relogio.GetUtcNow(), "42", null));

        var respostas = await Task.WhenAll(Enumerable.Range(0, 2).Select(_ => f.Cliente().Lancar(i.Slug, token, state)));

        Assert.Equal([HttpStatusCode.Redirect, HttpStatusCode.BadRequest], respostas.Select(r => r.StatusCode).OrderBy(s => (int)s));
        Assert.Equal(1, respostas.Count(r => r.Sessao().StartsWith("one.auth=")));
    }
}
