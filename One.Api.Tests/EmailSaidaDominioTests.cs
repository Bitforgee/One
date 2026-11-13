namespace One.Api.Tests;

public class EmailSaidaDominioTests
{
    static readonly DateTime Agora = new(2026, 11, 12, 12, 0, 0, DateTimeKind.Utc);

    static EmailSaida ComFalhas(int falhas)
    {
        var e = EmailSaida.Criar("aluno@teste.one", "Aviso", "Olá", Agora);
        for (var n = 0; n < falhas; n++) e.RegistrarFalha(Agora);
        return e;
    }

    [Theory]
    [InlineData(0, 1, 2)]
    [InlineData(1, 2, 4)]
    [InlineData(4, 5, 32)]
    public void Registrar_falha_soma_uma_tentativa_e_agenda_2_elevado_a_tentativas_minutos(int antes, int depois, int minutos)
    {
        var e = ComFalhas(antes);
        Assert.Equal(antes, e.Tentativas);

        e.RegistrarFalha(Agora);

        Assert.Equal((depois, Agora.AddMinutes(minutos)), (e.Tentativas, e.ProximaTentativa));
    }

    [Fact]
    public void Criar_agenda_para_agora_sem_tentativas_e_sem_envio()
    {
        var e = EmailSaida.Criar("aluno@teste.one", "Aviso", "Olá", Agora);

        Assert.Equal(("aluno@teste.one", "Aviso", "Olá", 0, Agora, (DateTime?)null), (e.Destinatario, e.Assunto, e.Corpo, e.Tentativas, e.ProximaTentativa, e.EnviadoEm));
    }

    [Fact]
    public void Concluir_marca_o_envio()
    {
        var e = ComFalhas(1);

        e.Concluir(Agora.AddMinutes(3));

        Assert.Equal(Agora.AddMinutes(3), e.EnviadoEm);
    }
}
