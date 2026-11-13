using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class IsolamentoTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Recurso_de_outra_instituicao_404()
    {
        var univag = await f.Instituicao(nome: "Univag");
        var demo = await f.Instituicao(nome: "Demo");
        var artigo = await f.Artigo(univag, "Como emitir o boleto do semestre", "O boleto fica no Portal do Aluno, no menu Financeiro.");
        var versaoId = await f.Db(univag.Id, db => db.VersoesArtigo.Where(v => v.ArtigoId == artigo.Id).Select(v => v.Id).SingleAsync());
        var alunoUnivag = await f.AlunoLogado(univag);
        var conversaId = (await (await alunoUnivag.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "oi" })).Json()).GetProperty("conversaId").GetInt64();
        var numero = (await (await alunoUnivag.Cliente.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "oi" })).Json()).GetProperty("numero").GetString()!;
        var anexo = (await (await Balcao.ComAnexos(alunoUnivag.Cliente, numero, "segue", "PUBLICA", ("a.pdf", Balcao.Arquivo(Balcao.Pdf, 100)))).Json())
            .GetProperty("mensagens")[0].GetProperty("anexos")[0].GetProperty("id").GetInt64();
        var (setor, categoria, curso) = await f.Db(univag.Id, async db => (await db.Setores.SingleAsync(), await db.Categorias.SingleAsync(c => c.Padrao), await db.Cursos.SingleAsync()));
        var boleto = await f.Categoria(univag, "Boleto");
        var regra = await f.Regra(univag, boleto, setor);
        var pronta = await f.Db(univag.Id, async db => { var r = RespostaPronta.Criar(setor.Id, "Boleto", "x"); db.RespostasProntas.Add(r); await db.SaveChangesAsync(); return r; });

        var alunoDemo = await f.AlunoLogado(demo);
        var equipeDemo = await f.Entrar(demo, await f.Usuario(demo, [Papeis.Atendente, Papeis.Administrador]));
        var setorDemo = await f.Db(demo.Id, db => db.Setores.SingleAsync());
        var usuario = new { cpf = Semente.NovoCpf(), nome = "X", email = "x@x.com", papeis = new[] { Papeis.Administrador } };

        var rotas = new (HttpClient cliente, HttpMethod metodo, string url, object? corpo)[]
        {
            (alunoDemo.Cliente, HttpMethod.Get, $"/api/conversas/{conversaId}", null),
            (alunoDemo.Cliente, HttpMethod.Post, $"/api/conversas/{conversaId}/mensagens", new { mensagem = "oi" }),
            (alunoDemo.Cliente, HttpMethod.Post, $"/api/conversas/{conversaId}/avaliacao", new { resolveu = true }),
            (alunoDemo.Cliente, HttpMethod.Post, $"/api/conversas/{conversaId}/encerrar", null),
            (alunoDemo.Cliente, HttpMethod.Post, $"/api/conversas/{conversaId}/transferir", new { }),
            (equipeDemo, HttpMethod.Get, $"/api/artigos/versoes/{versaoId}", null),
            (alunoDemo.Cliente, HttpMethod.Get, $"/api/anexos/{anexo}", null),
            (equipeDemo, HttpMethod.Post, $"/api/chamados/{numero}/duplicado", new { numeroOriginal = numero }),
            (equipeDemo, HttpMethod.Put, $"/api/admin/usuarios/{alunoUnivag.Usuario.Id}", usuario),
            (equipeDemo, HttpMethod.Post, $"/api/admin/usuarios/{alunoUnivag.Usuario.Id}/desativar", new { }),
            (equipeDemo, HttpMethod.Put, $"/api/admin/setores/{setor.Id}", new { nome = "Invadido", triagem = true }),
            (equipeDemo, HttpMethod.Put, $"/api/admin/categorias/{categoria.Id}", new { nome = "Invadido" }),
            (equipeDemo, HttpMethod.Put, $"/api/admin/cursos/{curso.Id}", new { nome = "Invadido" }),
            (equipeDemo, HttpMethod.Put, $"/api/admin/regras/{regra.Id}", new { categoriaId = boleto.Id, destino = "COORDENACAO_CURSO" }),
            (equipeDemo, HttpMethod.Put, $"/api/admin/respostas-prontas/{pronta.Id}", new { setorId = setorDemo.Id, titulo = "Invadido", texto = "x" }),
            (equipeDemo, HttpMethod.Put, $"/api/admin/artigos/{artigo.Id}", new { titulo = "Invadido", perguntas = new[] { "x?" }, categoriaId = categoria.Id, resposta = "x", links = Array.Empty<string>() }),
            (equipeDemo, HttpMethod.Post, $"/api/admin/artigos/{artigo.Id}/ativar", new { }),
            (equipeDemo, HttpMethod.Post, $"/api/admin/artigos/{artigo.Id}/arquivar", new { }),
        };
        foreach (var (cliente, metodo, url, corpo) in rotas)
        {
            var r = await cliente.SendAsync(new HttpRequestMessage(metodo, url) { Content = corpo is null ? null : JsonContent.Create(corpo) });
            Assert.True(r.StatusCode == HttpStatusCode.NotFound, $"{metodo} {url}: {(int)r.StatusCode}");
        }
        foreach (var cliente in new[] { alunoDemo.Cliente, equipeDemo })
            foreach (var (metodo, url, corpo) in VisibilidadeTests.RotasDoChamado(numero, setorDemo.Id, categoria.Id))
            {
                var r = await cliente.SendAsync(new HttpRequestMessage(metodo, url) { Content = corpo });
                Assert.True(r.StatusCode == HttpStatusCode.NotFound, $"{metodo} {url}: {(int)r.StatusCode}");
            }

        var conversa = await f.Db(univag.Id, db => db.Conversas.Include(c => c.Mensagens).SingleAsync(c => c.Id == conversaId));
        Assert.Null(conversa.Desfecho);
        Assert.Equal(2, conversa.Mensagens.Count);
        Assert.Equal("ABERTO", (await f.Db(univag.Id, db => db.Chamados.SingleAsync(c => c.Numero == numero))).Estado);
        Assert.Equal(1, await f.Db(univag.Id, db => db.MensagensChamado.CountAsync()));
        var nomes = await f.Db(univag.Id, async db =>
            (await db.Setores.Select(x => x.Nome).ToListAsync()).Concat(await db.Categorias.Select(x => x.Nome).ToListAsync())
            .Concat(await db.Cursos.Select(x => x.Nome).ToListAsync()).Concat(await db.RespostasProntas.Select(x => x.Titulo).ToListAsync()).ToList());
        Assert.DoesNotContain("Invadido", nomes);
        Assert.True((await f.Db(univag.Id, db => db.Usuarios.SingleAsync(u => u.Id == alunoUnivag.Usuario.Id))).Ativo);
        Assert.Equal("SETOR", (await f.Db(univag.Id, db => db.EtapasFluxo.SingleAsync())).Destino);
        var artigoDepois = await f.Db(univag.Id, db => db.Artigos.Include(x => x.Versoes).SingleAsync(x => x.Id == artigo.Id));
        Assert.Equal(("ATIVO", 1), (artigoDepois.Estado, artigoDepois.Versoes.Count));
    }

    [Fact]
    public async Task Id_de_outra_instituicao_no_corpo_400()
    {
        var univag = await Balcao.Criar(f);
        var demo = await Balcao.Criar(f, await f.Instituicao(nome: "Demo"));
        var categoriaUnivag = await f.Categoria(univag.Instituicao, "Boleto");
        var matriculaUnivag = await f.Db(univag.Instituicao.Id, db => db.Matriculas.Select(m => m.Id).FirstAsync());
        var numero = await demo.Chamado(EstadosChamado.EmAtendimento);
        var conversa = (await (await demo.ClienteAluno.PostAsJsonAsync("/api/conversas", new { mensagem = "oi" })).Json()).GetProperty("conversaId").GetInt64();
        var antes = await demo.Ler(numero);
        await univag.Chamado();
        await univag.Chamado();
        var daUnivag = await univag.Chamado();
        Assert.False(await f.Db(demo.Instituicao.Id, db => db.Chamados.AnyAsync(c => c.Numero == daUnivag)));

        var respostas = new[]
        {
            await demo.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/duplicado", new { numeroOriginal = daUnivag }),
            await demo.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/reclassificar", new { categoriaId = categoriaUnivag.Id }),
            await demo.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/encaminhar", new { setorId = univag.Outro.Id, motivo = "outro" }),
            await demo.ClienteAluno.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { matriculaId = matriculaUnivag }),
            await demo.ClienteAluno.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "oi", matriculaId = matriculaUnivag }),
        };

        Assert.All(respostas, r => Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode));
        var depois = await demo.Ler(numero);
        Assert.Equal((antes.CategoriaId, antes.SetorId), (depois.CategoriaId, depois.SetorId));
        Assert.Equal(1, await f.Db(demo.Instituicao.Id, db => db.Chamados.CountAsync()));
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
            db.Categorias.Add(Categoria.Criar("Da sessão"));
            var intrusa = Categoria.Criar("Intrusa");
            intrusa.InstituicaoId = demo.Id;
            db.Categorias.Add(intrusa);
            await db.SaveChangesAsync();
        }));
        Assert.False(await f.Db(null, db => db.Categorias.IgnoreQueryFilters().AnyAsync(c => c.Nome == "Intrusa" || c.Nome == "Da sessão")));

        var nova = await f.Db(univag.Id, async db =>
        {
            var c = Categoria.Criar("Sem instituição informada");
            db.Categorias.Add(c);
            await db.SaveChangesAsync();
            return c;
        });
        Assert.Equal(univag.Id, nova.InstituicaoId);
    }

    [Fact]
    public async Task Lideranca_de_outra_instituicao_nunca_recebe()
    {
        var a = await Turma.Criar(f);
        var b = await Turma.Criar(f, comLider: false);
        await f.Db(b.I.Id, db => db.Setores.Where(s => s.Id == b.Lideranca!.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Ativo, false)));

        var numero = await b.Transferir();

        var chamado = await b.Ler(numero);
        Assert.Equal((b.Coordenacao.Id, 2), (chamado.SetorId, chamado.EtapaOrdem));
        Assert.Equal(HttpStatusCode.NotFound, (await a.Lider!.Cliente.GetAsync($"/api/chamados/{numero}")).StatusCode);
        Assert.False((await b.Destino(await b.Conversa())).GetProperty("lideranca").GetBoolean());
        Assert.Equal(0, await f.Db(a.I.Id, db => db.Chamados.CountAsync()));
    }
}
