using System.Net;
using System.Net.Http.Json;
using One.Api.Tests.Infra;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

public class AcoesDoChamadoTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Uma_gravacao_e_status_por_acao()
    {
        var b = await Balcao.Criar(f);
        var categoria = await f.Categoria(b.Instituicao, "Financeiro");
        var original = await b.Chamado();

        foreach (var (acao, estado, status, enviar) in new (string, string, HttpStatusCode, Func<string, Task<HttpResponseMessage>>)[]
        {
            ("responder/ALUNO", Aberto, HttpStatusCode.Created, n => Balcao.Mensagem(b.ClienteAluno, n, "Segue o comprovante.")),
            ("responder/ATENDENTE", Aberto, HttpStatusCode.Created, n => Balcao.Mensagem(b.A.Cliente, n, "Vou verificar.")),
            ("nota/ATENDENTE", Aberto, HttpStatusCode.Created, n => Balcao.Mensagem(b.A.Cliente, n, "Aluno ligou.", "NOTA")),
            ("assumir", Aberto, HttpStatusCode.OK, n => b.A.Cliente.PostAsync($"/api/chamados/{n}/assumir", null)),
            ("resolver", EmAtendimento, HttpStatusCode.OK, n => b.A.Cliente.PostAsJsonAsync($"/api/chamados/{n}/resolver", new { texto = "Boleto reemitido." })),
            ("confirmar", Resolvido, HttpStatusCode.OK, n => b.ClienteAluno.PostAsync($"/api/chamados/{n}/confirmar", null)),
            ("rejeitar", Resolvido, HttpStatusCode.OK, n => b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{n}/rejeitar", new { motivo = "Continua sem boleto." })),
            ("cancelar", Aberto, HttpStatusCode.OK, n => b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{n}/cancelar", new { motivo = "Resolvi sozinho." })),
            ("encaminhar", Aberto, HttpStatusCode.OK, n => b.A.Cliente.PostAsJsonAsync($"/api/chamados/{n}/encaminhar", new { setorId = b.Outro.Id, motivo = "É do financeiro." })),
            ("reclassificar", Aberto, HttpStatusCode.OK, n => b.A.Cliente.PostAsJsonAsync($"/api/chamados/{n}/reclassificar", new { categoriaId = categoria.Id })),
            ("duplicado", Aberto, HttpStatusCode.OK, n => b.A.Cliente.PostAsJsonAsync($"/api/chamados/{n}/duplicado", new { numeroOriginal = original })),
        })
        {
            var numero = await b.Chamado(estado);
            f.Gravacoes.Zerar();
            var r = await enviar(numero);
            Assert.True(r.StatusCode == status, $"{acao}: {(int)r.StatusCode}");
            Assert.True(f.Gravacoes.Total == 1, $"{acao}: {f.Gravacoes.Total} gravações");
            Assert.Equal(numero, (await r.Json()).GetProperty("numero").GetString());
        }
    }
}
