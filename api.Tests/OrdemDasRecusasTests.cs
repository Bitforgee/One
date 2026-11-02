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
}
