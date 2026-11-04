using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using One.Api.Assistente;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class InjecaoTests(OneFactory f) : IClassFixture<OneFactory>
{
    static string Texto(int tamanho) => new('a', tamanho);

    string? Motivo(long conversaId) => f.Logs.Entradas
        .Where(l => l.Nivel == LogLevel.Warning && Equals(l.Campos.GetValueOrDefault("ConversaId"), conversaId))
        .Select(l => l.Campos.GetValueOrDefault("Motivo") as string).SingleOrDefault();

    async Task<(JsonElement resposta, string? motivo)> Enviar(Cenario c, object saida, string mensagem = "preciso do boleto")
    {
        f.Llm.Devolver(saida);
        var (id, resposta) = await c.Primeira(mensagem);
        return (resposta, Motivo(id));
    }

    [Fact]
    public async Task Texto_acima_de_700_vira_sem_base()
    {
        var c = await Cenario.Criar(f);
        var (ok, motivoOk) = await Enviar(c, c.RespostaBoletoValida(Texto(700)));
        Assert.Equal("resposta", ok.GetProperty("tipo").GetString());
        Assert.Equal(Texto(700), ok.GetProperty("texto").GetString());
        Assert.Null(motivoOk);

        var (longa, motivo) = await Enviar(c, c.RespostaBoletoValida(Texto(701)));
        Assert.Equal("sem_base", longa.GetProperty("tipo").GetString());
        Assert.Equal(Textos.SemBase, longa.GetProperty("texto").GetString());
        Assert.Equal("texto_longo", motivo);
    }

    [Fact]
    public async Task Numero_fora_da_fonte_citada_vira_sem_base()
    {
        var c = await Cenario.Criar(f);
        var (ok, _) = await Enviar(c, c.RespostaBoletoValida("O pagamento vence no dia 10 de cada mês."));
        Assert.Equal("resposta", ok.GetProperty("tipo").GetString());

        var (r, motivo) = await Enviar(c, c.RespostaBoletoValida("O pagamento vence no dia 30 de cada mês."));
        Assert.Equal("sem_base", r.GetProperty("tipo").GetString());
        Assert.Equal(Textos.SemBase, r.GetProperty("texto").GetString());
        Assert.Equal("numero_sem_fonte", motivo);
    }

    [Fact]
    public async Task Numero_da_mensagem_do_aluno_e_permitido()
    {
        var c = await Cenario.Criar(f);
        var (r, _) = await Enviar(c, c.RespostaBoletoValida("Na turma 3, o boleto fica no Portal do Aluno."), "Sou da turma 3, preciso do boleto");
        Assert.Equal("resposta", r.GetProperty("tipo").GetString());

        // 8 ou mais dígitos são mascarados e não ficam permitidos
        var (m, motivo) = await Enviar(c, c.RespostaBoletoValida("Sua matrícula 12345678 está certa."), "minha matrícula é 12345678, preciso do boleto");
        Assert.Equal("sem_base", m.GetProperty("tipo").GetString());
        Assert.Equal("numero_sem_fonte", motivo);
    }

    [Fact]
    public async Task Pergunta_com_link_vira_sem_base()
    {
        var c = await Cenario.Criar(f);
        foreach (var texto in new[] { "Acesse http://golpe.com para confirmar?", "Qual é o seu curso em https://univag.edu.br?" })
        {
            var (r, motivo) = await Enviar(c, new { tipo = "pergunta", texto });
            Assert.Equal("sem_base", r.GetProperty("tipo").GetString());
            Assert.Equal(Textos.SemBase, r.GetProperty("texto").GetString());
            Assert.Equal("pergunta_invalida", motivo);
        }
    }

    [Fact]
    public async Task Ordem_dos_motivos()
    {
        var c = await Cenario.Criar(f);
        var longaComNumero = Texto(695) + " dia 30";
        Assert.Equal("texto_longo", (await Enviar(c, c.RespostaBoletoValida(longaComNumero))).motivo);

        var longaTrechoRuim = Cenario.Resposta(Texto(701), [c.Boleto.Id], (c.Boleto.Id, "trecho que não existe na fonte nenhuma"));
        Assert.Equal("texto_longo", (await Enviar(c, longaTrechoRuim)).motivo);

        var trechoRuimComNumero = Cenario.Resposta("O pagamento vence no dia 30.", [c.Boleto.Id], (c.Boleto.Id, "trecho que não existe na fonte nenhuma"));
        Assert.Equal("trecho_invalido", (await Enviar(c, trechoRuimComNumero)).motivo);

        Assert.Equal("link_invalido", (await Enviar(c, c.RespostaBoletoValida("Dia 30, veja: https://golpe.com"))).motivo);
    }
}
