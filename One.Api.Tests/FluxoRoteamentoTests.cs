using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Tests.Infra.SementeAtendimento;

namespace One.Api.Tests;

// fluxos-atendimento S1 (C3 a C8): a transferência escolhe o fluxo publicado mais específico e abre o chamado na primeira etapa que resolve.
public class FluxoRoteamentoTests(OneFactory f) : IClassFixture<OneFactory>
{
    record Mundo(Instituicao I, Curso Ads, Curso Direito, Categoria Duvida, Setor Financeiro, Setor Secretaria, Setor Biblioteca, Setor Triagem);

    async Task<Mundo> Montar()
    {
        var i = await f.Instituicao();
        var (ads, direito) = await f.Db(i.Id, async db =>
        {
            var a = new Curso { Nome = "ADS" };
            var d = new Curso { Nome = "Direito" };
            db.Cursos.AddRange(a, d);
            await db.SaveChangesAsync();
            return (a, d);
        });
        return new Mundo(i, ads, direito, await f.Categoria(i, "Dúvida"), await f.Setor(i, "Financeiro"), await f.Setor(i, "Secretaria"), await f.Setor(i, "Biblioteca"),
            await f.Db(i.Id, db => db.Setores.SingleAsync(s => s.Triagem)));
    }

    // Aluno com uma matrícula ativa no curso e semestre pedidos (a matrícula padrão da semente é movida).
    async Task<Aluno> AlunoDe(Mundo m, Curso curso, int semestre)
    {
        var aluno = await f.AlunoLogado(m.I);
        await f.Db(m.I.Id, db => db.Matriculas.Where(x => x.UsuarioId == aluno.Usuario.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.CursoId, curso.Id).SetProperty(x => x.Semestre, semestre)));
        return aluno;
    }

    async Task<(string Numero, string Setor)> Transferir(Aluno aluno, Categoria categoria, long? matriculaId = null)
    {
        f.Llm.Devolver(new { tipo = "pergunta", texto = "Pode detalhar?", categoriaId = categoria.Id });
        var id = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "preciso de ajuda" })).Json()).GetProperty("conversaId").GetInt64();
        var r = await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { matriculaId });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var j = await r.Json();
        return (j.GetProperty("numero").GetString()!, j.GetProperty("setor").GetString()!);
    }

    Task<Chamado> Ler(Mundo m, string numero) => f.Db(m.I.Id, db => db.Chamados.SingleAsync(c => c.Numero == numero));

    // C3
    [Fact]
    public async Task Fluxo_mais_especifico_vence()
    {
        var m = await Montar();
        await f.Fluxo(m.I, m.Duvida, null, null, Etapa(DestinosEtapa.Setor, m.Financeiro.Id));
        await f.Fluxo(m.I, m.Duvida, m.Ads.Id, null, Etapa(DestinosEtapa.Setor, m.Secretaria.Id));
        await f.Fluxo(m.I, m.Duvida, m.Ads.Id, 3, Etapa(DestinosEtapa.Setor, m.Biblioteca.Id));

        Assert.Equal("Biblioteca", (await Transferir(await AlunoDe(m, m.Ads, 3), m.Duvida)).Setor);
        Assert.Equal("Secretaria", (await Transferir(await AlunoDe(m, m.Ads, 5), m.Duvida)).Setor);
        Assert.Equal("Financeiro", (await Transferir(await AlunoDe(m, m.Direito, 3), m.Duvida)).Setor);
    }

    // C4
    [Fact]
    public async Task Chamado_guarda_versao_etapa_e_entrada()
    {
        var m = await Montar();
        var fluxo = await f.Fluxo(m.I, m.Duvida, null, null, Etapa(DestinosEtapa.Setor, m.Financeiro.Id), Etapa(DestinosEtapa.Setor, m.Secretaria.Id));
        var versao = await f.Db(m.I.Id, db => db.VersoesFluxo.SingleAsync(v => v.FluxoId == fluxo.Id));
        f.Relogio.SetUtcNow(new DateTimeOffset(2026, 11, 3, 9, 30, 0, TimeSpan.Zero));

        var (numero, setor) = await Transferir(await AlunoDe(m, m.Ads, 3), m.Duvida);

        var chamado = await Ler(m, numero);
        Assert.Equal("Financeiro", setor);
        Assert.Equal((versao.Id, 1, f.Relogio.GetUtcNow().UtcDateTime), (chamado.VersaoFluxoId, chamado.EtapaOrdem, chamado.EtapaDesde));
    }

    // C5
    [Fact]
    public async Task Fluxo_so_com_rascunho_e_ignorado()
    {
        var m = await Montar();
        await f.Fluxo(m.I, m.Duvida, null, null, Etapa(DestinosEtapa.Setor, m.Financeiro.Id));
        await f.Fluxo(m.I, m.Duvida, m.Ads.Id, 3, false, Etapa(DestinosEtapa.Setor, m.Biblioteca.Id));
        var dosCursos = await f.Db(m.I.Id, db => db.VersoesFluxo.Where(v => db.Fluxos.Any(x => x.Id == v.FluxoId && x.CursoId == null)).SingleAsync());

        var (numero, setor) = await Transferir(await AlunoDe(m, m.Ads, 3), m.Duvida);

        Assert.Equal("Financeiro", setor);
        Assert.Equal(dosCursos.Id, (await Ler(m, numero)).VersaoFluxoId);
    }

    // C6
    [Fact]
    public async Task Sem_fluxo_publicado_vai_para_a_triagem()
    {
        var m = await Montar();
        var padrao = await f.Db(m.I.Id, db => db.Categorias.SingleAsync(c => c.Padrao));
        var comRascunho = await f.Categoria(m.I, "Só rascunho");
        await f.Fluxo(m.I, comRascunho, null, null, false, Etapa(DestinosEtapa.Setor, m.Financeiro.Id));
        await f.Fluxo(m.I, padrao, null, null, Etapa(DestinosEtapa.Setor, m.Financeiro.Id)); // a categoria padrão nunca segue fluxo
        var aluno = await AlunoDe(m, m.Ads, 3);

        foreach (var categoria in new[] { m.Duvida, comRascunho, padrao })
        {
            var (numero, setor) = await Transferir(aluno, categoria);
            var chamado = await Ler(m, numero);
            Assert.Equal("Triagem", setor);
            Assert.Equal((null, null, null), (chamado.VersaoFluxoId, chamado.EtapaOrdem, chamado.EtapaDesde));
        }
    }

    // C7
    [Fact]
    public async Task Coordenacao_do_curso_da_matricula()
    {
        var m = await Montar();
        var (coordAds, coordDireito) = (await f.Setor(m.I, "Coordenação ADS"), await f.Setor(m.I, "Coordenação Direito"));
        await f.Db(m.I.Id, async db =>
        {
            await db.Cursos.Where(c => c.Id == m.Ads.Id).ExecuteUpdateAsync(s => s.SetProperty(c => c.SetorCoordenacaoId, coordAds.Id));
            await db.Cursos.Where(c => c.Id == m.Direito.Id).ExecuteUpdateAsync(s => s.SetProperty(c => c.SetorCoordenacaoId, coordDireito.Id));
        });
        await f.Fluxo(m.I, m.Duvida, null, null, Etapa(DestinosEtapa.CoordenacaoCurso));
        var aluno = await AlunoDe(m, m.Ads, 3);
        var daSegunda = await f.Db(m.I.Id, async db =>
        {
            var x = new Matricula { UsuarioId = aluno.Usuario.Id, CursoId = m.Direito.Id, Numero = "3000000001", Semestre = 2 };
            db.Matriculas.Add(x);
            await db.SaveChangesAsync();
            return x.Id;
        });

        var (numero, setor) = await Transferir(aluno, m.Duvida, daSegunda);

        Assert.Equal("Coordenação Direito", setor);
        Assert.Equal(1, (await Ler(m, numero)).EtapaOrdem);
    }

    // C8
    [Fact]
    public async Task Etapa_que_nao_resolve_passa_para_a_seguinte()
    {
        var m = await Montar();
        await f.Fluxo(m.I, m.Duvida, m.Ads.Id, null, Etapa(DestinosEtapa.CoordenacaoCurso), Etapa(DestinosEtapa.Setor, m.Secretaria.Id));
        var soCoordenacao = await f.Categoria(m.I, "Só coordenação");
        await f.Fluxo(m.I, soCoordenacao, m.Ads.Id, null, Etapa(DestinosEtapa.CoordenacaoCurso));
        var aluno = await AlunoDe(m, m.Ads, 3); // o curso não tem coordenação

        var (numero, setor) = await Transferir(aluno, m.Duvida);
        var (numeroSemSaida, setorSemSaida) = await Transferir(aluno, soCoordenacao);

        var chamado = await Ler(m, numero);
        Assert.Equal("Secretaria", setor);
        Assert.Equal(2, chamado.EtapaOrdem);
        var semSaida = await Ler(m, numeroSemSaida);
        Assert.Equal("Triagem", setorSemSaida);
        Assert.Equal((null, null), (semSaida.EtapaOrdem, semSaida.VersaoFluxoId));
    }
}
