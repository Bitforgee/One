using System.Data.Common;
using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Chamados;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.Chamados.EstadosChamado;

namespace One.Api.Tests;

public class DetalheChamadoTests(OneFactory f) : IClassFixture<OneFactory>
{
    sealed class ContadorDeConsultas : DbCommandInterceptor
    {
        int total;
        public int Total => total;

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            Interlocked.Increment(ref total);
            return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
        }
    }

    [Theory]
    [InlineData(PermissoesChamado.Aluno)]
    [InlineData(PermissoesChamado.Lider)]
    [InlineData(PermissoesChamado.Atendente)]
    public async Task Montar_faz_no_maximo_4_consultas(string papel)
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(EmAtendimento);
        Assert.True((await Balcao.Mensagem(b.A.Cliente, numero, "Aluno ligou.", "NOTA")).IsSuccessStatusCode);
        Assert.True((await Balcao.Mensagem(b.ClienteAluno, numero, "Segue o comprovante.")).IsSuccessStatusCode);
        var contador = new ContadorDeConsultas();
        using var escopo = f.Services.CreateScope();
        var opcoes = new DbContextOptionsBuilder<OneDb>(escopo.ServiceProvider.GetRequiredService<DbContextOptions<OneDb>>()).AddInterceptors(contador).Options;
        await using var db = new OneDb(opcoes) { InstituicaoAtual = b.Instituicao.Id };
        var chamado = await db.Chamados.SingleAsync(c => c.Numero == numero);
        var antes = contador.Total;

        var detalhe = await DetalheChamado.Montar(db, papel == PermissoesChamado.Aluno ? chamado.SolicitanteId : b.A.Usuario.Id, chamado, papel);

        Assert.Equal(numero, detalhe.Numero);
        Assert.True(contador.Total - antes <= 4, $"{papel}: {contador.Total - antes} consultas");
    }

    static async Task<int> Consultas(OneFactory f, string papel, bool comCitacao, bool comFluxo)
    {
        var c = await Cadeia.Criar(f);
        var outra = await f.Categoria(c.I, "Outra");
        var categoria = comFluxo ? c.Duvida : outra;
        var triagem = await f.Db(c.I.Id, db => db.Setores.SingleAsync(s => s.Triagem));
        var atendente = comFluxo ? c.A : await f.Atendente(c.I, triagem);
        string numero;
        if (comCitacao)
        {
            var artigo = await f.Artigo(c.I, "Como emitir o boleto do semestre", Cenario.RespostaBoleto, [Cenario.LinkBoleto, Cenario.LinkBiblioteca]);
            f.Llm.Devolver(new
            {
                tipo = "resposta",
                texto = "Você encontra o boleto no Portal do Aluno, na área financeira.",
                fonteIds = new[] { Semente.Fonte(artigo.Id) },
                trechos = new[] { new { fonteId = Semente.Fonte(artigo.Id), texto = Cenario.TrechoBoleto } },
                categoriaId = categoria.Id,
                resumo = "Aluno pergunta sobre o boleto.",
            });
            var conversa = (await (await c.Aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "preciso do boleto" })).Json()).GetProperty("conversaId").GetInt64();
            var r = await c.Aluno.Cliente.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { });
            Assert.Equal(HttpStatusCode.Created, r.StatusCode);
            numero = (await r.Json()).GetProperty("numero").GetString()!;
        }
        else numero = await c.Transferir(categoria: categoria);
        Assert.True((await atendente.Cliente.PostAsync($"/api/chamados/{numero}/assumir", null)).IsSuccessStatusCode);
        Assert.True((await Balcao.Mensagem(atendente.Cliente, numero, "Aluno ligou.", "NOTA")).IsSuccessStatusCode);
        Assert.True((await Balcao.Mensagem(c.Aluno.Cliente, numero, "Segue o comprovante.")).IsSuccessStatusCode);
        var chamado = await c.Ler(numero);
        Assert.Equal(comFluxo, chamado.VersaoFluxoId is not null);
        var contador = new ContadorDeConsultas();
        using var escopo = f.Services.CreateScope();
        var opcoes = new DbContextOptionsBuilder<OneDb>(escopo.ServiceProvider.GetRequiredService<DbContextOptions<OneDb>>()).AddInterceptors(contador).Options;
        await using var db = new OneDb(opcoes) { InstituicaoAtual = c.I.Id };
        var antes = contador.Total;

        var detalhe = await DetalheChamado.Montar(db, papel == PermissoesChamado.Aluno ? chamado.SolicitanteId : atendente.Usuario.Id, chamado, papel);

        Assert.Equal(numero, detalhe.Numero);
        Assert.Equal(comFluxo && papel != PermissoesChamado.Aluno, detalhe.Fluxo is not null);
        if (comCitacao && papel == PermissoesChamado.Atendente) Assert.Contains(detalhe.Transcricao.OfType<DetalheChamado.TranscricaoDaEquipe>(), m => m.Fontes is not null && m.Fontes.Any());
        return contador.Total - antes;
    }

    [Theory]
    [InlineData(PermissoesChamado.Aluno, false, false, 3)]
    [InlineData(PermissoesChamado.Aluno, true, false, 3)]
    [InlineData(PermissoesChamado.Aluno, false, true, 3)]
    [InlineData(PermissoesChamado.Aluno, true, true, 3)]
    [InlineData(PermissoesChamado.Lider, false, false, 3)]
    [InlineData(PermissoesChamado.Lider, true, false, 3)]
    [InlineData(PermissoesChamado.Lider, false, true, 5)]
    [InlineData(PermissoesChamado.Lider, true, true, 5)]
    [InlineData(PermissoesChamado.Atendente, false, false, 4)]
    [InlineData(PermissoesChamado.Atendente, true, false, 7)]
    [InlineData(PermissoesChamado.Atendente, false, true, 6)]
    [InlineData(PermissoesChamado.Atendente, true, true, 9)]
    public async Task Montar_consultas_por_cenario(string papel, bool comCitacao, bool comFluxo, int limite)
    {
        var consultas = await Consultas(f, papel, comCitacao, comFluxo);

        Assert.True(consultas <= limite, $"{papel} citacao={comCitacao} fluxo={comFluxo}: {consultas} consultas, limite {limite}");
    }
}