using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Tests.Infra.SementeAtendimento;

namespace One.Api.Tests.Infra;

// Uma instituição com o curso ADS (coordenação própria), a liderança do 3º semestre e o fluxo "Liderança do semestre → Coordenação do curso",
// mais um aluno de ADS 3º semestre, um líder e um atendente da coordenação.
public record Turma(OneFactory F, Instituicao I, Curso Curso, Setor Coordenacao, Setor? Lideranca, Categoria Duvida, Aluno Aluno, Atendente? Lider, Atendente Coord)
{
    public const int Semestre = 3;

    public static async Task<Turma> Criar(OneFactory f, bool comLider = true, bool liderancaAtiva = true, Instituicao? instituicao = null, int? prazoDaLideranca = 48)
    {
        var i = instituicao ?? await f.Instituicao(nome: "Univag");
        var coordenacao = await f.Setor(i, "Coordenação");
        var curso = await f.Db(i.Id, async db =>
        {
            var c = new Curso { Nome = "ADS", SetorCoordenacaoId = coordenacao.Id };
            db.Cursos.Add(c);
            await db.SaveChangesAsync();
            return c;
        });
        var lideranca = await f.Lideranca(i, curso, Semestre, "Líderes ADS 3º", liderancaAtiva);
        var duvida = await f.Categoria(i, "Dúvida");
        await f.Fluxo(i, duvida, curso.Id, Semestre, Etapa(DestinosEtapa.LiderancaSemestre, prazoHoras: prazoDaLideranca), Etapa(DestinosEtapa.CoordenacaoCurso));
        return new Turma(f, i, curso, coordenacao, lideranca, duvida, await f.AlunoLogado(i), comLider ? await f.Atendente(i, lideranca) : null, await f.Atendente(i, coordenacao));
    }

    public HttpClient ClienteAluno => Aluno.Cliente;

    // O aluno conversa com o assistente; devolve o id da conversa, ainda aberta.
    public async Task<long> Conversa(Aluno? aluno = null, Categoria? categoria = null)
    {
        F.Llm.Devolver(new { tipo = "pergunta", texto = "Pode detalhar?", categoriaId = (categoria ?? Duvida).Id, resumo = "Dúvida sobre a nota da prova." });
        var r = await (aluno ?? Aluno).Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "preciso de ajuda com a nota" });
        return (await r.Json()).GetProperty("conversaId").GetInt64();
    }

    public async Task<string> Transferir(object? corpo = null, Aluno? aluno = null, bool semCorpo = false)
    {
        var conversa = await Conversa(aluno);
        var cliente = (aluno ?? Aluno).Cliente;
        var r = semCorpo
            ? await cliente.PostAsync($"/api/conversas/{conversa}/transferir", null)
            : await cliente.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", corpo ?? new { });
        Assert.True(r.StatusCode == System.Net.HttpStatusCode.Created, $"{(int)r.StatusCode} {await r.Content.ReadAsStringAsync()} (conversa {conversa})");
        return (await r.Json()).GetProperty("numero").GetString()!;
    }

    // Um chamado aberto na liderança, com o aceite do aluno.
    public Task<string> NaLideranca() => Transferir(new { aceitaLideranca = true });

    public async Task<JsonElement> Destino(long conversa, Aluno? aluno = null, long? matriculaId = null)
    {
        var r = await (aluno ?? Aluno).Cliente.GetAsync($"/api/conversas/{conversa}/destino" + (matriculaId is null ? "" : $"?matriculaId={matriculaId}"));
        Assert.Equal(System.Net.HttpStatusCode.OK, r.StatusCode);
        return await r.Json();
    }

    public Task<Chamado> Ler(string numero) => F.Db(I.Id, db => db.Chamados.SingleAsync(c => c.Numero == numero));

    public async Task<JsonElement> Detalhe(HttpClient c, string numero) => await (await c.GetAsync($"/api/chamados/{numero}")).Json();
}

public static class SementeLideranca
{
    public static Task<Setor> Lideranca(this OneFactory f, Instituicao i, Curso curso, int semestre, string nome, bool ativo = true) =>
        f.Db(i.Id, async db =>
        {
            var s = new Setor { Nome = nome, CursoId = curso.Id, Semestre = semestre, Ativo = ativo };
            db.Setores.Add(s);
            await db.SaveChangesAsync();
            return s;
        });
}
