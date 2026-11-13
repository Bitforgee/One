using System.Net;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class InstituicaoPublicaTests
{
    [Fact]
    public async Task Corpo_igual_ao_golden()
    {
        await using var f = new OneFactory();
        await f.InitializeAsync();
        var i = await f.Instituicao("univag-golden", "Univag");
        var admin = await f.Entrar(i, await f.Usuario(i, [Papeis.Administrador]));
        await f.Db(null, db => db.Instituicoes.Where(x => x.Id == i.Id).ExecuteUpdateAsync(s => s
            .SetProperty(x => x.NomeCurto, "Univag").SetProperty(x => x.Cor, "#8a1538")
            .SetProperty(x => x.LoginTitulo, "Atendimento ao estudante").SetProperty(x => x.LoginFrase, "Fale com a secretaria.")
            .SetProperty(x => x.LoginItens, new[] { "Chamados", "Boletos", "Documentos" })
            .SetProperty(x => x.AssistenteNome, "Uni").SetProperty(x => x.AssistenteBoasVindas, "Oi, como posso ajudar?")
            .SetProperty(x => x.AssistentePerguntas, new[] { "Onde tiro o boleto?", "Como peço o histórico?" })
            .SetProperty(x => x.ContatoHorario, "Seg a sex, 8h às 18h").SetProperty(x => x.ContatoTelefone, "(65) 3688-6000")
            .SetProperty(x => x.ContatoEmail, "secretaria@univag.test")));
        await ImagemTeste.Enviar(admin, "logo", ImagemTeste.Png());
        await ImagemTeste.Enviar(admin, "assistente", ImagemTeste.Png());
        await ImagemTeste.Enviar(admin, "logo", ImagemTeste.Png());

        var r = await f.Cliente().GetAsync($"/api/instituicoes/{i.Slug}");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Dourado.Igual("instituicao-publica.txt", Dourado.Ler("instituicao-publica.txt"), await r.Content.ReadAsStringAsync());
    }
}
