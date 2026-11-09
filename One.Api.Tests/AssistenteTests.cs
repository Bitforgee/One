using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using One.Api.Assistente;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class AssistenteTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string SemBase = "Não encontrei isso nas orientações da instituição. Posso transferir você para um atendente.";

    bool Logou(long conversaId, string motivo) =>
        f.Logs.Entradas.Any(l => l.Nivel == LogLevel.Warning && Equals(l.Campos.GetValueOrDefault("ConversaId"), conversaId) && Equals(l.Campos.GetValueOrDefault("Motivo"), motivo));

    [Fact]
    public async Task Primeira_mensagem_201()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Devolver(c.RespostaBoletoValida());

        foreach (var mensagem in new[] { "b", new string('x', 1000) })
        {
            var r = await c.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem });

            Assert.Equal(HttpStatusCode.Created, r.StatusCode);
            var j = await r.Json();
            var id = j.GetProperty("conversaId").GetInt64();
            Assert.Equal("resposta", j.GetProperty("resposta").GetProperty("tipo").GetString());
            Assert.False(string.IsNullOrEmpty(j.GetProperty("resposta").GetProperty("texto").GetString()));
            var conversa = await f.Db(c.Instituicao.Id, db => db.Conversas.Include(x => x.Mensagens).SingleAsync(x => x.Id == id));
            Assert.Equal(c.Aluno.Usuario.Id, conversa.AlunoId);
            Assert.Equal(mensagem, conversa.Mensagens.OrderBy(m => m.Id).First().Texto);
        }
    }

    [Fact]
    public async Task Mensagem_seguinte_200()
    {
        var c = await Cenario.Criar(f);
        var (id, _) = await c.Primeira();
        f.Llm.Devolver(new { tipo = "pergunta", texto = "É o boleto da mensalidade ou de outra taxa?" });

        var r = await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "segunda mensagem" });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var resposta = (await r.Json()).GetProperty("resposta");
        Assert.Equal("pergunta", resposta.GetProperty("tipo").GetString());
        Assert.Equal("É o boleto da mensalidade ou de outra taxa?", resposta.GetProperty("texto").GetString());
        var textos = await f.Db(c.Instituicao.Id, db => db.MensagensConversa.Where(m => m.ConversaId == id).OrderBy(m => m.Id).Select(m => m.Texto).ToListAsync());
        Assert.Equal(4, textos.Count);
        Assert.Equal("segunda mensagem", textos[2]);
    }

    [Fact]
    public async Task Mensagem_vazia_espacos_ou_1001_400()
    {
        var c = await Cenario.Criar(f);
        var (id, _) = await c.Primeira();
        Task<int> Total() => f.Db(c.Instituicao.Id, db => db.MensagensConversa.CountAsync());
        Task<int> Conversas() => f.Db(c.Instituicao.Id, db => db.Conversas.CountAsync());
        var (mensagens, conversas) = (await Total(), await Conversas());

        foreach (var mensagem in new[] { "", "     ", new string('x', 1001) })
        {
            Assert.Equal(HttpStatusCode.BadRequest, (await c.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem })).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, (await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem })).StatusCode);
        }
        Assert.Equal(mensagens, await Total());
        Assert.Equal(conversas, await Conversas());
    }

    [Fact]
    public async Task Sem_papel_aluno_ou_matricula_ativa_403()
    {
        var i = await f.Instituicao();
        var atendente = await f.Entrar(i, await f.Usuario(i, [Papeis.Atendente, Papeis.Administrador]));
        var inativo = await f.Entrar(i, await f.Usuario(i, [Papeis.Aluno], situacao: "INATIVA"));

        foreach (var cliente in new[] { atendente, inativo })
            Assert.Equal(HttpStatusCode.Forbidden, (await cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "oi" })).StatusCode);
        Assert.Equal(0, await f.Db(i.Id, db => db.Conversas.CountAsync()));
    }

    [Fact]
    public async Task Resposta_conferida_devolve_tipo_e_texto()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Devolver(c.RespostaBoletoValida("Você encontra o boleto no Portal do Aluno."));

        var (_, resposta) = await c.Primeira();

        Assert.Equal("resposta", resposta.GetProperty("tipo").GetString());
        Assert.Equal("Você encontra o boleto no Portal do Aluno.", resposta.GetProperty("texto").GetString());
    }

    [Fact]
    public async Task Trecho_invalido_vira_sem_base_e_log()
    {
        var c = await Cenario.Criar(f);
        var casos = new[]
        {
            Cenario.Resposta("Faltas podem ser abonadas com atestado.", [c.Faltas.Id], (c.Faltas.Id, "faltas podem ser abonadas com atestado")),
            Cenario.Resposta("Boleto no portal; faltas não são abonadas.", [c.Boleto.Id, c.Faltas.Id], (c.Boleto.Id, Cenario.TrechoBoleto)),
        };
        foreach (var saida in casos)
        {
            f.Llm.Devolver(saida);
            var (id, resposta) = await c.Primeira();
            Assert.Equal("sem_base", resposta.GetProperty("tipo").GetString());
            Assert.Equal(SemBase, resposta.GetProperty("texto").GetString());
            Assert.True(Logou(id, "trecho_invalido"));
        }
    }

    [Fact]
    public async Task Artigo_invalido_vira_sem_base()
    {
        var c = await Cenario.Criar(f);
        var outra = await f.Instituicao();
        var daOutra = await f.Artigo(outra, "Boleto da outra", Cenario.RespostaBoleto);
        var rascunho = await f.Artigo(c.Instituicao, "Rascunho", Cenario.RespostaBoleto, estado: EstadosArtigo.Rascunho);
        var arquivado = await f.Artigo(c.Instituicao, "Arquivado", Cenario.RespostaBoleto, estado: EstadosArtigo.Arquivado);

        foreach (var ids in new long[][] { [], [999_999], [daOutra.Id], [rascunho.Id], [arquivado.Id] })
        {
            f.Llm.Devolver(Cenario.Resposta("O boleto fica no portal.", ids, ids.Select(x => (x, Cenario.TrechoBoleto)).ToArray()));
            var (_, resposta) = await c.Primeira();
            Assert.Equal("sem_base", resposta.GetProperty("tipo").GetString());
            Assert.Equal(SemBase, resposta.GetProperty("texto").GetString());
        }
    }

    [Fact]
    public async Task Link_fora_dos_artigos_vira_sem_base_e_log()
    {
        var c = await Cenario.Criar(f);

        f.Llm.Devolver(c.RespostaBoletoValida("Pegue o boleto em https://falso.exemplo agora."));
        var (id, falso) = await c.Primeira();
        Assert.Equal("sem_base", falso.GetProperty("tipo").GetString());
        Assert.True(Logou(id, "link_invalido"));

        foreach (var link in new[] { Cenario.LinkBoleto, Cenario.LinkBiblioteca })
        {
            f.Llm.Devolver(c.RespostaBoletoValida($"Pegue o boleto em {link}."));
            var (_, ok) = await c.Primeira();
            Assert.Equal("resposta", ok.GetProperty("tipo").GetString());
            Assert.Contains(link, ok.GetProperty("texto").GetString());
        }
    }

    [Fact]
    public async Task Nenhuma_resposta_exibida_sem_trecho_por_artigo()
    {
        var c = await Cenario.Criar(f);
        var saidas = new[]
        {
            c.RespostaBoletoValida(),
            Cenario.Resposta("Faltas podem ser abonadas.", [c.Faltas.Id], (c.Faltas.Id, "faltas podem ser abonadas com atestado")),
            Cenario.Resposta("Boleto e faltas.", [c.Boleto.Id, c.Faltas.Id], (c.Boleto.Id, Cenario.TrechoBoleto)),
            Cenario.Resposta("Boleto e faltas.", [c.Boleto.Id, c.Faltas.Id], (c.Boleto.Id, Cenario.TrechoBoleto), (c.Faltas.Id, Cenario.TrechoFaltas)),
            Cenario.Resposta("O boleto.", [], []),
            c.RespostaBoletoValida("Veja https://falso.exemplo."),
            c.RespostaBoletoValida($"Veja {Cenario.LinkBoleto}."),
        };
        foreach (var s in saidas)
        {
            f.Llm.Devolver(s);
            await c.Primeira();
        }

        var respostas = await f.Db(c.Instituicao.Id, db => db.MensagensConversa.Include(m => m.Citacoes)
            .Where(m => m.TipoFinal == "resposta").ToListAsync());
        var fontes = await f.Db(c.Instituicao.Id, db => db.TrechosFonte.ToDictionaryAsync(t => t.Id, t => t.Texto));
        Assert.Equal(3, respostas.Count);
        foreach (var m in respostas)
        {
            Assert.NotEmpty(m.Citacoes);
            Assert.All(m.Citacoes, ct => Assert.NotEmpty(ct.Trechos));
            Assert.All(m.Citacoes, ct => Assert.All(ct.Trechos, t => Assert.True(Conferencia.TrechoConfere(t, fontes[ct.TrechoFonteId!.Value]))));
        }
        Assert.Contains(respostas, m => m.Citacoes.Count == 2);
    }

    [Fact]
    public async Task Pergunta_devolve_tipo_pergunta()
    {
        var c = await Cenario.Criar(f);
        var pergunta = new string('a', 199) + "?";
        f.Llm.Devolver(new { tipo = "pergunta", texto = pergunta });

        var (_, resposta) = await c.Primeira();

        Assert.Equal("pergunta", resposta.GetProperty("tipo").GetString());
        Assert.Equal(pergunta, resposta.GetProperty("texto").GetString());
    }

    [Fact]
    public async Task Pergunta_fora_da_regra_vira_sem_base()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Devolver(new { tipo = "pergunta", texto = "É sobre o boleto deste semestre?" });
        var (id, primeira) = await c.Primeira();
        var segunda = (await (await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "sim" })).Json()).GetProperty("resposta");
        var terceira = (await (await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "sim" })).Json()).GetProperty("resposta");
        Assert.Equal("pergunta", primeira.GetProperty("tipo").GetString());
        Assert.Equal("pergunta", segunda.GetProperty("tipo").GetString());
        Assert.Equal("sem_base", terceira.GetProperty("tipo").GetString());

        foreach (var texto in new[] { new string('a', 200) + "?", "É sobre o boleto deste semestre" })
        {
            f.Llm.Devolver(new { tipo = "pergunta", texto });
            var (_, resposta) = await c.Primeira();
            Assert.Equal("sem_base", resposta.GetProperty("tipo").GetString());
            Assert.Equal(SemBase, resposta.GetProperty("texto").GetString());
        }
    }

    [Fact]
    public async Task Sem_base_texto_fixo()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Devolver(new { tipo = "sem_base", texto = "texto do modelo que não pode aparecer" });

        var (_, resposta) = await c.Primeira();

        Assert.Equal("sem_base", resposta.GetProperty("tipo").GetString());
        Assert.Equal(SemBase, resposta.GetProperty("texto").GetString());
    }

    [Fact]
    public async Task Transferir_nao_cria_chamado()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Devolver(new { tipo = "transferir", texto = "texto do modelo" });

        var (_, resposta) = await c.Primeira();

        Assert.Equal("transferir", resposta.GetProperty("tipo").GetString());
        Assert.Equal("Vou transferir você para um atendente.", resposta.GetProperty("texto").GetString());
        Assert.Equal(0, await f.Db(c.Instituicao.Id, db => db.Chamados.CountAsync()));
    }

    [Fact]
    public async Task Falha_do_provedor_vira_sem_base_e_log()
    {
        var c = await Cenario.Criar(f);
        var casos = new (string motivo, Func<CancellationToken, Task<HttpResponseMessage>> responder)[]
        {
            ("provedor_http_500", _ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError))),
            ("provedor_tempo_esgotado", async ct =>
            {
                f.Relogio.Advance(TimeSpan.FromSeconds(20));
                await Task.Delay(Timeout.Infinite, ct);
                return new HttpResponseMessage(HttpStatusCode.OK);
            }),
            ("provedor_conteudo_vazio", _ => Task.FromResult(LlmFalso.Bruto(""))),
            ("provedor_json_invalido", _ => Task.FromResult(LlmFalso.Bruto("isto não é json"))),
            ("provedor_tipo_desconhecido", _ => Task.FromResult(LlmFalso.Conteudo(new { tipo = "outro", texto = "x" }))),
            ("provedor_indisponivel", _ => throw new HttpRequestException("conexão recusada")),
            ("texto_vazio", _ => Task.FromResult(LlmFalso.Conteudo(Cenario.Resposta("", [c.Boleto.Id], (c.Boleto.Id, Cenario.TrechoBoleto))))),
        };
        foreach (var (motivo, responder) in casos)
        {
            f.Llm.Responder = responder;
            var (id, resposta) = await c.Primeira();
            Assert.Equal("sem_base", resposta.GetProperty("tipo").GetString());
            Assert.Equal(SemBase, resposta.GetProperty("texto").GetString());
            Assert.True(Logou(id, motivo), motivo);
        }
    }

    [Fact]
    public async Task Ainda_responde_em_19_segundos()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Responder = _ =>
        {
            f.Relogio.Advance(TimeSpan.FromSeconds(19));
            return Task.FromResult(LlmFalso.Conteudo(c.RespostaBoletoValida()));
        };

        var (_, resposta) = await c.Primeira();

        Assert.Equal("resposta", resposta.GetProperty("tipo").GetString());
    }

    [Fact]
    public async Task Grava_o_que_foi_exibido()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Devolver(c.RespostaBoletoValida("Você encontra o boleto no Portal do Aluno."));
        var (id, _) = await c.Primeira();
        f.Llm.Devolver(Cenario.Resposta("Faltas podem ser abonadas.", [c.Faltas.Id], (c.Faltas.Id, "faltas podem ser abonadas com atestado")));
        await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "e as faltas?" });

        var mensagens = await f.Db(c.Instituicao.Id, db => db.MensagensConversa.Include(m => m.Citacoes)
            .Where(m => m.ConversaId == id && m.Autor == "ASSISTENTE").OrderBy(m => m.Id).ToListAsync());
        var versaoBoleto = await f.Db(c.Instituicao.Id, db => db.VersoesArtigo.SingleAsync(v => v.ArtigoId == c.Boleto.Id));
        var versaoDoTrecho = await f.Db(c.Instituicao.Id, db => db.TrechosFonte.ToDictionaryAsync(t => t.Id, t => t.VersaoArtigoId));

        var exibida = mensagens[0];
        Assert.Equal("Você encontra o boleto no Portal do Aluno.", exibida.Texto);
        Assert.Equal("resposta", exibida.TipoDevolvido);
        Assert.Equal("resposta", exibida.TipoFinal);
        Assert.Equal("gpt-6-luna", exibida.Modelo);
        Assert.Equal(f.Relogio.GetUtcNow().UtcDateTime, exibida.CriadaEm);
        var citacao = Assert.Single(exibida.Citacoes);
        Assert.Equal(versaoBoleto.Id, versaoDoTrecho[citacao.TrechoFonteId!.Value]);
        Assert.Equal([Cenario.TrechoBoleto], citacao.Trechos);

        var rebaixada = mensagens[1];
        Assert.Equal(SemBase, rebaixada.Texto);
        Assert.Equal("resposta", rebaixada.TipoDevolvido);
        Assert.Equal("sem_base", rebaixada.TipoFinal);
        Assert.Empty(rebaixada.Citacoes);

        await Assert.ThrowsAnyAsync<Exception>(() => f.Db(c.Instituicao.Id, db => db.MensagensConversa.Where(m => m.Id == exibida.Id).ExecuteUpdateAsync(s => s.SetProperty(m => m.Texto, "outro"))));
        await Assert.ThrowsAnyAsync<Exception>(() => f.Db(c.Instituicao.Id, db => db.Citacoes.Where(m => m.Id == citacao.Id).ExecuteDeleteAsync()));
    }

    [Fact]
    public async Task Log_da_chamada_sem_texto()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Devolver(c.RespostaBoletoValida());
        const string segredo = "mensagem-unica-do-aluno-que-nao-pode-ir-ao-log";

        var (id, _) = await c.Primeira(segredo);

        var log = Assert.Single(f.Logs.Entradas, l => l.Mensagem.StartsWith("Chamada ao provedor de IA") && Equals(l.Campos.GetValueOrDefault("InstituicaoId"), c.Instituicao.Id));
        Assert.Equal("gpt-6-luna", log.Campos["Modelo"]);
        Assert.True(log.Campos.ContainsKey("DuracaoMs"));
        Assert.Equal(1000, log.Campos["EntradaComCache"]);
        Assert.Equal(200, log.Campos["EntradaSemCache"]);
        Assert.Equal(80, log.Campos["TokensSaida"]);
        Assert.Equal("resposta", log.Campos["TipoDevolvido"]);
        Assert.Equal("resposta", log.Campos["TipoFinal"]);
        Assert.Equal(c.Boleto.Id.ToString(), log.Campos["Artigos"]);
        Assert.DoesNotContain(f.Logs.Entradas, l => l.Mensagem.Contains(segredo) || l.Campos.Values.Any(v => v?.ToString()?.Contains(segredo) == true));
    }
}
