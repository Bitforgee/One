using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

public class VisibilidadeTests(OneFactory f) : IClassFixture<OneFactory>
{
    public static (HttpMethod metodo, string rota, HttpContent? corpo)[] RotasDoChamado(string numero, long setorId, long categoriaId) =>
    [
        (HttpMethod.Get, $"/api/chamados/{numero}", null),
        (HttpMethod.Post, $"/api/chamados/{numero}/mensagens", new FormUrlEncodedContent(new Dictionary<string, string> { ["tipo"] = "PUBLICA", ["texto"] = "oi" })),
        (HttpMethod.Post, $"/api/chamados/{numero}/mensagens", new FormUrlEncodedContent(new Dictionary<string, string> { ["tipo"] = "NOTA", ["texto"] = "nota" })),
        (HttpMethod.Post, $"/api/chamados/{numero}/assumir", null),
        (HttpMethod.Post, $"/api/chamados/{numero}/resolver", JsonContent.Create(new { texto = "feito" })),
        (HttpMethod.Post, $"/api/chamados/{numero}/confirmar", null),
        (HttpMethod.Post, $"/api/chamados/{numero}/rejeitar", JsonContent.Create(new { motivo = "não" })),
        (HttpMethod.Post, $"/api/chamados/{numero}/cancelar", JsonContent.Create(new { motivo = "não" })),
        (HttpMethod.Post, $"/api/chamados/{numero}/encaminhar", JsonContent.Create(new { setorId, motivo = "outro setor" })),
        (HttpMethod.Post, $"/api/chamados/{numero}/reclassificar", JsonContent.Create(new { categoriaId })),
        (HttpMethod.Post, $"/api/chamados/{numero}/duplicado", JsonContent.Create(new { numeroOriginal = numero })),
    ];

    [Fact]
    public async Task Atendente_de_outro_setor_404()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(EmAtendimento);
        var categoria = await f.Categoria(b.Instituicao, "Financeiro");
        var antes = await b.Ler(numero);
        var eventos = (await b.Eventos(numero)).Count;

        foreach (var (metodo, rota, corpo) in RotasDoChamado(numero, b.Outro.Id, categoria.Id))
        {
            var r = await b.Alheio.Cliente.SendAsync(new HttpRequestMessage(metodo, rota) { Content = corpo });
            Assert.True(r.StatusCode == HttpStatusCode.NotFound, $"{metodo} {rota}: {(int)r.StatusCode}");
        }
        var depois = await b.Ler(numero);
        Assert.Equal((antes.Estado, antes.ResponsavelId, antes.SetorId, antes.CategoriaId), (depois.Estado, depois.ResponsavelId, depois.SetorId, depois.CategoriaId));
        Assert.Equal(eventos, (await b.Eventos(numero)).Count);
    }

    // Conversa com uma resposta apoiada no artigo do boleto, transferida para a triagem, com uma nota interna.
    async Task<(Cenario c, Atendente atendente, string numero)> Transferido()
    {
        var c = await Cenario.Criar(f);
        var triagem = await f.Db(c.Instituicao.Id, db => db.Setores.SingleAsync(s => s.Triagem));
        var atendente = await f.Atendente(c.Instituicao, triagem);
        f.Llm.Devolver(c.RespostaBoletoValida());
        var (id, _) = await c.Primeira();
        var numero = (await (await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { })).Json()).GetProperty("numero").GetString()!;
        await Balcao.Mensagem(atendente.Cliente, numero, "NOTA-SECRETA: aluno já ligou duas vezes", "NOTA");
        await Balcao.Mensagem(atendente.Cliente, numero, "Vou verificar seu boleto.");
        return (c, atendente, numero);
    }

    [Fact]
    public async Task Detalhe_do_atendente_traz_contexto_e_fontes()
    {
        var (c, atendente, numero) = await Transferido();

        var r = await atendente.Cliente.GetAsync($"/api/chamados/{numero}");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Json();
        var matricula = j.GetProperty("matricula");
        Assert.Equal(c.Aluno.Usuario.Matriculas[0].Numero, matricula.GetProperty("numero").GetString());
        Assert.Equal("Análise e Desenvolvimento de Sistemas", matricula.GetProperty("curso").GetString());
        Assert.Equal(3, matricula.GetProperty("semestre").GetInt32());
        Assert.Equal("Aluno pergunta sobre o boleto.", j.GetProperty("resumo").GetString());
        var transcricao = j.GetProperty("transcricao").EnumerateArray().ToList();
        Assert.Equal(["preciso do boleto", "Você encontra o boleto no Portal do Aluno, na área financeira."], transcricao.Select(m => m.GetProperty("texto").GetString()));
        var fonte = Assert.Single(transcricao[1].GetProperty("fontes").EnumerateArray());
        Assert.Equal("Como emitir o boleto do semestre", fonte.GetProperty("titulo").GetString());
        Assert.Equal([Cenario.TrechoBoleto], fonte.GetProperty("trechos").EnumerateArray().Select(t => t.GetString()));
        Assert.False(fonte.GetProperty("atualizado").GetBoolean());
        Assert.Equal(["NOTA", "PUBLICA"], j.GetProperty("mensagens").EnumerateArray().Select(m => m.GetProperty("tipo").GetString()));
        Assert.Equal(["CRIACAO", "NOTA", "RESPOSTA", "ATRIBUICAO", "TRANSICAO"], j.GetProperty("eventos").EnumerateArray().Select(e => e.GetProperty("tipo").GetString()));
        Assert.Equal(["responder", "nota", "resolver", "encaminhar", "reclassificar", "duplicado"], j.GetProperty("acoes").EnumerateArray().Select(a => a.GetString()));
    }

    [Fact]
    public async Task Detalhe_do_aluno_sem_resumo()
    {
        var (c, _, numero) = await Transferido();

        var r = await c.Cliente.GetAsync($"/api/chamados/{numero}");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Json();
        Assert.Equal("EM_ATENDIMENTO", j.GetProperty("estado").GetString());
        Assert.Equal(2, j.GetProperty("transcricao").GetArrayLength());
        Assert.Equal(["Vou verificar seu boleto."], j.GetProperty("mensagens").EnumerateArray().Select(m => m.GetProperty("texto").GetString()));
        Assert.Equal(["responder", "cancelar"], j.GetProperty("acoes").EnumerateArray().Select(a => a.GetString()));
        Assert.Equal(JsonValueKind.Null, j.GetProperty("resumo").ValueKind);
    }

    [Fact]
    public async Task Aluno_nao_recebe_nota_resumo_nem_fontes()
    {
        var (c, atendente, numero) = await Transferido();
        await atendente.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/resolver", new { texto = "Boleto reemitido." });

        var corpos = new List<string>
        {
            await (await c.Cliente.GetAsync($"/api/chamados/{numero}")).Content.ReadAsStringAsync(),
            await (await c.Cliente.GetAsync("/api/chamados?escopo=meus")).Content.ReadAsStringAsync(),
            await (await Balcao.Mensagem(c.Cliente, numero, "Ainda não chegou.")).Content.ReadAsStringAsync(),
            await (await c.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/cancelar", new { })).Content.ReadAsStringAsync(),
        };

        foreach (var corpo in corpos)
        {
            Assert.Contains(numero, corpo);
            foreach (var proibido in new[] { "NOTA-SECRETA", "Aluno pergunta sobre o boleto.", "Como emitir o boleto do semestre", Cenario.TrechoBoleto, "\"NOTA\"", "\"eventos\":[", "versaoArtigoId", "\"trechos\"" })
                Assert.DoesNotContain(proibido, corpo);
        }
    }
}

public class TransicoesTests(OneFactory f) : IClassFixture<OneFactory>
{
    static readonly string[] Estados = [Aberto, EmAtendimento, AguardandoAluno, Resolvido, Fechado];

    // AC 89: quem pode fazer a ação e em quais estados; a tabela vive aqui, não no código de produção.
    static readonly (string acao, bool doAluno, string[] estados)[] Matriz =
    [
        ("resposta pública", false, [Aberto, EmAtendimento, AguardandoAluno]),
        ("nota interna", false, [Aberto, EmAtendimento, AguardandoAluno, Resolvido]),
        ("assumir", false, [Aberto, EmAtendimento, AguardandoAluno]),
        ("resolver", false, [Aberto, EmAtendimento, AguardandoAluno]),
        ("confirmar", true, [Resolvido]),
        ("rejeitar", true, [Resolvido]),
        ("cancelar", true, [Aberto, EmAtendimento, AguardandoAluno]),
        ("encaminhar", false, [Aberto, EmAtendimento, AguardandoAluno]),
        ("reclassificar", false, [Aberto, EmAtendimento, AguardandoAluno, Resolvido]),
    ];

    static Task<HttpResponseMessage> Executar(Balcao b, HttpClient c, string acao, string numero, long categoriaId) => acao switch
    {
        "resposta pública" => Balcao.Mensagem(c, numero, "Resposta"),
        "nota interna" => Balcao.Mensagem(c, numero, "Nota", "NOTA"),
        "assumir" => c.PostAsync($"/api/chamados/{numero}/assumir", null),
        "resolver" => c.PostAsJsonAsync($"/api/chamados/{numero}/resolver", new { texto = "Resolvido." }),
        "confirmar" => c.PostAsync($"/api/chamados/{numero}/confirmar", null),
        "rejeitar" => c.PostAsJsonAsync($"/api/chamados/{numero}/rejeitar", new { motivo = "Não resolveu." }),
        "cancelar" => c.PostAsJsonAsync($"/api/chamados/{numero}/cancelar", new { motivo = "Desisti." }),
        "encaminhar" => c.PostAsJsonAsync($"/api/chamados/{numero}/encaminhar", new { setorId = b.Outro.Id, motivo = "Outro setor." }),
        "reclassificar" => c.PostAsJsonAsync($"/api/chamados/{numero}/reclassificar", new { categoriaId }),
        _ => throw new ArgumentException(acao),
    };

    Task<string> Fotografia(Balcao b, string numero) => f.Db(b.Instituicao.Id, async db =>
    {
        var c = await db.Chamados.SingleAsync(x => x.Numero == numero);
        var mensagens = await db.MensagensChamado.CountAsync(m => m.ChamadoId == c.Id);
        var eventos = await db.EventosChamado.CountAsync(e => e.ChamadoId == c.Id);
        return $"{c.Estado}|{c.ResponsavelId}|{c.SetorId}|{c.CategoriaId}|{c.MotivoFechamento}|{c.Reaberturas}|{c.Encaminhamentos}|{mensagens}|{eventos}";
    });

    [Fact]
    public async Task Matriz_acao_estado()
    {
        var b = await Balcao.Criar(f);
        var categoria = await f.Categoria(b.Instituicao, "Financeiro");
        foreach (var (acao, doAluno, permitidos) in Matriz)
            foreach (var estado in Estados)
            {
                var numero = await b.Chamado(estado);
                var antes = await Fotografia(b, numero);
                // B é atendente do setor e nunca é o responsável, então assumir também vale em EM_ATENDIMENTO e AGUARDANDO_ALUNO
                var r = await Executar(b, doAluno ? b.ClienteAluno : b.B.Cliente, acao, numero, categoria.Id);

                if (permitidos.Contains(estado))
                    Assert.True(r.IsSuccessStatusCode, $"{acao} em {estado}: {(int)r.StatusCode}");
                else
                {
                    Assert.True(r.StatusCode == HttpStatusCode.Conflict, $"{acao} em {estado}: {(int)r.StatusCode}");
                    Assert.Equal(antes, await Fotografia(b, numero));
                }
            }
    }

    [Fact]
    public async Task Matriz_acao_papel()
    {
        var b = await Balcao.Criar(f);
        var categoria = await f.Categoria(b.Instituicao, "Financeiro");
        foreach (var (acao, doAluno, permitidos) in Matriz)
        {
            // o papel errado tenta a ação num estado em que ela seria permitida
            var numero = await b.Chamado(permitidos[0]);
            var antes = await Fotografia(b, numero);

            var r = await Executar(b, doAluno ? b.A.Cliente : b.ClienteAluno, acao, numero, categoria.Id);

            if (acao == "resposta pública") Assert.True(r.IsSuccessStatusCode, $"{acao}: {(int)r.StatusCode}"); // os dois papéis respondem
            else
            {
                Assert.True(r.StatusCode == HttpStatusCode.Forbidden, $"{acao} pelo papel errado: {(int)r.StatusCode}");
                Assert.Equal(antes, await Fotografia(b, numero));
            }
        }
    }
}

public class ConcorrenciaTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Segunda_alteracao_simultanea_409()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(EmAtendimento);

        // door 14 na camada do banco: duas sessões leem a mesma versão e só a primeira grava
        await f.Db(b.Instituicao.Id, async db1 => await f.Db(b.Instituicao.Id, async db2 =>
        {
            var c1 = await db1.Chamados.SingleAsync(c => c.Numero == numero);
            var c2 = await db2.Chamados.SingleAsync(c => c.Numero == numero);
            c1.ResponsavelId = b.B.Usuario.Id;
            await db1.SaveChangesAsync();
            c2.Estado = AguardandoAluno;
            await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => db2.SaveChangesAsync());
        }));
        var c = await b.Ler(numero);
        Assert.Equal((EmAtendimento, (long?)b.B.Usuario.Id), (c.Estado, c.ResponsavelId));

        // pela API: dois atendentes resolvem ao mesmo tempo; um grava e o outro recebe 409
        var outro = await b.Chamado(EmAtendimento);
        var respostas = await Task.WhenAll(
            b.A.Cliente.PostAsJsonAsync($"/api/chamados/{outro}/resolver", new { texto = "Feito por A." }),
            b.B.Cliente.PostAsJsonAsync($"/api/chamados/{outro}/resolver", new { texto = "Feito por B." }));
        Assert.Equal([HttpStatusCode.OK, HttpStatusCode.Conflict], respostas.Select(r => r.StatusCode).Order());
        var resolucoes = await f.Db(b.Instituicao.Id, db => db.MensagensChamado.CountAsync(m => db.Chamados.Any(x => x.Id == m.ChamadoId && x.Numero == outro)));
        Assert.Equal(1, resolucoes);
    }
}

public class EventosTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Cada_acao_grava_evento()
    {
        var b = await Balcao.Criar(f);
        var categoria = await f.Categoria(b.Instituicao, "Financeiro");
        var numero = await b.Chamado();
        var passos = new (Func<Task<HttpResponseMessage>> acao, string tipo, long? ator)[]
        {
            (() => b.A.Cliente.PostAsync($"/api/chamados/{numero}/assumir", null), "ATRIBUICAO", b.A.Usuario.Id),
            (() => Balcao.Mensagem(b.A.Cliente, numero, "Resposta"), "RESPOSTA", b.A.Usuario.Id),
            (() => Balcao.Mensagem(b.A.Cliente, numero, "Nota", "NOTA"), "NOTA", b.A.Usuario.Id),
            (() => b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/reclassificar", new { categoriaId = categoria.Id }), "RECLASSIFICACAO", b.A.Usuario.Id),
            (() => Balcao.ComAnexos(b.A.Cliente, numero, "Segue o boleto", "PUBLICA", ("boleto.pdf", Balcao.Arquivo(Balcao.Pdf, 100))), "ANEXO", b.A.Usuario.Id),
            (() => b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/encaminhar", new { setorId = b.Outro.Id, motivo = "Financeiro" }), "ENCAMINHAMENTO", b.A.Usuario.Id),
        };
        var criacao = Assert.Single(await b.Eventos(numero));
        Assert.Equal(("CRIACAO", (long?)null), (criacao.Tipo, criacao.AtorId));

        foreach (var (acao, tipo, ator) in passos)
        {
            f.Relogio.Advance(TimeSpan.FromMinutes(1));
            var antes = (await b.Eventos(numero)).Count;
            Assert.True((await acao()).IsSuccessStatusCode, tipo);
            var novos = (await b.Eventos(numero)).Skip(antes).ToList();
            var e = Assert.Single(novos, x => x.Tipo == tipo);
            Assert.Equal(ator, e.AtorId);
            Assert.Equal(f.Relogio.GetUtcNow().UtcDateTime, e.CriadoEm);
            Assert.Equal(DateTimeKind.Utc, e.CriadoEm.Kind);
        }
        Assert.Contains(await b.Eventos(numero), e => e.Tipo == "TRANSICAO" && e.De == "ABERTO" && e.Para == "EM_ATENDIMENTO");

        var j = await b.Detalhe(b.Alheio.Cliente, numero);
        var datas = j.GetProperty("eventos").EnumerateArray().Select(e => e.GetProperty("criadoEm").GetDateTime()).ToList();
        Assert.Equal(datas.Order(), datas);
        Assert.Equal("Sistema", j.GetProperty("eventos")[0].GetProperty("ator").GetString());
    }
}

public class ImutabilidadeTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public void Sem_rota_de_edicao()
    {
        var rotas = f.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>().Endpoints
            .OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .SelectMany(e => e.Metadata.GetMetadata<Microsoft.AspNetCore.Routing.HttpMethodMetadata>()?.HttpMethods.Select(m => (m, e.RoutePattern.RawText!)) ?? []);

        Assert.DoesNotContain(rotas, r => r.m is "PUT" or "PATCH" or "DELETE"
            && System.Text.RegularExpressions.Regex.IsMatch(r.Item2, "mensage|evento|versao|versoes|anexo"));
    }

    [Fact]
    public async Task Trigger_recusa_update_e_delete()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Devolver(c.RespostaBoletoValida());
        var (id, _) = await c.Primeira();
        var numero = (await (await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { })).Json()).GetProperty("numero").GetString()!;
        var triagem = await f.Db(c.Instituicao.Id, db => db.Setores.SingleAsync(s => s.Triagem));
        await Balcao.Mensagem((await f.Atendente(c.Instituicao, triagem)).Cliente, numero, "Nota", "NOTA");
        await f.Db(c.Instituicao.Id, async db =>
        {
            db.Anexos.Add(new Anexo { MensagemChamadoId = await db.MensagensChamado.Select(m => m.Id).FirstAsync() });
            await db.SaveChangesAsync();
        });

        await using var con = new Npgsql.NpgsqlConnection(f.ConnectionString);
        await con.OpenAsync();
        foreach (var tabela in new[] { "mensagem_conversa", "mensagem_chamado", "evento_chamado", "versao_artigo", "anexo" })
            foreach (var sql in new[] { $"UPDATE {tabela} SET instituicao_id = instituicao_id", $"DELETE FROM {tabela}" })
            {
                async Task<long> Contar() { await using var q = new Npgsql.NpgsqlCommand($"SELECT count(*) FROM {tabela}", con); return (long)(await q.ExecuteScalarAsync())!; }
                var antes = await Contar();
                Assert.True(antes > 0, tabela);
                await using var cmd = new Npgsql.NpgsqlCommand(sql, con);
                await Assert.ThrowsAsync<Npgsql.PostgresException>(() => cmd.ExecuteNonQueryAsync());
                Assert.Equal(antes, await Contar());
            }
    }
}

public class EncaminharTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Encaminhar_abre_no_destino()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(EmAtendimento);

        var r = await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/encaminhar", new { setorId = b.Outro.Id, motivo = "É do financeiro." });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var c = await b.Ler(numero);
        Assert.Equal((Aberto, b.Outro.Id, (long?)null, 1), (c.Estado, c.SetorId, c.ResponsavelId, c.Encaminhamentos));
        var nota = await f.Db(b.Instituicao.Id, db => db.MensagensChamado.SingleAsync(m => m.ChamadoId == c.Id));
        Assert.Equal(("NOTA", "É do financeiro."), (nota.Tipo, nota.Texto));
    }

    [Fact]
    public async Task Mesmo_setor_ou_sem_motivo_400()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(EmAtendimento);
        var antes = await b.Ler(numero);

        Assert.Equal(HttpStatusCode.BadRequest, (await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/encaminhar", new { setorId = b.Triagem.Id, motivo = "x" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/encaminhar", new { setorId = b.Outro.Id, motivo = " " })).StatusCode);

        var depois = await b.Ler(numero);
        Assert.Equal((antes.Estado, antes.SetorId, antes.ResponsavelId, antes.Encaminhamentos), (depois.Estado, depois.SetorId, depois.ResponsavelId, depois.Encaminhamentos));
    }

    [Fact]
    public async Task Setor_anterior_perde_acesso_404()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();

        await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/encaminhar", new { setorId = b.Outro.Id, motivo = "Financeiro" });

        Assert.Equal(HttpStatusCode.NotFound, (await b.A.Cliente.GetAsync($"/api/chamados/{numero}")).StatusCode);
        var j = await b.Detalhe(b.Alheio.Cliente, numero);
        Assert.Equal("ABERTO", j.GetProperty("estado").GetString());
    }

    [Fact]
    public async Task Reclassificar_mantem_original()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(EmAtendimento);
        var categoria = await f.Categoria(b.Instituicao, "Financeiro");
        var antes = await b.Ler(numero);

        var r = await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/reclassificar", new { categoriaId = categoria.Id });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var c = await b.Ler(numero);
        Assert.Equal((categoria.Id, antes.CategoriaOriginalId, antes.OrigemCategoria, antes.SetorId), (c.CategoriaId, c.CategoriaOriginalId, c.OrigemCategoria, c.SetorId));
    }

    [Fact]
    public async Task Categoria_inativa_ou_inexistente_400()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(EmAtendimento);
        var inativa = await f.Categoria(b.Instituicao, "Antiga", ativa: false);

        foreach (var categoriaId in new long[] { inativa.Id, 999999 })
            Assert.Equal(HttpStatusCode.BadRequest, (await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/reclassificar", new { categoriaId })).StatusCode);
    }
}
