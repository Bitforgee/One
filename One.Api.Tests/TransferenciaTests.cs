using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class TransferenciaTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Transferir_201_aberto_sem_responsavel()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Devolver(c.RespostaBoletoValida());
        var (id, _) = await c.Primeira();

        var r = await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { });

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var j = await r.Json();
        Assert.Equal("ONE-1", j.GetProperty("numero").GetString());
        Assert.Equal("ABERTO", j.GetProperty("estado").GetString());
        Assert.Equal("Triagem", j.GetProperty("setor").GetString());
        var chamado = await f.Db(c.Instituicao.Id, db => db.Chamados.SingleAsync(x => x.ConversaId == id));
        Assert.Null(chamado.ResponsavelId);
        Assert.Equal("ABERTO", chamado.Estado);
        Assert.Equal("TRANSFERIDA", (await f.Db(c.Instituicao.Id, db => db.Conversas.SingleAsync(x => x.Id == id))).Desfecho);
    }

    [Fact]
    public async Task Atendimento_direto_sem_chamar_ia()
    {
        var aluno = await f.AlunoLogado();
        var chamadasAntes = f.Llm.Corpos.Count;

        foreach (var descricao in new[] { "x", new string('d', 2000) })
        {
            var r = await aluno.Cliente.PostAsJsonAsync("/api/atendimento-direto", new { descricao });
            Assert.Equal(HttpStatusCode.Created, r.StatusCode);
            var numero = (await r.Json()).GetProperty("numero").GetString();
            var (chamado, categoria, conversa) = await f.Db(aluno.Instituicao.Id, async db =>
            {
                var ch = await db.Chamados.SingleAsync(x => x.Numero == numero);
                return (ch, await db.Categorias.SingleAsync(x => x.Id == ch.CategoriaId), await db.Conversas.Include(x => x.Mensagens).SingleAsync(x => x.Id == ch.ConversaId));
            });
            Assert.Equal("Não classificado", categoria.Nome);
            Assert.Equal("PADRAO", chamado.OrigemCategoria);
            Assert.Equal(descricao, Assert.Single(conversa.Mensagens).Texto);
            Assert.Equal("TRANSFERIDA", conversa.Desfecho);
        }
        Assert.Equal(chamadasAntes, f.Llm.Corpos.Count);
    }

    [Fact]
    public async Task Atendimento_direto_sem_fluxo_na_triagem()
    {
        var aluno = await f.AlunoLogado();
        var i = aluno.Instituicao;
        var padrao = await f.Db(i.Id, db => db.Categorias.SingleAsync(c => c.Padrao));
        var financeiro = await f.Setor(i, "Financeiro");
        await f.Fluxo(i, padrao, null, null, SementeAtendimento.Etapa(DestinosEtapa.Setor, financeiro.Id));
        await f.Fluxo(i, await f.Categoria(i, "Boleto"), null, null, SementeAtendimento.Etapa(DestinosEtapa.LiderancaSemestre), SementeAtendimento.Etapa(DestinosEtapa.Setor, financeiro.Id));

        var r = await aluno.Cliente.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "Preciso de ajuda" });

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var j = await r.Json();
        Assert.Equal("Triagem", j.GetProperty("setor").GetString());
        var chamado = await f.Db(i.Id, db => db.Chamados.SingleAsync(c => c.Numero == j.GetProperty("numero").GetString()));
        Assert.Equal((null, null, null), (chamado.VersaoFluxoId, chamado.EtapaOrdem, chamado.EtapaDesde));
        Assert.Equal(await f.Db(i.Id, db => db.Setores.Where(s => s.Triagem).Select(s => s.Id).SingleAsync()), chamado.SetorId);
    }
    [Fact]
    public async Task Atendimento_direto_descricao_invalida_400()
    {
        var aluno = await f.AlunoLogado();

        foreach (var descricao in new[] { "", "   ", new string('d', 2001) })
            Assert.Equal(HttpStatusCode.BadRequest, (await aluno.Cliente.PostAsJsonAsync("/api/atendimento-direto", new { descricao })).StatusCode);

        Assert.Equal(0, await f.Db(aluno.Instituicao.Id, db => db.Conversas.CountAsync()));
        Assert.Equal(0, await f.Db(aluno.Instituicao.Id, db => db.Chamados.CountAsync()));
    }

    [Fact]
    public async Task Atendimento_direto_sem_papel_aluno_403()
    {
        var i = await f.Instituicao();
        var atendente = await f.Atendente(i, await f.Db(i.Id, db => db.Setores.SingleAsync()));

        var r = await atendente.Cliente.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "oi" });

        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
        Assert.Equal(0, await f.Db(i.Id, db => db.Chamados.CountAsync()));
    }

    [Fact]
    public async Task Chamado_guarda_contexto()
    {
        var c = await Cenario.Criar(f);
        var primeira = new string('p', 121);
        f.Llm.Devolver(new { tipo = "pergunta", texto = "É o boleto deste semestre?", resumo = "resumo antigo" });
        var (id, _) = await c.Primeira(primeira);
        f.Llm.Devolver(new { tipo = "sem_base", texto = "", resumo = new string('r', 600) });
        await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "sim" });
        f.Llm.Devolver(new { tipo = "sem_base", texto = "", resumo = "" });
        await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "e agora?" });

        var numero = (await (await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { })).Json()).GetProperty("numero").GetString();
        await f.Db(c.Instituicao.Id, db => db.Matriculas.Where(m => m.UsuarioId == c.Aluno.Usuario.Id).ExecuteUpdateAsync(s => s.SetProperty(m => m.Semestre, 4)));

        var chamado = await f.Db(c.Instituicao.Id, db => db.Chamados.SingleAsync(x => x.Numero == numero));
        var matricula = await f.Db(c.Instituicao.Id, db => db.Matriculas.SingleAsync(m => m.UsuarioId == c.Aluno.Usuario.Id));
        Assert.Equal(c.Aluno.Usuario.Id, chamado.SolicitanteId);
        Assert.Equal(matricula.Id, chamado.MatriculaId);
        Assert.Equal(3, chamado.Semestre);
        Assert.Equal(primeira[..120], chamado.Titulo);
        Assert.Equal(id, chamado.ConversaId);
        Assert.Equal(new string('r', 500), chamado.Resumo);
    }

    [Fact]
    public async Task Duas_matriculas_sem_escolha_400()
    {
        var i = await f.Instituicao();
        var aluno = await f.AlunoLogado(i);
        var outro = await f.Usuario(i, [Papeis.Aluno]);
        var (segunda, inativa, alheia) = await f.Db(i.Id, async db =>
        {
            var curso = await db.Cursos.FirstAsync();
            var m2 = new Matricula { UsuarioId = aluno.Usuario.Id, CursoId = curso.Id, Numero = "2000000002", Semestre = 1 };
            var m3 = new Matricula { UsuarioId = aluno.Usuario.Id, CursoId = curso.Id, Numero = "2000000003", Semestre = 1, Situacao = "INATIVA" };
            db.Matriculas.AddRange(m2, m3);
            await db.SaveChangesAsync();
            return (m2.Id, m3.Id, await db.Matriculas.Where(m => m.UsuarioId == outro.Id).Select(m => m.Id).SingleAsync());
        });
        var id = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "oi" })).Json()).GetProperty("conversaId").GetInt64();

        foreach (var corpo in new object[] { new { }, new { matriculaId = inativa }, new { matriculaId = alheia }, new { matriculaId = 999999 } })
        {
            var r = await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", corpo);
            Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        }
        Assert.Equal(HttpStatusCode.BadRequest, (await aluno.Cliente.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "oi" })).StatusCode);
        Assert.Equal(0, await f.Db(i.Id, db => db.Chamados.CountAsync()));
        Assert.Null((await f.Db(i.Id, db => db.Conversas.SingleAsync(x => x.Id == id))).Desfecho);

        var ok = await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { matriculaId = segunda });
        Assert.Equal(HttpStatusCode.Created, ok.StatusCode);
        Assert.Equal(segunda, (await f.Db(i.Id, db => db.Chamados.SingleAsync())).MatriculaId);
    }

    [Fact]
    public async Task Transferencia_dupla_um_chamado_e_409()
    {
        var aluno = await f.AlunoLogado();
        var id = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "oi" })).Json()).GetProperty("conversaId").GetInt64();

        var respostas = await Task.WhenAll(Enumerable.Range(0, 2).Select(_ => aluno.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { })));

        Assert.Equal([HttpStatusCode.Created, HttpStatusCode.Conflict], respostas.Select(r => r.StatusCode).Order());
        Assert.Equal(1, await f.Db(aluno.Instituicao.Id, db => db.Chamados.CountAsync(c => c.ConversaId == id)));
    }
}

public class NumeracaoTests(OneFactory f) : IClassFixture<OneFactory>
{
    static async Task<string> Direto(Aluno a) =>
        (await (await a.Cliente.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "oi" })).Json()).GetProperty("numero").GetString()!;

    [Fact]
    public async Task Numero_por_instituicao()
    {
        var univag = await f.AlunoLogado(await f.Instituicao());
        var demo = await f.AlunoLogado(await f.Instituicao());

        Assert.Equal("ONE-1", await Direto(univag));
        Assert.Equal("ONE-2", await Direto(univag));
        Assert.Equal("ONE-1", await Direto(demo));
    }

    [Fact]
    public async Task Vinte_transferencias_paralelas_numeros_distintos()
    {
        var aluno = await f.AlunoLogado();

        var numeros = await Task.WhenAll(Enumerable.Range(0, 20).Select(_ => Direto(aluno)));

        Assert.Equal(Enumerable.Range(1, 20).Select(n => $"ONE-{n}").Order(), numeros.Order());
    }
}

public class CategoriaOrigemTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Origem_da_categoria()
    {
        var c = await Cenario.Criar(f);
        var financeiro = await f.Categoria(c.Instituicao, "Financeiro");
        var inativa = await f.Categoria(c.Instituicao, "Antiga", ativa: false);
        var secretaria = await f.Categoria(c.Instituicao, "Secretaria");
        var declaracao = await f.Artigo(c.Instituicao, "Declaração de matrícula", "A declaração de matrícula é emitida pelo Portal do Aluno, no menu Documentos.", categoriaId: secretaria.Id);
        const string trecho = "emitida pelo Portal do Aluno, no menu Documentos";
        var boleto2 = await f.Artigo(c.Instituicao, "Boleto do financeiro", Cenario.RespostaBoleto, categoriaId: financeiro.Id);

        object Cita(Artigo a, string t, long? categoriaId = null) => new { tipo = "resposta", texto = "Peça pelo portal.", fonteIds = new[] { Semente.Fonte(a.Id) }, trechos = new[] { new { fonteId = Semente.Fonte(a.Id), texto = t } }, categoriaId };

        var casos = new (object[] saidas, string categoria, string origem)[]
        {
            ([new { tipo = "pergunta", texto = "É o boleto deste semestre?", categoriaId = financeiro.Id }], "Financeiro", "IA"),
            ([new { tipo = "pergunta", texto = "É o boleto?", categoriaId = financeiro.Id }, new { tipo = "pergunta", texto = "É a declaração?", categoriaId = secretaria.Id }, new { tipo = "sem_base", texto = "", categoriaId = inativa.Id }], "Secretaria", "IA"),
            ([Cita(declaracao, trecho, inativa.Id)], "Secretaria", "ARTIGO"),
            ([Cita(c.Boleto, Cenario.TrechoBoleto), Cita(declaracao, trecho)], "Secretaria", "ARTIGO"),
            ([Cita(declaracao, trecho), Cita(boleto2, Cenario.TrechoBoleto)], "Financeiro", "ARTIGO"),
            ([new { tipo = "sem_base", texto = "" }], "Não classificado", "PADRAO"),
        };
        foreach (var (saidas, categoria, origem) in casos)
        {
            f.Llm.Devolver(saidas[0]);
            var (id, _) = await c.Primeira("preciso de um documento");
            foreach (var saida in saidas.Skip(1))
            {
                f.Llm.Devolver(saida);
                Assert.Equal(HttpStatusCode.OK, (await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "mais detalhes" })).StatusCode);
            }
            Assert.Equal(HttpStatusCode.Created, (await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { })).StatusCode);

            var (ch, atual, original) = await f.Db(c.Instituicao.Id, async db =>
            {
                var x = await db.Chamados.SingleAsync(x => x.ConversaId == id);
                return (x, await db.Categorias.SingleAsync(k => k.Id == x.CategoriaId), await db.Categorias.SingleAsync(k => k.Id == x.CategoriaOriginalId));
            });
            Assert.Equal(categoria, atual.Nome);
            Assert.Equal(categoria, original.Nome);
            Assert.Equal(origem, ch.OrigemCategoria);
        }
    }
}

public class RoteamentoTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Setor_do_chamado()
    {
        var i = await f.Instituicao();
        var aluno = await f.AlunoLogado(i);
        var financeiro = await f.Setor(i, "Financeiro");
        var coordAds = await f.Setor(i, "Coordenação ADS");
        var (boleto, notas, outros, semCoord) = (await f.Categoria(i, "Boleto"), await f.Categoria(i, "Notas"), await f.Categoria(i, "Outros"), await f.Categoria(i, "Estágio"));
        var naoClassificado = await f.Db(i.Id, db => db.Categorias.SingleAsync(c => c.Padrao));
        await f.Regra(i, boleto, financeiro);
        await f.Regra(i, notas, null);
        await f.Regra(i, semCoord, null);

        async Task<string> Transferir(Categoria categoria, bool cursoComCoordenacao)
        {
            await f.Db(i.Id, db => db.Cursos.ExecuteUpdateAsync(s => s.SetProperty(c => c.SetorCoordenacaoId, cursoComCoordenacao ? coordAds.Id : null)));
            f.Llm.Devolver(new { tipo = "pergunta", texto = "Pode detalhar?", categoriaId = categoria.Id });
            var id = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "oi" })).Json()).GetProperty("conversaId").GetInt64();
            return (await (await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { })).Json()).GetProperty("setor").GetString()!;
        }

        Assert.Equal("Financeiro", await Transferir(boleto, true));
        Assert.Equal("Coordenação ADS", await Transferir(notas, true));
        Assert.Equal("Triagem", await Transferir(outros, true));
        Assert.Equal("Triagem", await Transferir(naoClassificado, true));
        Assert.Equal("Triagem", await Transferir(semCoord, false));
    }
}
