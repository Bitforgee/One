using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Chamados;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class LiderSemVazamentoTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string Periodo = "de=2026-11-01&ate=2026-11-08";

    record Mundo(Instituicao I, HttpClient Admin, long VersaoArtigo, long VersaoDocumento, Setor Comum, Setor Lideranca, Atendente Lider, Atendente DoComum, Atendente Misto, Atendente SemSetor);

    async Task<Mundo> Montar()
    {
        var (i, admin) = await Admin.Criar(f);
        var categoria = await f.Categoria(i, "Estágio");
        var artigo = await f.Artigo(i, "Estágio obrigatório", "São 300 horas.", categoriaId: categoria.Id);
        var versaoArtigo = await f.Db(i.Id, db => db.VersoesArtigo.Where(v => v.ArtigoId == artigo.Id).Select(v => v.Id).SingleAsync());
        var enviado = await admin.Subir("Regulamento de estagio", categoria.Id, Pdfs.Criar("A carga horaria minima do estagio e de 300 horas."));
        Assert.Equal(HttpStatusCode.Created, enviado.StatusCode);
        var documento = (await enviado.Json()).GetProperty("id").GetInt64();
        var versaoDocumento = await f.Db(i.Id, db => db.VersoesDocumento.Where(v => v.DocumentoId == documento).Select(v => v.Id).SingleAsync());
        var curso = await f.Db(i.Id, async db => { var c = Curso.Criar("ADS"); db.Cursos.Add(c); await db.SaveChangesAsync(); return c; });
        var comum = await f.Setor(i, "Financeiro");
        var lideranca = await f.Lideranca(i, curso, 3, "Líderes ADS 3º");
        return new Mundo(i, admin, versaoArtigo, versaoDocumento, comum, lideranca,
            await f.Atendente(i, lideranca), await f.Atendente(i, comum), await f.Atendente(i, lideranca, comum), await f.Atendente(i));
    }

    static async Task<string> Detalhe(HttpResponseMessage r) => (await r.Json()).GetProperty("detail").GetString()!;

    [Fact]
    public async Task Lider_nao_le_versao_de_artigo()
    {
        var m = await Montar();

        var r = await m.Lider.Cliente.GetAsync($"/api/artigos/versoes/{m.VersaoArtigo}");

        Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
        Assert.Equal("Versão de artigo não encontrada.", await Detalhe(r));
    }

    [Fact]
    public async Task Lider_nao_baixa_versao_de_documento()
    {
        var m = await Montar();

        var r = await m.Lider.Cliente.GetAsync($"/api/documentos/versoes/{m.VersaoDocumento}");

        Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
        Assert.Equal("Documento não encontrado.", await Detalhe(r));
    }

    [Fact]
    public async Task Lider_nao_consulta_indicadores()
    {
        var m = await Montar();

        var r = await m.Lider.Cliente.GetAsync($"/api/indicadores?{Periodo}");

        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
        Assert.Equal("Os indicadores não estão disponíveis para a liderança de turma.", await Detalhe(r));
    }

    [Fact]
    public async Task Quem_nao_e_so_lider_segue_como_hoje()
    {
        var m = await Montar();
        var perfis = new (string Nome, HttpClient Cliente)[] { ("administrador", m.Admin), ("setor comum", m.DoComum.Cliente), ("liderança e setor comum", m.Misto.Cliente), ("sem setor", m.SemSetor.Cliente) };

        foreach (var (nome, cliente) in perfis)
        {
            var artigo = await cliente.GetAsync($"/api/artigos/versoes/{m.VersaoArtigo}");
            Assert.True(artigo.StatusCode == HttpStatusCode.OK, $"{nome}: artigo {(int)artigo.StatusCode}");
            Assert.Equal("Estágio obrigatório", (await artigo.Json()).GetProperty("titulo").GetString());

            var documento = await cliente.GetAsync($"/api/documentos/versoes/{m.VersaoDocumento}");
            Assert.True(documento.StatusCode == HttpStatusCode.OK, $"{nome}: documento {(int)documento.StatusCode}");
            Assert.Equal("application/pdf", documento.Content.Headers.ContentType?.MediaType);

            var indicadores = await cliente.GetAsync($"/api/indicadores?{Periodo}");
            Assert.True(indicadores.StatusCode == HttpStatusCode.OK, $"{nome}: indicadores {(int)indicadores.StatusCode}");
            Assert.True((await indicadores.Json()).TryGetProperty("chamadosAbertos", out _), nome);
        }
    }

    [Fact]
    public async Task Lider_entra_na_fila_do_proprio_setor()
    {
        var m = await Montar();
        await using var c = await f.Abrir(m.I, m.Lider.Usuario);
        await c.EntrarNaFila();

        var (daLideranca, doComum) = (TempoRealGrupos.Fila(m.I.Id, m.Lideranca.Id), TempoRealGrupos.Fila(m.I.Id, m.Comum.Id));
        await f.Sonda(daLideranca);
        await f.Sonda(doComum);
        await c.Esperar(1);

        Assert.Equal([$"Sonda:{daLideranca}"], (await c.Quieto()).ToList());
    }

    [Fact]
    public async Task So_lideranca_por_caso()
    {
        var m = await Montar();
        var antigo = await f.Setor(m.I, "Antigo");
        await f.Db(m.I.Id, db => db.Setores.Where(s => s.Id == antigo.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Ativo, false)));
        var liderComAntigo = await f.Atendente(m.I, m.Lideranca, antigo);
        var admin = await f.Usuario(m.I, [Papeis.Administrador]);
        var administradorLider = await f.Usuario(m.I, [Papeis.Administrador, Papeis.Atendente]);
        await f.Db(m.I.Id, db => db.VincularSetores(administradorLider.Id, m.Lideranca.Id));

        var casos = new (string Nome, long Id, bool Esperado)[]
        {
            ("só liderança", m.Lider.Usuario.Id, true),
            ("liderança e setor comum ativo", m.Misto.Usuario.Id, false),
            ("liderança e setor comum desativado", liderComAntigo.Usuario.Id, true),
            ("só setor comum", m.DoComum.Usuario.Id, false),
            ("sem nenhum setor", m.SemSetor.Usuario.Id, false),
            ("administrador sem setor", admin.Id, false),
            ("administrador numa liderança", administradorLider.Id, false),
        };

        foreach (var (nome, id, esperado) in casos)
            Assert.True(esperado == await f.Db(m.I.Id, async db => await db.SoLideranca(await db.Usuarios.Include(u => u.Papeis).SingleAsync(u => u.Id == id))), nome);
    }

    [Fact]
    public async Task Lider_segue_vendo_a_fila_da_turma()
    {
        var t = await Turma.Criar(f);
        var numero = await t.NaLideranca();

        var r = await t.Lider!.Cliente.GetAsync("/api/chamados?escopo=fila");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var itens = (await r.Json()).EnumerateArray().Select(x => x.GetProperty("numero").GetString()).ToList();
        Assert.Equal([numero], itens);
    }
}
