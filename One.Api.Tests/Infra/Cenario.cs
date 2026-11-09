using System.Net.Http.Json;
using System.Text.Json;
using One.Api.Dados;

namespace One.Api.Tests.Infra;

public record Cenario(Instituicao Instituicao, Aluno Aluno, Artigo Boleto, Artigo Faltas)
{
    public const string RespostaBoleto = "O boleto do semestre fica no Portal do Aluno, no menu Financeiro. O prazo de pagamento é o dia 10 de cada mês.";
    public const string RespostaFaltas = "Faltas não são abonadas, nem com atestado médico. O atestado só justifica a ausência em dia de prova.";
    public const string LinkBoleto = "https://portal.univag.edu.br/financeiro";
    public const string LinkBiblioteca = "http://biblioteca.univag.edu.br";
    public const string TrechoBoleto = "fica no Portal do Aluno, no menu Financeiro";
    public const string TrechoFaltas = "Faltas não são abonadas, nem com atestado médico";

    public HttpClient Cliente => Aluno.Cliente;

    public static async Task<Cenario> Criar(OneFactory f)
    {
        var i = await f.Instituicao(nome: "Univag");
        var boleto = await f.Artigo(i, "Como emitir o boleto do semestre", RespostaBoleto, [LinkBoleto, LinkBiblioteca]);
        var faltas = await f.Artigo(i, "Faltas não são abonadas", RespostaFaltas);
        return new Cenario(i, await f.AlunoLogado(i), boleto, faltas);
    }

    public static object Resposta(string texto, long[] artigoIds, params (long artigoId, string texto)[] trechos) => new
    {
        tipo = "resposta",
        texto,
        fonteIds = artigoIds.Select(Semente.Fonte),
        trechos = trechos.Select(t => new { fonteId = Semente.Fonte(t.artigoId), t.texto }),
        categoriaId = (long?)null,
        resumo = "Aluno pergunta sobre o boleto.",
    };

    public object RespostaBoletoValida(string texto = "Você encontra o boleto no Portal do Aluno, na área financeira.") =>
        Resposta(texto, [Boleto.Id], (Boleto.Id, TrechoBoleto));

    public async Task<(long conversaId, JsonElement resposta)> Primeira(string mensagem = "preciso do boleto")
    {
        var r = await Cliente.PostAsJsonAsync("/api/conversas", new { mensagem });
        var j = await r.Json();
        return (j.GetProperty("conversaId").GetInt64(), j.GetProperty("resposta"));
    }
}
