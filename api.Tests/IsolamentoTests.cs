using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class IsolamentoTests(OneFactory f) : IClassFixture<OneFactory>
{
    // C7: rotas com {id} ou {numero}. Os lotes seguintes acrescentam as rotas de chamado, anexo e administração (27 no total).
    [Fact]
    public async Task Recurso_de_outra_instituicao_404()
    {
        var univag = await f.Instituicao(nome: "Univag");
        var demo = await f.Instituicao(nome: "Demo");
        var artigo = await f.Artigo(univag, "Como emitir o boleto do semestre", "O boleto fica no Portal do Aluno, no menu Financeiro.");
        var versaoId = await f.Db(univag.Id, db => db.VersoesArtigo.Where(v => v.ArtigoId == artigo.Id).Select(v => v.Id).SingleAsync());
        var alunoUnivag = await f.AlunoLogado(univag);
        var conversaId = (await (await alunoUnivag.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "oi" })).Json()).GetProperty("conversaId").GetInt64();

        var alunoDemo = await f.AlunoLogado(demo);
        var equipeDemo = await f.Entrar(demo, await f.Usuario(demo, [Papeis.Atendente, Papeis.Administrador]));

        var rotas = new (HttpClient cliente, HttpMethod metodo, string url, object? corpo)[]
        {
            (alunoDemo.Cliente, HttpMethod.Get, $"/api/conversas/{conversaId}", null),
            (alunoDemo.Cliente, HttpMethod.Post, $"/api/conversas/{conversaId}/mensagens", new { mensagem = "oi" }),
            (alunoDemo.Cliente, HttpMethod.Post, $"/api/conversas/{conversaId}/avaliacao", new { resolveu = true }),
            (alunoDemo.Cliente, HttpMethod.Post, $"/api/conversas/{conversaId}/encerrar", null),
            (equipeDemo, HttpMethod.Get, $"/api/artigos/versoes/{versaoId}", null),
        };
        foreach (var (cliente, metodo, url, corpo) in rotas)
        {
            var r = await cliente.SendAsync(new HttpRequestMessage(metodo, url) { Content = corpo is null ? null : JsonContent.Create(corpo) });
            Assert.True(r.StatusCode == HttpStatusCode.NotFound, $"{metodo} {url}: {(int)r.StatusCode}");
        }
        var conversa = await f.Db(univag.Id, db => db.Conversas.Include(c => c.Mensagens).SingleAsync(c => c.Id == conversaId));
        Assert.Null(conversa.Desfecho);
        Assert.Equal(2, conversa.Mensagens.Count);
    }

    [Fact]
    public async Task Mesmo_cpf_email_matricula_em_duas_instituicoes()
    {
        var univag = await f.Instituicao();
        var demo = await f.Instituicao();
        var (cpf, email, matricula) = (Semente.NovoCpf(), $"{Guid.NewGuid():N}@aluno.com", "2000567890");

        var a = await f.Usuario(univag, [Papeis.Aluno], cpf: cpf, email: email, matricula: matricula);
        var b = await f.Usuario(demo, [Papeis.Aluno], cpf: cpf, email: email, matricula: matricula);

        Assert.NotEqual(a.Id, b.Id);
        var mUnivag = await f.Db(univag.Id, db => db.Matriculas.SingleAsync(m => m.Numero == matricula));
        var mDemo = await f.Db(demo.Id, db => db.Matriculas.SingleAsync(m => m.Numero == matricula));
        Assert.NotEqual(mUnivag.Id, mDemo.Id);
        Assert.Equal(a.Id, mUnivag.UsuarioId);
        Assert.Equal(b.Id, mDemo.UsuarioId);
        // dentro da mesma instituição o banco recusa a repetição
        await Assert.ThrowsAsync<DbUpdateException>(() => f.Usuario(univag, [Papeis.Aluno], cpf: cpf));
    }

    [Fact]
    public async Task Instituicao_inativa_401()
    {
        var aluno = await f.AlunoLogado();
        Assert.Equal(HttpStatusCode.OK, (await aluno.Cliente.GetAsync("/api/auth/me")).StatusCode);

        await f.Db(null, db => db.Instituicoes.Where(i => i.Id == aluno.Instituicao.Id).ExecuteUpdateAsync(s => s.SetProperty(i => i.Ativa, false)));

        Assert.Equal(HttpStatusCode.Unauthorized, (await aluno.Cliente.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task SaveChanges_recusa_outra_instituicao()
    {
        var univag = await f.Instituicao();
        var demo = await f.Instituicao();

        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Db(univag.Id, async db =>
        {
            db.Categorias.Add(new Categoria { Nome = "Da sessão" });
            db.Categorias.Add(new Categoria { Nome = "Intrusa", InstituicaoId = demo.Id });
            await db.SaveChangesAsync();
        }));
        Assert.False(await f.Db(null, db => db.Categorias.IgnoreQueryFilters().AnyAsync(c => c.Nome == "Intrusa" || c.Nome == "Da sessão")));

        var nova = await f.Db(univag.Id, async db =>
        {
            var c = new Categoria { Nome = "Sem instituição informada" };
            db.Categorias.Add(c);
            await db.SaveChangesAsync();
            return c;
        });
        Assert.Equal(univag.Id, nova.InstituicaoId);
    }
}
