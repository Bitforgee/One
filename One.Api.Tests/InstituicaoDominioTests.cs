using One.Api.Dados;

namespace One.Api.Tests;

public class InstituicaoDominioTests
{
    [Fact]
    public void AlterarAparencia_grava_os_campos_da_aparencia()
    {
        var i = Instituicao.Criar("univag", "Univag", "America/Cuiaba", new DateTime(2026, 11, 13, 12, 0, 0, DateTimeKind.Utc));

        i.AlterarAparencia(new DadosDeAparencia
        {
            NomeCurto = "Univag", Cor = "#123456",
            LoginTitulo = "Bem-vindo", LoginFrase = "Entre para continuar", LoginItens = ["Chamados", "Assistente"],
            AssistenteNome = "Uni", AssistenteBoasVindas = "Oi!", AssistentePerguntas = ["Onde está o boleto?"],
            ContatoHorario = "8h às 18h", ContatoTelefone = "(65) 3000-0000", ContatoEmail = "contato@univag.one",
        });

        Assert.Equal(["Univag", "#123456", "Bem-vindo", "Entre para continuar", "Uni", "Oi!", "8h às 18h", "(65) 3000-0000", "contato@univag.one"],
            [i.NomeCurto, i.Cor, i.LoginTitulo, i.LoginFrase, i.AssistenteNome, i.AssistenteBoasVindas, i.ContatoHorario, i.ContatoTelefone, i.ContatoEmail]);
        Assert.Equal(["Chamados", "Assistente"], i.LoginItens);
        Assert.Equal(["Onde está o boleto?"], i.AssistentePerguntas);
    }

    [Fact]
    public void AlterarAparencia_com_lista_vazia_guarda_nulo_e_campo_ausente_volta_ao_padrao()
    {
        var i = Instituicao.Criar("univag", "Univag", "America/Cuiaba", new DateTime(2026, 11, 13, 12, 0, 0, DateTimeKind.Utc));
        i.AlterarAparencia(new DadosDeAparencia { NomeCurto = "Univag", LoginItens = ["a"] });

        i.AlterarAparencia(new DadosDeAparencia { LoginItens = [] });

        Assert.Equal((null, null), (i.NomeCurto, i.LoginItens));
    }
}
