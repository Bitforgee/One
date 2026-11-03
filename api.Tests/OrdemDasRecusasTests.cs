using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

// vertical-slice-completa: a posição de cada recusa em relação a 404, 403, 400 e 409, sempre com o corpo inválido,
// para que trocar duas posições mude o status.
public class OrdemDasRecusasTests(OneFactory f) : IClassFixture<OneFactory>
{
    static async Task<string?> Detail(HttpResponseMessage r) => (await r.Json()).GetProperty("detail").GetString();

    Task<(int mensagens, string? desfecho)> Conversa(Instituicao i, long id) =>
        f.Db(i.Id, async db => (await db.MensagensConversa.CountAsync(m => m.ConversaId == id), (await db.Conversas.SingleAsync(c => c.Id == id)).Desfecho));

    // C15
    [Fact]
    public async Task Conversa_alheia_404_mesmo_com_corpo_invalido()
    {
        var c = await Cenario.Criar(f);
        var (id, _) = await c.Primeira();
        var outro = await f.AlunoLogado(c.Instituicao);
        var antes = await Conversa(c.Instituicao, id);

        foreach (var (rota, corpo) in new (string, object)[] { ($"/api/conversas/{id}/mensagens", new { mensagem = "" }), ($"/api/conversas/{id}/avaliacao", new { }) })
        {
            var r = await outro.Cliente.PostAsJsonAsync(rota, corpo);
            Assert.True(r.StatusCode == HttpStatusCode.NotFound, $"{rota}: {(int)r.StatusCode}");
            Assert.Equal("Conversa não encontrada.", await Detail(r));
        }
        Assert.Equal(antes, await Conversa(c.Instituicao, id));
    }

    // C16
    [Fact]
    public async Task Sem_matricula_ativa_403_mesmo_com_corpo_invalido()
    {
        var i = await f.Instituicao();
        var setor = await f.Db(i.Id, db => db.Setores.SingleAsync());
        var atendente = (await f.Atendente(i, setor)).Cliente;
        var trancado = await f.Entrar(i, await f.Usuario(i, [Papeis.Aluno], situacao: "TRANCADA"));

        foreach (var cliente in new[] { atendente, trancado })
        {
            var r = await cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "" });
            Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
            Assert.Equal("O assistente é só para alunos com matrícula ativa.", await Detail(r));
        }
        var direto = await atendente.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "" });
        Assert.Equal(HttpStatusCode.Forbidden, direto.StatusCode);
        Assert.Equal("O atendimento é só para alunos com matrícula ativa.", await Detail(direto));
        Assert.Equal(0, await f.Db(i.Id, db => db.Conversas.CountAsync()));
    }

    // C17
    [Fact]
    public async Task Conversa_encerrada_400_antes_de_409()
    {
        var c = await Cenario.Criar(f);
        var (id, _) = await c.Primeira();
        Assert.Equal(HttpStatusCode.OK, (await c.Cliente.PostAsync($"/api/conversas/{id}/encerrar", null)).StatusCode);

        foreach (var (rota, corpo, campo) in new (string, object, string)[]
        {
            ($"/api/conversas/{id}/mensagens", new { mensagem = "" }, "mensagem"),
            ($"/api/conversas/{id}/avaliacao", new { }, "resolveu"),
        })
        {
            var r = await c.Cliente.PostAsJsonAsync(rota, corpo);
            Assert.True(r.StatusCode == HttpStatusCode.BadRequest, $"{rota}: {(int)r.StatusCode}");
            Assert.True((await r.Json()).GetProperty("errors").TryGetProperty(campo, out _), $"{rota} sem errors.{campo}");
        }
    }

    // C17 (verificação rodada 1, F13): transferir recusa a conversa encerrada (409) antes da matrícula inválida (400)
    [Fact]
    public async Task Transferir_conversa_encerrada_409_antes_de_400()
    {
        var c = await Cenario.Criar(f);
        var (id, _) = await c.Primeira();
        Assert.Equal(HttpStatusCode.OK, (await c.Cliente.PostAsync($"/api/conversas/{id}/encerrar", null)).StatusCode);
        var chamados = await f.Db(c.Instituicao.Id, db => db.Chamados.CountAsync());

        var r = await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { matriculaId = 999999 });

        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Equal("Esta conversa já foi encerrada.", await Detail(r));
        Assert.Equal(chamados, await f.Db(c.Instituicao.Id, db => db.Chamados.CountAsync()));
    }

    // C17 (verificação rodada 1): nos 4 cadastros, o campo inválido (400) vem antes do nome/título repetido (409)
    [Fact]
    public async Task Cadastro_400_antes_de_409()
    {
        var (i, admin) = await Admin.Criar(f);
        var setor = await f.Db(i.Id, db => db.Setores.SingleAsync(s => s.Triagem));
        var padrao = await f.Db(i.Id, db => db.Categorias.SingleAsync(c => c.Padrao));
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/categorias", new { nome = "Boleto" })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/cursos", new { nome = "Direito" })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/respostas-prontas", new { setorId = setor.Id, titulo = "Boleto", texto = "x" })).StatusCode);

        foreach (var (metodo, rota, corpo, campo) in new (string, string, object, string)[]
        {
            ("POST", "/api/admin/setores", new { nome = setor.Nome, triagem = true }, "triagem"),
            ("PUT", $"/api/admin/categorias/{padrao.Id}", new { nome = "Boleto" }, "nome"),
            ("POST", "/api/admin/cursos", new { nome = "Direito", setorCoordenacaoId = 999999 }, "setorCoordenacaoId"),
            ("POST", "/api/admin/respostas-prontas", new { setorId = setor.Id, titulo = "Boleto", texto = "" }, "texto"),
        })
        {
            var r = metodo == "POST" ? await admin.PostAsJsonAsync(rota, corpo) : await admin.PutAsJsonAsync(rota, corpo);
            Assert.True(r.StatusCode == HttpStatusCode.BadRequest, $"{rota}: {(int)r.StatusCode}");
            Assert.True((await r.Json()).GetProperty("errors").TryGetProperty(campo, out _), $"{rota} sem errors.{campo}");
        }
    }

    // C18
    [Fact]
    public async Task Id_inexistente_404_mesmo_com_corpo_invalido()
    {
        var (_, admin) = await Admin.Criar(f);
        foreach (var (rota, detail) in new[]
        {
            ("/api/admin/setores/999999", "Item não encontrado."), ("/api/admin/categorias/999999", "Item não encontrado."),
            ("/api/admin/cursos/999999", "Item não encontrado."), ("/api/admin/respostas-prontas/999999", "Item não encontrado."),
            ("/api/admin/regras/999999", "Item não encontrado."), ("/api/admin/usuarios/999999", "Item não encontrado."),
            ("/api/admin/artigos/999999", "Artigo não encontrado."),
        })
        {
            var r = await admin.PutAsJsonAsync(rota, new { });
            Assert.True(r.StatusCode == HttpStatusCode.NotFound, $"PUT {rota}: {(int)r.StatusCode}");
            Assert.Equal(detail, await Detail(r));
        }
        var versao = await admin.PostAsync("/api/admin/documentos/999999/versoes",
            new MultipartFormDataContent { { new ByteArrayContent(Balcao.Arquivo(Balcao.Exe, 100)), "arquivo", "r.pdf" } });
        Assert.Equal(HttpStatusCode.NotFound, versao.StatusCode);
        Assert.Equal("Documento não encontrado.", await Detail(versao));
    }

    // Os corpos inválidos de C25, por ação; /assumir e /confirmar não têm corpo.
    static HttpRequestMessage Invalido(string acao, string numero)
    {
        var rota = $"/api/chamados/{numero}/{(acao is "responder" or "nota" ? "mensagens" : acao)}";
        HttpContent? corpo = acao switch
        {
            "responder" or "nota" => new FormUrlEncodedContent(new Dictionary<string, string> { ["tipo"] = acao == "nota" ? "NOTA" : "PUBLICA", ["texto"] = "" }),
            "cancelar" => JsonContent.Create(new { motivo = new string('x', 4001) }),
            "reclassificar" => JsonContent.Create(new { categoriaId = 999999 }),
            "assumir" or "confirmar" => null,
            _ => JsonContent.Create(new { }),
        };
        return new HttpRequestMessage(HttpMethod.Post, rota) { Content = corpo };
    }

    static readonly string[] Acoes = ["responder", "nota", "assumir", "resolver", "confirmar", "rejeitar", "cancelar", "encaminhar", "reclassificar", "duplicado"];

    async Task<Func<Task>> Inalterado(Balcao b, string numero)
    {
        var antes = await b.Ler(numero);
        var eventos = (await b.Eventos(numero)).Count;
        var mensagens = await f.Db(b.Instituicao.Id, db => db.MensagensChamado.CountAsync(m => m.ChamadoId == antes.Id));
        return async () =>
        {
            var depois = await b.Ler(numero);
            Assert.Equal((antes.Estado, antes.ResponsavelId, antes.SetorId, antes.CategoriaId, antes.NumeroOriginal),
                (depois.Estado, depois.ResponsavelId, depois.SetorId, depois.CategoriaId, depois.NumeroOriginal));
            Assert.Equal(eventos, (await b.Eventos(numero)).Count);
            Assert.Equal(mensagens, await f.Db(b.Instituicao.Id, db => db.MensagensChamado.CountAsync(m => m.ChamadoId == antes.Id)));
        };
    }

    // C25
    [Fact]
    public async Task Acao_invisivel_404_mesmo_com_corpo_invalido()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(EmAtendimento);
        var outroAluno = await f.AlunoLogado(b.Instituicao);
        var conferir = await Inalterado(b, numero);

        foreach (var cliente in new[] { b.Alheio.Cliente, outroAluno.Cliente })
            foreach (var acao in Acoes)
            {
                var r = await cliente.SendAsync(Invalido(acao, numero));
                Assert.True(r.StatusCode == HttpStatusCode.NotFound, $"{acao}: {(int)r.StatusCode}");
                Assert.Equal("Chamado não encontrado.", await Detail(r));
            }
        await conferir();
    }

    // C26
    [Fact]
    public async Task Acao_por_papel_errado_403_mesmo_com_corpo_invalido()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(Fechado);
        var conferir = await Inalterado(b, numero);

        foreach (var (acao, cliente) in new[]
        {
            ("nota", b.ClienteAluno), ("assumir", b.ClienteAluno), ("resolver", b.ClienteAluno),
            ("confirmar", b.A.Cliente), ("rejeitar", b.A.Cliente), ("cancelar", b.A.Cliente),
            ("encaminhar", b.ClienteAluno), ("reclassificar", b.ClienteAluno), ("duplicado", b.ClienteAluno),
        })
        {
            var r = await cliente.SendAsync(Invalido(acao, numero));
            Assert.True(r.StatusCode == HttpStatusCode.Forbidden, $"{acao}: {(int)r.StatusCode}");
            Assert.Equal("Seu papel neste chamado não permite esta ação.", await Detail(r));
        }
        await conferir();
    }

    // C27
    [Fact]
    public async Task Acao_com_corpo_invalido_em_estado_errado_400()
    {
        var b = await Balcao.Criar(f);
        foreach (var (acao, estado, aluno) in new[]
        {
            ("responder", Fechado, true), ("responder", Fechado, false), ("nota", Fechado, false),
            ("resolver", Resolvido, false), ("rejeitar", Aberto, true), ("cancelar", Fechado, true),
            ("encaminhar", Resolvido, false), ("reclassificar", Fechado, false), ("duplicado", Resolvido, false),
        })
        {
            var numero = await b.Chamado(estado);
            var conferir = await Inalterado(b, numero);
            var r = await (aluno ? b.ClienteAluno : b.A.Cliente).SendAsync(Invalido(acao, numero));
            Assert.True(r.StatusCode == HttpStatusCode.BadRequest, $"{acao} em {estado}: {(int)r.StatusCode}");
            await conferir();
        }
    }

    // dominio-e-contratos C8 a C12 (L-023): cada linha com dois motivos de recusa ao mesmo tempo; o status e o campo dizem qual
    // vem primeiro na base.
    static async Task Recusa400(HttpResponseMessage r, string campo, string linha, string? mensagem = null)
    {
        var corpo = await r.Content.ReadAsStringAsync();
        Assert.True(r.StatusCode == HttpStatusCode.BadRequest, $"{linha}: {(int)r.StatusCode} {corpo}");
        var errors = (await r.Json()).GetProperty("errors");
        Assert.True(errors.TryGetProperty(campo, out var m), $"{linha} sem errors.{campo}: {corpo}");
        if (mensagem is not null) Assert.Equal(mensagem, m[0].GetString());
    }

    static async Task Recusa(HttpResponseMessage r, HttpStatusCode status, string linha, string? detail = null)
    {
        Assert.True(r.StatusCode == status, $"{linha}: {(int)r.StatusCode} {await r.Content.ReadAsStringAsync()}");
        if (detail is not null) Assert.Equal(detail, await Detail(r));
    }

    static Task<HttpResponseMessage> Enviar(HttpClient c, string metodo, string rota, object corpo) =>
        metodo == "POST" ? c.PostAsJsonAsync(rota, corpo) : c.PutAsJsonAsync(rota, corpo);

    // C8
    [Fact]
    public async Task Cadeia_do_acesso_e_da_conversa()
    {
        var i = await f.Instituicao();
        var anonimo = f.Cliente();
        await Recusa400(await anonimo.PostAsJsonAsync("/api/auth/login", new { instituicao = i.Slug, cpf = "123", senha = "" }), "cpf", "login CPF inválido e senha vazia");
        await Recusa400(await anonimo.PostAsJsonAsync("/api/auth/login", new { instituicao = i.Slug, cpf = Semente.NovoCpf(), senha = "" }), "senha", "login CPF desconhecido e senha vazia");

        var definir = await anonimo.PostAsJsonAsync("/api/auth/definir-senha", new { token = $"{i.Slug}.invalido", novaSenha = "abc" });
        await Recusa(definir, HttpStatusCode.BadRequest, "definir-senha token inválido e senha curta", "Link inválido ou vencido.");
        var j = await definir.Json();
        Assert.False(j.TryGetProperty("errors", out var e) && e.TryGetProperty("novaSenha", out _), $"definir-senha com errors.novaSenha: {j}");

        var aluno = await f.AlunoLogado(i);
        await Recusa400(await aluno.Cliente.PostAsJsonAsync("/api/auth/senha", new { senhaAtual = "errada", novaSenha = "abc" }), "senhaAtual", "senha atual errada e nova curta");

        var id = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "pergunta 1" })).Json()).GetProperty("conversaId").GetInt64();
        for (var n = 2; n <= 10; n++)
            Assert.Equal(HttpStatusCode.OK, (await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = $"pergunta {n}" })).StatusCode);
        Assert.Equal(10, await f.Db(i.Id, db => db.MensagensConversa.CountAsync(m => m.ConversaId == id && m.Autor == "ALUNO")));
        await Recusa400(await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "" }), "mensagem", "mensagem vazia na conversa com 10");
        Assert.Equal(HttpStatusCode.OK, (await aluno.Cliente.PostAsync($"/api/conversas/{id}/encerrar", null)).StatusCode);
        await Recusa(await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "pergunta 11" }), HttpStatusCode.Conflict,
            "mensagem na conversa encerrada com 10", "Esta conversa já foi encerrada.");

        var duas = await f.AlunoLogado(i);
        await f.Db(i.Id, async db =>
        {
            var curso = await db.Cursos.FirstAsync();
            db.Matriculas.Add(new Matricula { UsuarioId = duas.Usuario.Id, CursoId = curso.Id, Numero = "M2-" + Guid.NewGuid().ToString("N")[..8], Semestre = 5 });
            await db.SaveChangesAsync();
        });
        var chamados = await f.Db(i.Id, db => db.Chamados.CountAsync());
        await Recusa400(await duas.Cliente.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "" }), "descricao", "descrição vazia e duas matrículas");
        Assert.Equal(chamados, await f.Db(i.Id, db => db.Chamados.CountAsync()));
    }

    // C9
    [Fact]
    public async Task Cadeia_dos_cadastros()
    {
        var (i, admin) = await Admin.Criar(f);
        var triagem = await f.Db(i.Id, db => db.Setores.SingleAsync(s => s.Triagem));
        var padrao = await f.Db(i.Id, db => db.Categorias.SingleAsync(c => c.Padrao));
        async Task<long> Criar(string rota, object corpo)
        {
            var r = await admin.PostAsJsonAsync(rota, corpo);
            Assert.True(r.StatusCode == HttpStatusCode.Created, $"{rota}: {(int)r.StatusCode}");
            return (await r.Json()).GetProperty("id").GetInt64();
        }
        var curso = await Criar("/api/admin/cursos", new { nome = "Direito" });
        var resposta = await Criar("/api/admin/respostas-prontas", new { setorId = triagem.Id, titulo = "Boleto", texto = "Use o portal." });
        var (c1, c2) = (await Criar("/api/admin/categorias", new { nome = "Boleto" }), await Criar("/api/admin/categorias", new { nome = "Matrícula" }));
        var regra = await Criar("/api/admin/regras", new { categoriaId = c1, destino = "COORDENACAO_CURSO" });
        await Criar("/api/admin/regras", new { categoriaId = c2, destino = "COORDENACAO_CURSO" });

        foreach (var (metodo, rota, corpo, campo) in new (string, string, object, string)[]
        {
            ("POST", "/api/admin/setores", new { nome = "", triagem = true }, "nome"),
            ("PUT", $"/api/admin/setores/{triagem.Id}", new { nome = "", triagem = false }, "nome"),
            ("POST", "/api/admin/cursos", new { nome = "", setorCoordenacaoId = 999999 }, "nome"),
            ("PUT", $"/api/admin/cursos/{curso}", new { nome = "", setorCoordenacaoId = 999999 }, "nome"),
            ("POST", "/api/admin/respostas-prontas", new { setorId = 999999, titulo = "", texto = "x" }, "setorId"),
            ("PUT", $"/api/admin/respostas-prontas/{resposta}", new { setorId = 999999, titulo = "", texto = "x" }, "setorId"),
            ("POST", "/api/admin/respostas-prontas", new { setorId = triagem.Id, titulo = "", texto = "" }, "titulo"),
            ("PUT", $"/api/admin/respostas-prontas/{resposta}", new { setorId = triagem.Id, titulo = "", texto = "" }, "titulo"),
            ("POST", "/api/admin/regras", new { categoriaId = padrao.Id, destino = "X" }, "categoriaId"),
            ("PUT", $"/api/admin/regras/{regra}", new { categoriaId = padrao.Id, destino = "X" }, "categoriaId"),
            ("PUT", $"/api/admin/regras/{regra}", new { categoriaId = c2, destino = "X" }, "destino"),
        })
            await Recusa400(await Enviar(admin, metodo, rota, corpo), campo, $"{metodo} {rota} {campo}");

        await Recusa400(await admin.PutAsJsonAsync($"/api/admin/categorias/{padrao.Id}", new { nome = "" }), "nome", "PUT da categoria padrão com nome vazio",
            "Informe o nome da categoria.");
    }

    // C10
    [Fact]
    public async Task Cadeia_do_usuario()
    {
        var (i, admin) = await Admin.Criar(f);
        var alvo = await f.Usuario(i, [Papeis.Aluno]);
        var outro = await f.Usuario(i, [Papeis.Aluno]);
        var (cpf, email) = (Semente.NovoCpf(), $"{Guid.NewGuid():N}@teste.one");

        foreach (var (rota, metodo) in new[] { ("/api/admin/usuarios", "POST"), ($"/api/admin/usuarios/{alvo.Id}", "PUT") })
        {
            foreach (var (corpo, campo, mensagem) in new (object, string, string?)[]
            {
                (new { cpf = "123", nome = "", email, papeis = new[] { Papeis.Aluno } }, "cpf", null),
                (new { cpf, nome = "", email = "invalido", papeis = new[] { Papeis.Aluno } }, "nome", null),
                (new { cpf, nome = "Zé", email = "invalido", papeis = Array.Empty<string>() }, "email", null),
                (new { cpf, nome = "Zé", email, papeis = new[] { Papeis.Atendente, "XYZ" }, setores = Array.Empty<long>() }, "papeis", null),
                (new { cpf, nome = "Zé", email, papeis = new[] { Papeis.Atendente }, setores = Array.Empty<long>(), senhaTemporaria = "abc" }, "setores",
                    "Escolha ao menos um setor para o atendente."),
                (new { cpf, nome = "Zé", email, papeis = new[] { Papeis.Atendente }, setores = new long[] { 999999 }, senhaTemporaria = "abc" }, "setores", "Setor inexistente."),
                (new { cpf = outro.Cpf, nome = "Zé", email, papeis = new[] { Papeis.Aluno }, senhaTemporaria = "abc" }, "senhaTemporaria", null),
            })
                await Recusa400(await Enviar(admin, metodo, rota, corpo), campo, $"{metodo} {rota} {campo}", mensagem);

            await Recusa(await Enviar(admin, metodo, rota, new { cpf = outro.Cpf, nome = "Zé", email = outro.Email, papeis = new[] { Papeis.Aluno } }),
                HttpStatusCode.Conflict, $"{metodo} {rota} CPF e e-mail repetidos", "Já existe um usuário com este CPF na instituição.");
        }
    }

    // C11
    [Fact]
    public async Task Cadeia_do_conhecimento()
    {
        var (i, admin) = await Admin.Criar(f);
        var padrao = await f.Db(i.Id, db => db.Categorias.SingleAsync(c => c.Padrao));
        var criado = await admin.PostAsJsonAsync("/api/admin/artigos", new { titulo = "Boleto", perguntas = new[] { "Onde está o boleto?" }, categoriaId = padrao.Id, resposta = "No portal." });
        Assert.Equal(HttpStatusCode.Created, criado.StatusCode);
        var artigo = (await criado.Json()).GetProperty("id").GetInt64();
        var perguntas = new[] { "Onde está o boleto?" };

        foreach (var (rota, metodo) in new[] { ("/api/admin/artigos", "POST"), ($"/api/admin/artigos/{artigo}", "PUT") })
            foreach (var (corpo, campo) in new (object, string)[]
            {
                (new { titulo = "", perguntas = Array.Empty<string>(), categoriaId = padrao.Id, resposta = "r" }, "titulo"),
                (new { titulo = "T", perguntas = Array.Empty<string>(), categoriaId = 999999, resposta = "r" }, "perguntas"),
                (new { titulo = "T", perguntas, categoriaId = 999999, resposta = "" }, "categoriaId"),
                (new { titulo = "T", perguntas, categoriaId = padrao.Id, resposta = "", links = new[] { "ftp://x" } }, "resposta"),
                (new { titulo = "T", perguntas, categoriaId = padrao.Id, resposta = "r", links = new[] { "ftp://x" }, visivelDe = "2026-12-31", visivelAte = "2026-11-01" }, "links"),
            })
                await Recusa400(await Enviar(admin, metodo, rota, corpo), campo, $"{metodo} {rota} {campo}");

        await Recusa400(await admin.Subir("", 999999, Pdfs.Criar("Regulamento")), "titulo", "documento sem título e categoria inexistente");
        await Recusa400(await admin.Subir("Regulamento", 999999, Balcao.Arquivo(Balcao.Exe, 100), "r.exe"), "categoriaId", "documento com categoria inexistente e arquivo que não é PDF");

        var subido = await admin.Subir("Regulamento", padrao.Id, Pdfs.Criar("Regulamento academico"));
        Assert.Equal(HttpStatusCode.Created, subido.StatusCode);
        var documento = (await subido.Json()).GetProperty("id").GetInt64();
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync($"/api/admin/documentos/{documento}/arquivar", null)).StatusCode);
        var versoes = await f.Db(i.Id, db => db.VersoesDocumento.CountAsync(v => v.DocumentoId == documento));

        await Recusa400(await admin.PostAsync($"/api/admin/documentos/{documento}/versoes", new MultipartFormDataContent { { new StringContent("x"), "outro" } }),
            "arquivo", "versão sem arquivo em documento arquivado");
        await Recusa(await admin.NovaVersao(documento, Balcao.Arquivo(Balcao.Exe, 100)), HttpStatusCode.UnsupportedMediaType, "versão que não é PDF em documento arquivado");
        await Recusa(await admin.NovaVersao(documento, Pdfs.ComTamanho(Pdfs.Criar("Regulamento"), 20 * 1024 * 1024 + 1)), HttpStatusCode.RequestEntityTooLarge,
            "versão de 20 MB + 1 byte em documento arquivado");
        Assert.Equal(versoes, await f.Db(i.Id, db => db.VersoesDocumento.CountAsync(v => v.DocumentoId == documento)));
    }

    // C12
    [Fact]
    public async Task Cadeia_das_acoes_do_chamado()
    {
        var b = await Balcao.Criar(f);
        var vencido = await b.Chamado(Resolvido);
        await b.Recuar(vencido, TimeSpan.FromDays(7) + TimeSpan.FromMinutes(1));
        var conferirVencido = await Inalterado(b, vencido);
        await Recusa400(await b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{vencido}/rejeitar", new { }), "motivo", "rejeitar sem motivo fora do prazo");
        await Recusa400(await Balcao.Mensagem(b.ClienteAluno, vencido, ""), "texto", "mensagem vazia do aluno fora do prazo");
        await conferirVencido();

        var fechado = await b.Chamado(Fechado);
        var conferirFechado = await Inalterado(b, fechado);
        await Recusa(await b.A.Cliente.PostAsync($"/api/chamados/{fechado}/assumir", null), HttpStatusCode.Conflict, "assumir pelo responsável no FECHADO",
            "A ação não é permitida no estado atual do chamado.");
        await conferirFechado();

        var numero = await b.Chamado(EmAtendimento);
        var conferir = await Inalterado(b, numero);
        await Recusa400(await Balcao.ComAnexos(b.A.Cliente, numero, "", "NOTA", ("a.pdf", Balcao.Arquivo(Balcao.Pdf, 100))), "texto", "nota vazia com anexo");
        await Recusa400(await Balcao.ComAnexos(b.A.Cliente, numero, "Nota", "NOTA", ("a.exe", Balcao.Arquivo(Balcao.Exe, 100))), "anexos", "nota com anexo que não é PDF, JPG nem PNG");
        await Recusa400(await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/encaminhar", new { setorId = b.Triagem.Id, motivo = "" }), "motivo", "encaminhar sem motivo para o mesmo setor");
        await conferir();
    }
}
