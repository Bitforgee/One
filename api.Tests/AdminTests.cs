using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

public static class Admin
{
    public static async Task<(Instituicao i, HttpClient admin)> Criar(OneFactory f)
    {
        var i = await f.Instituicao(nome: "Univag");
        return (i, await f.Entrar(i, await f.Usuario(i, [Papeis.Administrador])));
    }

    public static Task<HttpResponseMessage> Importar(this HttpClient c, string csv) =>
        c.PostAsync("/api/admin/matriculas/importacao", new MultipartFormDataContent
        {
            { new ByteArrayContent(Encoding.UTF8.GetBytes(csv)), "arquivo", "alunos.csv" },
        });
}

public class AdminTests(OneFactory f) : IClassFixture<OneFactory>
{
    // C137: lê as 25 rotas /api/admin/* do próprio app.
    [Fact]
    public async Task Sem_papel_admin_403()
    {
        var i = await f.Instituicao();
        var setor = await f.Db(i.Id, db => db.Setores.SingleAsync());
        var clientes = new[] { (await f.AlunoLogado(i)).Cliente, (await f.Atendente(i, setor)).Cliente };
        var rotas = f.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>()
            .Where(e => e.RoutePattern.RawText!.StartsWith("/api/admin/"))
            .SelectMany(e => e.Metadata.GetMetadata<HttpMethodMetadata>()!.HttpMethods.Select(m => (m, e.RoutePattern.RawText!)))
            .ToList();
        Assert.Equal(25, rotas.Count);

        foreach (var c in clientes)
            foreach (var (metodo, padrao) in rotas)
            {
                var url = Regex.Replace(padrao, @"\{[^}]+\}", setor.Id.ToString());
                var r = await c.SendAsync(new HttpRequestMessage(new HttpMethod(metodo), url) { Content = metodo == "GET" ? null : JsonContent.Create(new { nome = "Intruso", triagem = true }) });
                Assert.True(r.StatusCode == HttpStatusCode.Forbidden, $"{metodo} {padrao}: {(int)r.StatusCode}");
            }
        Assert.Equal(["Triagem"], await f.Db(i.Id, db => db.Setores.Select(s => s.Nome).ToListAsync()));
    }
}

public class ImportacaoTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string Cabecalho = "cpf;nome;email;matricula;curso;semestre;situacao";

    [Fact]
    public async Task Csv_valido_cria_e_atualiza()
    {
        var (i, admin) = await Admin.Criar(f);
        var ads = await f.Db(i.Id, async db => { var c = new Curso { Nome = "ADS" }; db.Cursos.Add(c); db.Cursos.Add(new Curso { Nome = "Direito" }); await db.SaveChangesAsync(); return c; });
        var existente = await f.Usuario(i, [Papeis.Aluno], matricula: "2000000001");
        var (novo1, novo2) = (Semente.NovoCpf(), Semente.NovoCpf());
        var csv = $"""
            {Cabecalho}
            {existente.Cpf};Nome Novo;novo@aluno.com;2000000001;Direito;5;INATIVA
            {novo1};Bia;bia@aluno.com;2000000002;ADS;1;ATIVA
            {novo1};Bia;bia@aluno.com;2000000003;Direito;2;ATIVA
            {novo2};Caio;caio@aluno.com;2000000004;ADS;12;ATIVA

            """;

        var r = await admin.Importar(csv);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Json();
        Assert.Equal((3, 1), (j.GetProperty("criados").GetInt32(), j.GetProperty("atualizados").GetInt32()));
        var alunos = await f.Db(i.Id, db => db.Usuarios.Include(u => u.Papeis).Include(u => u.Matriculas).ThenInclude(m => m.Curso).Where(u => u.Papeis.Any(p => p.Papel == Papeis.Aluno)).ToListAsync());
        Assert.Equal(3, alunos.Count);
        var atualizado = alunos.Single(u => u.Cpf == existente.Cpf);
        Assert.Equal(("Nome Novo", "novo@aluno.com"), (atualizado.Nome, atualizado.Email));
        Assert.NotNull(atualizado.SenhaHash);
        var m = Assert.Single(atualizado.Matriculas);
        Assert.Equal(("Direito", 5, "INATIVA"), (m.Curso!.Nome, m.Semestre, m.Situacao));
        var bia = alunos.Single(u => u.Cpf == novo1);
        Assert.Null(bia.SenhaHash);
        Assert.Equal(["2000000002", "2000000003"], bia.Matriculas.Select(x => x.Numero).Order());
        Assert.Equal(ads.Id, alunos.Single(u => u.Cpf == novo2).Matriculas.Single().CursoId);
    }

    [Fact]
    public async Task Linha_invalida_nada_entra()
    {
        var (i, admin) = await Admin.Criar(f);
        await f.Db(i.Id, async db => { db.Cursos.Add(new Curso { Nome = "ADS" }); await db.SaveChangesAsync(); });
        var dono = await f.Usuario(i, [Papeis.Aluno], matricula: "2000000099");
        var valida = $"{Semente.NovoCpf()};Ana;ana@aluno.com;2000000001;ADS;3;ATIVA";
        // sem o arquivo no formulário
        var semArquivo = await admin.PostAsync("/api/admin/matriculas/importacao", new MultipartFormDataContent { { new StringContent("x"), "outro" } });
        Assert.Equal(HttpStatusCode.BadRequest, semArquivo.StatusCode);
        Assert.True((await semArquivo.Json()).GetProperty("errors").TryGetProperty("arquivo", out _));
        var ruins = new (string linha, string motivo)[]
        {
            ("12345678900;Bia;bia@aluno.com;2000000002;ADS;3;ATIVA", "CPF inválido"),
            ($"{Semente.NovoCpf()};Bia;sem-arroba;2000000002;ADS;3;ATIVA", "e-mail inválido"),
            ($"{Semente.NovoCpf()};Bia;bia@aluno.com;2000000002;Medicina;3;ATIVA", "curso inexistente"),
            ($"{Semente.NovoCpf()};Bia;bia@aluno.com;2000000002;ADS;0;ATIVA", "semestre fora de 1 a 12"),
            ($"{Semente.NovoCpf()};Bia;bia@aluno.com;2000000002;ADS;13;ATIVA", "semestre fora de 1 a 12"),
            ($"{Semente.NovoCpf()};Bia;bia@aluno.com;2000000002;ADS;3;TRANCADA", "situação deve ser ATIVA ou INATIVA"),
            ($"{Semente.NovoCpf()};Bia;bia@aluno.com;2000000099;ADS;3;ATIVA", "matrícula já ligada a outro CPF"),
        };
        var antes = await f.Db(i.Id, db => db.Usuarios.CountAsync());

        foreach (var (linha, motivo) in ruins)
        {
            var r = await admin.Importar($"{Cabecalho}\n{valida}\n{linha}\n");

            Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
            var erro = Assert.Single((await r.Json()).GetProperty("erros").EnumerateArray());
            Assert.Equal(3, erro.GetProperty("linha").GetInt32());
            Assert.Contains(motivo, erro.GetProperty("motivo").GetString());
        }
        Assert.Equal(antes, await f.Db(i.Id, db => db.Usuarios.CountAsync()));
        Assert.Equal(["2000000099"], await f.Db(i.Id, db => db.Matriculas.Select(m => m.Numero).ToListAsync()));
        Assert.Equal(dono.Id, await f.Db(i.Id, db => db.Matriculas.Select(m => m.UsuarioId).SingleAsync()));
    }

    [Fact]
    public async Task Matricula_inativa_sai_das_novas_transferencias()
    {
        var (i, admin) = await Admin.Criar(f);
        var aluno = await f.AlunoLogado(i);
        var m = await f.Db(i.Id, db => db.Matriculas.Include(x => x.Curso).SingleAsync(x => x.UsuarioId == aluno.Usuario.Id));
        var antigo = (await (await aluno.Cliente.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "antes" })).Json()).GetProperty("numero").GetString();

        var r = await admin.Importar($"{Cabecalho}\n{aluno.Usuario.Cpf};{aluno.Usuario.Nome};{aluno.Usuario.Email};{m.Numero};{m.Curso!.Nome};3;INATIVA\n");
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);

        var id = await f.Db(i.Id, async db =>
        {
            var c = new Conversa { AlunoId = aluno.Usuario.Id, CriadaEm = f.Relogio.GetUtcNow().UtcDateTime, UltimaMensagemEm = f.Relogio.GetUtcNow().UtcDateTime };
            c.Mensagens.Add(new MensagemConversa { Autor = "ALUNO", Texto = "depois", CriadaEm = c.CriadaEm });
            db.Conversas.Add(c);
            await db.SaveChangesAsync();
            return c.Id;
        });
        Assert.Equal(HttpStatusCode.BadRequest, (await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { matriculaId = m.Id })).StatusCode);
        Assert.Equal(m.Id, (await f.Db(i.Id, db => db.Chamados.SingleAsync(c => c.Numero == antigo))).MatriculaId);
    }
}

public class UsuarioAdminTests(OneFactory f) : IClassFixture<OneFactory>
{
    static object Corpo(string cpf, string? email = null, string[]? papeis = null, long[]? setores = null, string? senhaTemporaria = null) => new
    {
        cpf,
        nome = "Atendente Novo",
        email = email ?? $"{Guid.NewGuid():N}@univag.edu.br",
        senhaTemporaria,
        papeis = papeis ?? [Papeis.Atendente],
        setores = setores ?? [],
    };

    [Fact]
    public async Task Criar_com_e_sem_senha_temporaria()
    {
        var (i, admin) = await Admin.Criar(f);
        var triagem = await f.Db(i.Id, db => db.Setores.SingleAsync());

        var com = await admin.PostAsJsonAsync("/api/admin/usuarios", Corpo(Semente.NovoCpf(), setores: [triagem.Id], senhaTemporaria: "12345678"));
        var sem = await admin.PostAsJsonAsync("/api/admin/usuarios", Corpo(Semente.NovoCpf(), papeis: [Papeis.Administrador]));

        Assert.Equal(HttpStatusCode.Created, com.StatusCode);
        Assert.Equal(HttpStatusCode.Created, sem.StatusCode);
        var (uCom, uSem) = (await Ler(i, com), await Ler(i, sem));
        Assert.True(uCom.Ativo && uCom.DeveTrocarSenha && uCom.SenhaHash is not null);
        Assert.True(uSem.Ativo && uSem.SenhaHash is null);
        Assert.Equal([triagem.Id], await f.Db(i.Id, db => db.AtendenteSetores.Where(a => a.UsuarioId == uCom.Id).Select(a => a.SetorId).ToListAsync()));
        var login = await f.Cliente().Login(i.Slug, uCom.Cpf, "12345678");
        Assert.True((await login.Json()).GetProperty("deveTrocarSenha").GetBoolean());
    }

    async Task<Usuario> Ler(Instituicao i, HttpResponseMessage r)
    {
        var id = (await r.Json()).GetProperty("id").GetInt64();
        return await f.Db(i.Id, db => db.Usuarios.SingleAsync(u => u.Id == id));
    }

    [Fact]
    public async Task Sem_papel_ou_setor_400()
    {
        var (i, admin) = await Admin.Criar(f);
        var antes = await f.Db(i.Id, db => db.Usuarios.CountAsync());

        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/api/admin/usuarios", Corpo(Semente.NovoCpf(), papeis: []))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/api/admin/usuarios", Corpo(Semente.NovoCpf(), setores: []))).StatusCode);
        Assert.Equal(antes, await f.Db(i.Id, db => db.Usuarios.CountAsync()));
    }

    // Test policy, entrada que não decide: cada recusa do cadastro de usuário
    [Fact]
    public async Task Campos_invalidos_400()
    {
        var (i, admin) = await Admin.Criar(f);
        var triagem = await f.Db(i.Id, db => db.Setores.SingleAsync());
        var antes = await f.Db(i.Id, db => db.Usuarios.CountAsync());
        var cpf = Semente.NovoCpf();
        var recusas = new (string campo, object corpo)[]
        {
            ("cpf", new { cpf = "12345678900", nome = "X", email = "x@x.com", papeis = new[] { Papeis.Administrador } }),
            ("nome", new { cpf, nome = " ", email = "x@x.com", papeis = new[] { Papeis.Administrador } }),
            ("nome", new { cpf, nome = new string('n', 201), email = "x@x.com", papeis = new[] { Papeis.Administrador } }),
            ("email", new { cpf, nome = "X", email = "sem-arroba", papeis = new[] { Papeis.Administrador } }),
            ("papeis", new { cpf, nome = "X", email = "x@x.com", papeis = new[] { "DIRETOR" } }),
            ("setores", new { cpf, nome = "X", email = "x@x.com", papeis = new[] { Papeis.Atendente }, setores = new[] { 999999L } }),
            ("senhaTemporaria", new { cpf, nome = "X", email = "x@x.com", papeis = new[] { Papeis.Administrador }, senhaTemporaria = "1234567" }),
            ("senhaTemporaria", new { cpf, nome = "X", email = "x@x.com", papeis = new[] { Papeis.Administrador }, senhaTemporaria = new string('s', 129) }),
        };
        foreach (var (campo, corpo) in recusas)
        {
            var r = await admin.PostAsJsonAsync("/api/admin/usuarios", corpo);
            Assert.True(r.StatusCode == HttpStatusCode.BadRequest, $"{campo}: {(int)r.StatusCode}");
            Assert.True((await r.Json()).GetProperty("errors").TryGetProperty(campo, out _), campo);
        }
        Assert.Equal(antes, await f.Db(i.Id, db => db.Usuarios.CountAsync()));
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/usuarios",
            new { cpf, nome = "X", email = "x@x.com", papeis = new[] { Papeis.Atendente }, setores = new[] { triagem.Id }, senhaTemporaria = new string('s', 128) })).StatusCode);
    }

    // C10
    [Fact]
    public async Task Cpf_ou_email_repetido_409()
    {
        var (i, admin) = await Admin.Criar(f);
        var demo = await f.Instituicao();
        var existente = await f.Usuario(i, [Papeis.Aluno]);
        var deOutra = await f.Usuario(demo, [Papeis.Aluno]);
        var antes = await f.Db(i.Id, db => db.Usuarios.CountAsync());

        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync("/api/admin/usuarios", Corpo(existente.Cpf, papeis: [Papeis.Administrador]))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync("/api/admin/usuarios", Corpo(Semente.NovoCpf(), existente.Email, [Papeis.Administrador]))).StatusCode);
        Assert.Equal(antes, await f.Db(i.Id, db => db.Usuarios.CountAsync()));
        // AC 8: o mesmo CPF e e-mail de outra instituição são aceitos
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/usuarios", Corpo(deOutra.Cpf, deOutra.Email, [Papeis.Administrador]))).StatusCode);
    }

    [Fact]
    public async Task Senha_temporaria_obriga_troca()
    {
        var (i, admin) = await Admin.Criar(f);
        var aluno = await f.Usuario(i, [Papeis.Aluno]);

        var r = await admin.PutAsJsonAsync($"/api/admin/usuarios/{aluno.Id}", new { cpf = aluno.Cpf, nome = aluno.Nome, email = aluno.Email, papeis = new[] { Papeis.Aluno }, senhaTemporaria = "temporaria-1" });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.True((await f.Db(i.Id, db => db.Usuarios.SingleAsync(u => u.Id == aluno.Id))).DeveTrocarSenha);
        Assert.Equal(HttpStatusCode.OK, (await f.Cliente().Login(i.Slug, aluno.Cpf, "temporaria-1")).StatusCode);
    }

    [Fact]
    public async Task Desativar_mantem_historico()
    {
        var b = await Balcao.Criar(f);
        var admin = await f.Entrar(b.Instituicao, await f.Usuario(b.Instituicao, [Papeis.Administrador]));
        var numero = await b.Chamado(Resolvido);
        var contar = () => f.Db(b.Instituicao.Id, async db => (await db.Conversas.CountAsync(), await db.Chamados.CountAsync(), await db.MensagensChamado.CountAsync(), await db.EventosChamado.CountAsync(), await db.MensagensConversa.CountAsync()));
        var antes = await contar();

        var r = await admin.PostAsJsonAsync($"/api/admin/usuarios/{b.Aluno.Usuario.Id}/desativar", new { });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.False((await f.Db(b.Instituicao.Id, db => db.Usuarios.SingleAsync(u => u.Id == b.Aluno.Usuario.Id))).Ativo);
        Assert.Equal(antes, await contar());
        Assert.Equal(b.Aluno.Usuario.Id, (await b.Ler(numero)).SolicitanteId);
    }

    [Fact]
    public async Task Desativar_atendente_devolve_chamados()
    {
        var b = await Balcao.Criar(f);
        var adminUsuario = await f.Usuario(b.Instituicao, [Papeis.Administrador]);
        var admin = await f.Entrar(b.Instituicao, adminUsuario);
        var em = await b.Chamado(EmAtendimento);
        var aguardando = await b.Chamado(AguardandoAluno);
        var resolvido = await b.Chamado(Resolvido);
        var fechado = await b.Chamado(Fechado);

        var r = await admin.PostAsJsonAsync($"/api/admin/usuarios/{b.A.Usuario.Id}/desativar", new { });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        foreach (var (numero, estado) in new[] { (em, Aberto), (aguardando, Aberto), (resolvido, Resolvido) })
        {
            var c = await b.Ler(numero);
            Assert.Equal((estado, (long?)null), (c.Estado, c.ResponsavelId));
            Assert.Contains(await b.Eventos(numero), e => e.Tipo == "ATRIBUICAO" && e.AtorId == adminUsuario.Id && e.De == b.A.Usuario.Nome);
        }
        Assert.Contains(await b.Eventos(em), e => e.Tipo == "TRANSICAO" && e.AtorId == adminUsuario.Id && e.Para == Aberto);
        Assert.Equal(b.A.Usuario.Id, (await b.Ler(fechado)).ResponsavelId);
    }

    [Fact]
    public async Task Usuario_inexistente_404()
    {
        var (_, admin) = await Admin.Criar(f);

        Assert.Equal(HttpStatusCode.NotFound, (await admin.PutAsJsonAsync("/api/admin/usuarios/999999", Corpo(Semente.NovoCpf(), papeis: [Papeis.Administrador]))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsJsonAsync("/api/admin/usuarios/999999/desativar", new { })).StatusCode);
    }
}

public class CadastroTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Triagem_zero_ou_duas_400()
    {
        var (i, admin) = await Admin.Criar(f);
        var triagem = await f.Db(i.Id, db => db.Setores.SingleAsync());
        var outro = await f.Setor(i, "Financeiro");

        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync($"/api/admin/setores/{triagem.Id}", new { nome = "Triagem", triagem = false })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync($"/api/admin/setores/{outro.Id}", new { nome = "Financeiro", triagem = true })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/api/admin/setores", new { nome = "Nova triagem", triagem = true })).StatusCode);
        Assert.Equal([triagem.Id], await f.Db(i.Id, db => db.Setores.Where(s => s.Triagem).Select(s => s.Id).ToListAsync()));
        Assert.Equal(2, await f.Db(i.Id, db => db.Setores.CountAsync()));
    }

    [Fact]
    public async Task Indice_recusa_segundo_setor_de_triagem()
    {
        var i = await f.Instituicao();
        await using var con = new Npgsql.NpgsqlConnection(f.ConnectionString);
        await con.OpenAsync();
        await using var cmd = new Npgsql.NpgsqlCommand($"INSERT INTO setor (instituicao_id, nome, triagem, ativo) VALUES ({i.Id}, 'Outra triagem', true, true)", con);

        var e = await Assert.ThrowsAsync<Npgsql.PostgresException>(() => cmd.ExecuteNonQueryAsync());

        Assert.Equal("ux_setor_triagem", e.ConstraintName);
    }

    [Fact]
    public async Task Regra_unica_por_categoria()
    {
        var (i, admin) = await Admin.Criar(f);
        var categoria = await f.Categoria(i, "Boleto");
        var financeiro = await f.Setor(i, "Financeiro");

        var primeira = await admin.PostAsJsonAsync("/api/admin/regras", new { categoriaId = categoria.Id, destino = "SETOR", setorId = financeiro.Id });
        var segunda = await admin.PostAsJsonAsync("/api/admin/regras", new { categoriaId = categoria.Id, destino = "COORDENACAO_CURSO" });

        Assert.Equal(HttpStatusCode.Created, primeira.StatusCode);
        Assert.Equal(HttpStatusCode.OK, segunda.StatusCode);
        var regra = await f.Db(i.Id, db => db.Regras.SingleAsync(r => r.CategoriaId == categoria.Id));
        Assert.Equal(("COORDENACAO_CURSO", (long?)null), (regra.Destino, regra.SetorId));
    }

    [Fact]
    public async Task Regra_setor_fixo_sem_setor_400()
    {
        var (i, admin) = await Admin.Criar(f);
        var categoria = await f.Categoria(i, "Boleto");

        var r = await admin.PostAsJsonAsync("/api/admin/regras", new { categoriaId = categoria.Id, destino = "SETOR" });

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Equal(0, await f.Db(i.Id, db => db.Regras.CountAsync()));
    }

    [Fact]
    public async Task Curso_com_coordenacao_roteia()
    {
        var (i, admin) = await Admin.Criar(f);
        var aluno = await f.AlunoLogado(i);
        var curso = await f.Db(i.Id, db => db.Cursos.SingleAsync());
        var notas = await f.Categoria(i, "Notas");
        var coordAds = (await (await admin.PostAsJsonAsync("/api/admin/setores", new { nome = "Coordenação ADS" })).Json()).GetProperty("id").GetInt64();
        await admin.PostAsJsonAsync("/api/admin/regras", new { categoriaId = notas.Id, destino = "COORDENACAO_CURSO" });

        var r = await admin.PutAsJsonAsync($"/api/admin/cursos/{curso.Id}", new { nome = curso.Nome, setorCoordenacaoId = coordAds });
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);

        f.Llm.Devolver(new { tipo = "pergunta", texto = "Qual disciplina?", categoriaId = notas.Id });
        var id = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "minha nota" })).Json()).GetProperty("conversaId").GetInt64();
        var transferido = await (await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { })).Json();
        Assert.Equal("Coordenação ADS", transferido.GetProperty("setor").GetString());
    }

    // Test policy, entrada que não decide: cada recusa dos cadastros de curso, regra e resposta pronta
    [Fact]
    public async Task Recusas_dos_cadastros_400()
    {
        var (i, admin) = await Admin.Criar(f);
        var setor = await f.Setor(i, "Financeiro");
        var categoria = await f.Categoria(i, "Boleto");
        var padrao = await f.Db(i.Id, db => db.Categorias.SingleAsync(c => c.Padrao));
        var recusas = new (string rota, string campo, object corpo)[]
        {
            ("setores", "nome", new { nome = " " }),
            ("setores", "nome", new { nome = new string('s', 101) }),
            ("categorias", "nome", new { nome = "" }),
            ("categorias", "nome", new { nome = new string('c', 101) }),
            ("cursos", "nome", new { nome = "" }),
            ("cursos", "nome", new { nome = new string('c', 201) }),
            ("cursos", "setorCoordenacaoId", new { nome = "Direito", setorCoordenacaoId = 999999 }),
            ("regras", "categoriaId", new { categoriaId = 999999, destino = "COORDENACAO_CURSO" }),
            ("regras", "categoriaId", new { categoriaId = padrao.Id, destino = "COORDENACAO_CURSO" }),
            ("regras", "destino", new { categoriaId = categoria.Id, destino = "QUALQUER" }),
            ("regras", "setorId", new { categoriaId = categoria.Id, destino = "SETOR", setorId = 999999 }),
            ("respostas-prontas", "setorId", new { setorId = 999999, titulo = "Boleto", texto = "x" }),
            ("respostas-prontas", "titulo", new { setorId = setor.Id, titulo = " ", texto = "x" }),
            ("respostas-prontas", "titulo", new { setorId = setor.Id, titulo = new string('t', 201), texto = "x" }),
            ("respostas-prontas", "texto", new { setorId = setor.Id, titulo = "Boleto", texto = "" }),
            ("respostas-prontas", "texto", new { setorId = setor.Id, titulo = "Boleto", texto = new string('t', 4001) }),
        };
        foreach (var (rota, campo, corpo) in recusas)
        {
            var r = await admin.PostAsJsonAsync($"/api/admin/{rota}", corpo);
            Assert.True(r.StatusCode == HttpStatusCode.BadRequest, $"{rota}.{campo}: {(int)r.StatusCode}");
            Assert.True((await r.Json()).GetProperty("errors").TryGetProperty(campo, out _), $"{rota}.{campo}");
        }
        Assert.Equal(0, await f.Db(i.Id, db => db.Regras.CountAsync()));
        Assert.Equal(0, await f.Db(i.Id, db => db.RespostasProntas.CountAsync()));
        Assert.Equal(0, await f.Db(i.Id, db => db.Cursos.CountAsync()));
        Assert.Equal(["Financeiro", "Triagem"], await f.Db(i.Id, db => db.Setores.OrderBy(x => x.Nome).Select(x => x.Nome).ToListAsync()));
        Assert.Equal(["Boleto", "Não classificado"], await f.Db(i.Id, db => db.Categorias.OrderBy(x => x.Nome).Select(x => x.Nome).ToListAsync()));
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/respostas-prontas", new { setorId = setor.Id, titulo = "Boleto", texto = new string('t', 4000) })).StatusCode);
    }

    [Fact]
    public async Task Renomear_nao_classificado_400()
    {
        var (i, admin) = await Admin.Criar(f);
        var padrao = await f.Db(i.Id, db => db.Categorias.SingleAsync(c => c.Padrao));

        var r = await admin.PutAsJsonAsync($"/api/admin/categorias/{padrao.Id}", new { nome = "Outros" });

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Equal("Não classificado", (await f.Db(i.Id, db => db.Categorias.SingleAsync(c => c.Padrao))).Nome);
    }

    [Fact]
    public async Task Crud_dos_cadastros()
    {
        var (i, admin) = await Admin.Criar(f);
        var setor = await f.Setor(i, "Financeiro");
        var categoria = await f.Categoria(i, "Boleto");
        var cadastros = new (string rota, object novo, object alterado, string campo, string valor)[]
        {
            ("setores", new { nome = "Secretaria" }, new { nome = "Secretaria Acadêmica" }, "nome", "Secretaria Acadêmica"),
            ("categorias", new { nome = "Notas" }, new { nome = "Notas e frequência" }, "nome", "Notas e frequência"),
            ("cursos", new { nome = "Direito" }, new { nome = "Direito", setorCoordenacaoId = setor.Id }, "setorCoordenacaoId", setor.Id.ToString()),
            ("regras", new { categoriaId = categoria.Id, destino = "COORDENACAO_CURSO" }, new { categoriaId = categoria.Id, destino = "SETOR", setorId = setor.Id }, "destino", "SETOR"),
            ("respostas-prontas", new { setorId = setor.Id, titulo = "Boleto", texto = "Segue o boleto." }, new { setorId = setor.Id, titulo = "Boleto", texto = "Segue o boleto atualizado." }, "texto", "Segue o boleto atualizado."),
        };
        foreach (var (rota, novo, alterado, campo, valor) in cadastros)
        {
            var criado = await admin.PostAsJsonAsync($"/api/admin/{rota}", novo);
            Assert.True(criado.StatusCode == HttpStatusCode.Created, $"POST {rota}: {(int)criado.StatusCode}");
            var id = (await criado.Json()).GetProperty("id").GetInt64();

            var lista = await admin.GetAsync($"/api/admin/{rota}");
            Assert.Equal(HttpStatusCode.OK, lista.StatusCode);
            Assert.Contains((await lista.Json()).EnumerateArray(), x => x.GetProperty("id").GetInt64() == id);

            var put = await admin.PutAsJsonAsync($"/api/admin/{rota}/{id}", alterado);
            Assert.True(put.StatusCode == HttpStatusCode.OK, $"PUT {rota}: {(int)put.StatusCode}");
            Assert.Equal(valor, (await put.Json()).GetProperty(campo).ToString());

            Assert.Equal(HttpStatusCode.NotFound, (await admin.PutAsJsonAsync($"/api/admin/{rota}/999999", alterado)).StatusCode);
        }
    }

    [Fact]
    public async Task Nome_repetido_409()
    {
        var (i, admin) = await Admin.Criar(f);
        var setor = await f.Setor(i, "Financeiro");
        await f.Db(i.Id, async db => { db.Cursos.Add(new Curso { Nome = "ADS" }); db.RespostasProntas.Add(new RespostaPronta { SetorId = setor.Id, Titulo = "Boleto", Texto = "x" }); await db.SaveChangesAsync(); });

        foreach (var (rota, corpo) in new (string, object)[]
        {
            ("setores", new { nome = "Financeiro" }),
            ("categorias", new { nome = "Não classificado" }),
            ("cursos", new { nome = "ADS" }),
            ("respostas-prontas", new { setorId = setor.Id, titulo = "Boleto", texto = "y" }),
        })
            Assert.True((await admin.PostAsJsonAsync($"/api/admin/{rota}", corpo)).StatusCode == HttpStatusCode.Conflict, rota);
    }
}
