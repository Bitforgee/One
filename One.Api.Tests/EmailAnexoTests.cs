using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Npgsql;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

public class EmailTests(OneFactory f) : IClassFixture<OneFactory>
{
    Task<List<EmailSaida>> Emails(Balcao b) => f.Db(b.Instituicao.Id, db => db.EmailsSaida.Where(e => e.Destinatario == b.Aluno.Usuario.Email).OrderBy(e => e.Id).ToListAsync());

    [Fact]
    public async Task Resposta_publica_gera_email()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();

        await Balcao.Mensagem(b.A.Cliente, numero, "Vou verificar.");

        var e = Assert.Single(await Emails(b));
        Assert.Equal($"[Univag] {numero}: nova resposta", e.Assunto);
        Assert.Contains($"http://localhost:8080/{b.Instituicao.Slug}/chamados/{numero}", e.Corpo);
    }

    [Fact]
    public async Task Resolucao_gera_email()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(EmAtendimento);

        await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/resolver", new { texto = "Boleto reemitido no portal." });

        var e = (await Emails(b)).Last();
        Assert.Equal($"[Univag] {numero} foi resolvida", e.Assunto);
        Assert.Contains("Boleto reemitido no portal.", e.Corpo);
        Assert.Contains($"/{b.Instituicao.Slug}/chamados/{numero}", e.Corpo);
        Assert.Contains("confirmar ou rejeitar", e.Corpo);
    }

    [Fact]
    public async Task Nota_interna_nao_gera_email()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();

        Assert.Equal(HttpStatusCode.Created, (await Balcao.Mensagem(b.A.Cliente, numero, "só para a equipe", "NOTA")).StatusCode);

        Assert.Empty(await Emails(b));
    }

    [Fact]
    public async Task Email_na_transacao_da_acao()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        var chamadoId = (await b.Ler(numero)).Id;
        await using var con = new NpgsqlConnection(f.ConnectionString);
        await con.OpenAsync();
        await new NpgsqlCommand($"""
            CREATE FUNCTION falha_evento() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha simulada'; END $$;
            CREATE TRIGGER falha_evento BEFORE INSERT ON evento_chamado FOR EACH ROW WHEN (NEW.chamado_id = {chamadoId} AND NEW.tipo = 'RESPOSTA') EXECUTE FUNCTION falha_evento();
            """, con).ExecuteNonQueryAsync();
        HttpResponseMessage falhou;
        try { falhou = await Balcao.Mensagem(b.A.Cliente, numero, "Vou verificar."); }
        finally { await new NpgsqlCommand("DROP FUNCTION falha_evento CASCADE", con).ExecuteNonQueryAsync(); }

        Assert.Equal(HttpStatusCode.InternalServerError, falhou.StatusCode);
        Assert.Empty(await Emails(b));
        Assert.Equal(0, await f.Db(b.Instituicao.Id, db => db.MensagensChamado.CountAsync(m => m.ChamadoId == chamadoId)));

        await Balcao.Mensagem(b.A.Cliente, numero, "Vou verificar.");
        Assert.Null(Assert.Single(await Emails(b)).EnviadoEm);
        await f.Services.GetRequiredService<Agendador>().Executar();
        Assert.Equal(f.Relogio.GetUtcNow().UtcDateTime, Assert.Single(await Emails(b)).EnviadoEm);
        Assert.NotNull(await PrimeiroAcessoTests.EmailNoMailpit(b.Aluno.Usuario.Email));
    }
}

public class EmailFalhaTests : IAsyncLifetime
{
    readonly OneFactorySmtpFora f = new();
    public ValueTask InitializeAsync() => f.InitializeAsync();
    public ValueTask DisposeAsync() => f.DisposeAsync();

    [Fact]
    public async Task Retry_2_a_n_e_desiste_em_5()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        Assert.Equal(HttpStatusCode.Created, (await Balcao.Mensagem(b.A.Cliente, numero, "Vou verificar.")).StatusCode);
        var agendador = f.Services.GetRequiredService<Agendador>();
        Task<EmailSaida> Ler() => f.Db(b.Instituicao.Id, db => db.EmailsSaida.SingleAsync());

        for (var tentativa = 1; tentativa <= 5; tentativa++)
        {
            await agendador.Executar();
            var e = await Ler();
            var agora = f.Relogio.GetUtcNow().UtcDateTime;
            Assert.Equal((tentativa, agora.AddMinutes(Math.Pow(2, tentativa)), (DateTime?)null), (e.Tentativas, e.ProximaTentativa, e.EnviadoEm));
            Assert.Contains(f.Logs.Entradas, l => l.Nivel >= LogLevel.Warning && l.Campos.GetValueOrDefault("Tentativas") is int t && t == tentativa);
            f.Relogio.Advance(TimeSpan.FromMinutes(Math.Pow(2, tentativa)));
        }
        Assert.Contains(f.Logs.Entradas, l => l.Nivel == LogLevel.Error && l.Mensagem.StartsWith("Desistência"));

        f.Relogio.Advance(TimeSpan.FromHours(1));
        await agendador.Executar();
        Assert.Equal(5, (await Ler()).Tentativas);
        Assert.Equal(1, await f.Db(b.Instituicao.Id, db => db.MensagensChamado.CountAsync()));
    }
}

public class AnexoTests(OneFactory f) : IClassFixture<OneFactory>
{
    const int DezMb = 10 * 1024 * 1024;

    [Fact]
    public async Task Pdf_jpg_png_ate_10mb()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();

        var r = await Balcao.ComAnexos(b.ClienteAluno, numero, "Seguem os comprovantes.", "PUBLICA",
            ("boleto.pdf", Balcao.Arquivo(Balcao.Pdf, DezMb)), ("foto.jpg", Balcao.Arquivo(Balcao.Jpg, 2000)), ("tela.png", Balcao.Arquivo(Balcao.Png, 3000)));

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var mensagem = (await r.Json()).GetProperty("mensagens").EnumerateArray().Last();
        Assert.Equal([("boleto.pdf", "application/pdf", (long)DezMb), ("foto.jpg", "image/jpeg", 2000L), ("tela.png", "image/png", 3000L)],
            mensagem.GetProperty("anexos").EnumerateArray().Select(x => (x.GetProperty("nome").GetString(), x.GetProperty("tipo").GetString(), x.GetProperty("tamanho").GetInt64())));
    }

    [Fact]
    public async Task Download_devolve_os_mesmos_bytes()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        var png = Balcao.Arquivo(Balcao.Png, 5000);
        var r = await Balcao.ComAnexos(b.A.Cliente, numero, "Veja a tela.", "PUBLICA", ("tela.png", png));
        var id = (await r.Json()).GetProperty("mensagens").EnumerateArray().Last().GetProperty("anexos")[0].GetProperty("id").GetInt64();

        foreach (var c in new[] { b.ClienteAluno, b.B.Cliente })
        {
            var d = await c.GetAsync($"/api/anexos/{id}");
            Assert.Equal(HttpStatusCode.OK, d.StatusCode);
            Assert.Equal("image/png", d.Content.Headers.ContentType?.MediaType);
            Assert.Equal(png, await d.Content.ReadAsByteArrayAsync());
        }
        var chave = await f.Db(b.Instituicao.Id, db => db.Anexos.Where(x => x.Id == id).Select(x => x.Chave).SingleAsync());
        Assert.Equal(png, await f.Objeto(chave));
    }

    async Task<(Balcao b, string numero)> SemNovaMensagem(Func<Balcao, string, Task<HttpResponseMessage>> enviar, HttpStatusCode esperado)
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        var r = await enviar(b, numero);
        Assert.Equal(esperado, r.StatusCode);
        Assert.Equal(0, await f.Db(b.Instituicao.Id, db => db.MensagensChamado.CountAsync()));
        Assert.Equal(0, await f.Db(b.Instituicao.Id, db => db.Anexos.CountAsync()));
        return (b, numero);
    }

    [Fact]
    public Task Tipo_desconhecido_415() =>
        SemNovaMensagem((b, n) => Balcao.ComAnexos(b.ClienteAluno, n, "Segue", "PUBLICA", ("comprovante.pdf", Balcao.Arquivo(Balcao.Exe, 4000))), HttpStatusCode.UnsupportedMediaType);

    [Fact]
    public Task Acima_de_10mb_413() =>
        SemNovaMensagem((b, n) => Balcao.ComAnexos(b.ClienteAluno, n, "Segue", "PUBLICA", ("grande.pdf", Balcao.Arquivo(Balcao.Pdf, DezMb + 1))), HttpStatusCode.RequestEntityTooLarge);

    [Fact]
    public Task Anexo_em_nota_interna_400() =>
        SemNovaMensagem((b, n) => Balcao.ComAnexos(b.A.Cliente, n, "Nota", "NOTA", ("a.pdf", Balcao.Arquivo(Balcao.Pdf, 100))), HttpStatusCode.BadRequest);

    [Fact]
    public async Task Sem_acesso_404()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        var r = await Balcao.ComAnexos(b.ClienteAluno, numero, "Segue", "PUBLICA", ("a.pdf", Balcao.Arquivo(Balcao.Pdf, 100)));
        var id = (await r.Json()).GetProperty("mensagens").EnumerateArray().Last().GetProperty("anexos")[0].GetProperty("id").GetInt64();
        var outroAluno = await f.AlunoLogado(b.Instituicao);

        Assert.Equal(HttpStatusCode.NotFound, (await outroAluno.Cliente.GetAsync($"/api/anexos/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.Alheio.Cliente.GetAsync($"/api/anexos/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.ClienteAluno.GetAsync("/api/anexos/999999")).StatusCode);
    }
}

public class EmailAnexoTests(OneFactory f) : IClassFixture<OneFactory>
{
    const int DezMb = 10 * 1024 * 1024;

    [Fact]
    public async Task Anexo_413_e_415_pelo_helper()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();

        var grande = await Balcao.ComAnexos(b.ClienteAluno, numero, "Segue", "PUBLICA", ("grande.pdf", Balcao.Arquivo(Balcao.Pdf, DezMb + 1)));
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, grande.StatusCode);
        Assert.Equal("O arquivo grande.pdf passa de 10 MB.", (await grande.Json()).GetProperty("detail").GetString());

        var errado = await Balcao.ComAnexos(b.ClienteAluno, numero, "Segue", "PUBLICA", ("comprovante.pdf", Balcao.Arquivo(Balcao.Exe, 4000)));
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, errado.StatusCode);
        Assert.Equal("O arquivo comprovante.pdf não é PDF, JPG nem PNG.", (await errado.Json()).GetProperty("detail").GetString());

        Assert.Equal(HttpStatusCode.Created, (await Balcao.ComAnexos(b.ClienteAluno, numero, "Segue", "PUBLICA", ("limite.pdf", Balcao.Arquivo(Balcao.Pdf, DezMb)))).StatusCode);
    }
}
