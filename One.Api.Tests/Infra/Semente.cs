using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using One.Api.Assistente;
using One.Api.Conhecimento;
using One.Api.Dados;

namespace One.Api.Tests.Infra;

public record Aluno(Instituicao Instituicao, Usuario Usuario, string Senha, HttpClient Cliente);

public static class Semente
{
    public const string Senha = "senha-boa-123";

    public static string NovoCpf()
    {
        var d = Enumerable.Range(0, 9).Select(_ => Random.Shared.Next(10)).ToList();
        for (var n = 9; n <= 10; n++)
        {
            var soma = 0;
            for (var i = 0; i < n; i++) soma += d[i] * (n + 1 - i);
            var r = soma * 10 % 11;
            d.Add(r == 10 ? 0 : r);
        }
        return string.Concat(d);
    }

    public static string NovoSlug() => "i" + Guid.NewGuid().ToString("N")[..10];

    public static Task<Instituicao> Instituicao(this OneFactory f, string? slug = null, string? nome = null, string fuso = "America/Cuiaba") =>
        f.Db(null, async db =>
        {
            var i = new Instituicao { Slug = slug ?? NovoSlug(), Nome = nome ?? "Instituição de teste", Fuso = fuso, CriadaEm = f.Relogio.GetUtcNow().UtcDateTime };
            db.Instituicoes.Add(i);
            await db.SaveChangesAsync();
            db.InstituicaoAtual = i.Id;
            db.Setores.Add(new Setor { Nome = "Triagem", Triagem = true });
            db.Categorias.Add(new Categoria { Nome = "Não classificado", Padrao = true });
            await db.SaveChangesAsync();
            return i;
        });

    public static Task<Usuario> Usuario(this OneFactory f, Instituicao i, string[] papeis, string? senha = Senha, string? cpf = null,
        string? email = null, string? matricula = null, string situacao = "ATIVA", bool deveTrocarSenha = false) =>
        f.Db(i.Id, async db =>
        {
            var u = One.Api.Dados.Usuarios.Usuario.Criar(cpf ?? NovoCpf(), "Pessoa " + Guid.NewGuid().ToString("N")[..6], email ?? $"{Guid.NewGuid():N}@teste.one", papeis);
            if (senha is not null)
            {
                var hash = new PasswordHasher<Usuario>().HashPassword(u, senha);
                if (deveTrocarSenha) u.DefinirSenhaTemporaria(hash);
                else u.TrocarSenha(hash);
            }
            if (matricula is not null || papeis.Contains(Papeis.Aluno))
            {
                var curso = await db.Cursos.FirstOrDefaultAsync() ?? new Curso { Nome = "Análise e Desenvolvimento de Sistemas" };
                u.Matriculas.Add(new Matricula { Curso = curso, Numero = matricula ?? Random.Shared.NextInt64(1_000_000_000, 9_999_999_999).ToString(), Semestre = 3, Situacao = situacao });
            }
            db.Usuarios.Add(u);
            await db.SaveChangesAsync();
            return u;
        });

    public static async Task<HttpResponseMessage> Login(this HttpClient c, string slug, string cpf, string senha = Senha) =>
        await c.PostAsJsonAsync("/api/auth/login", new { instituicao = slug, cpf, senha });

    public static async Task<HttpClient> Entrar(this OneFactory f, Instituicao i, Usuario u, string senha = Senha)
    {
        var c = f.Cliente();
        var r = await c.Login(i.Slug, u.Cpf, senha);
        Assert.Equal(System.Net.HttpStatusCode.OK, r.StatusCode);
        return c;
    }

    public static async Task<Aluno> AlunoLogado(this OneFactory f, Instituicao? i = null)
    {
        i ??= await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Aluno]);
        return new Aluno(i, u, Senha, await f.Entrar(i, u));
    }

    public static Task<Categoria> Categoria(this OneFactory f, Instituicao i, string nome, bool ativa = true) =>
        f.Db(i.Id, async db =>
        {
            var c = new Categoria { Nome = nome, Ativa = ativa };
            db.Categorias.Add(c);
            await db.SaveChangesAsync();
            return c;
        });

    public static long Fonte(long artigoId) => 1_000_000 + artigoId;

    public static Task<Artigo> Artigo(this OneFactory f, Instituicao i, string titulo, string resposta, string[]? links = null,
        string estado = EstadosArtigo.Ativo, long? categoriaId = null) =>
        f.Db(i.Id, async db =>
        {
            var versao = new VersaoArtigo { Numero = 1, Titulo = titulo, Perguntas = [titulo + "?"], Resposta = resposta, Links = [.. links ?? []], CriadaEm = f.Relogio.GetUtcNow().UtcDateTime };
            var a = One.Api.Dados.Artigos.Artigo.Criar(categoriaId ?? (await db.Categorias.FirstAsync()).Id, null, null, versao);
            if (estado == EstadosArtigo.Ativo) a.Ativar();
            else if (estado == EstadosArtigo.Arquivado) a.Arquivar();
            db.Artigos.Add(a);
            await db.SaveChangesAsync();
            if (estado == EstadosArtigo.Ativo)
            {
                var trecho = Fontes.DoArtigo(versao, f.Relogio.GetUtcNow().UtcDateTime);
                trecho.Id = Fonte(a.Id);
                trecho.Embedding = new Pgvector.Vector(LlmFalso.Vetor(trecho.Texto));
                db.TrechosFonte.Add(trecho);
                await db.SaveChangesAsync();
            }
            return a;
        });

    public static async Task<JsonElement> Json(this HttpResponseMessage r) =>
        JsonDocument.Parse(await r.Content.ReadAsStringAsync()).RootElement;
}
