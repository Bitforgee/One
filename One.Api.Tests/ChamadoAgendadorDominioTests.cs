using One.Api.Dados;
using One.Api.Dados.Chamados;
using static One.Api.Dados.Chamados.EstadosChamado;

namespace One.Api.Tests;

public class ChamadoAgendadorDominioTests
{
    const long Atendente = 7;
    static readonly DateTime Agora = new(2026, 11, 10, 12, 0, 0, DateTimeKind.Utc);

    static Chamado Novo(DateTime em) => Chamado.Abrir(new("ONE-1", "Titulo", null, new(1, 2, 3, 4), new(10, "IA", 20)), em.AddHours(-1));

    static Chamado Aguardando(DateTime desde)
    {
        var c = Novo(desde);
        c.ResponderComoEquipe(Atendente, "Ana", "Envie o comprovante.", [], true, desde);
        return c;
    }

    static Chamado EmAtendimento(DateTime desde)
    {
        var c = Novo(desde);
        c.Assumir(Atendente, null, "Ana", desde);
        return c;
    }

    [Fact]
    public void Lembrar_aluno_no_limite_antes_e_estado_errado()
    {
        var limite = Aguardando(Agora - TimeSpan.FromDays(3));
        var eventos = limite.Eventos.Count;
        Assert.Null(limite.LembrarAluno(3, Agora));
        Assert.Equal((AguardandoAluno, (DateTime?)Agora), (limite.Estado, limite.LembreteEm));
        var evento = limite.Eventos.Last();
        Assert.Equal(eventos + 1, limite.Eventos.Count);
        Assert.Equal((TiposEvento.Lembrete, (long?)null, "Lembrete ao aluno: 3 dias aguardando resposta", Agora), (evento.Tipo, evento.AtorId, evento.Detalhe, evento.CriadoEm));

        var antes = Aguardando(Agora - TimeSpan.FromDays(3) + TimeSpan.FromSeconds(1));
        eventos = antes.Eventos.Count;
        Assert.NotNull(antes.LembrarAluno(3, Agora));
        Assert.Null(antes.LembreteEm);
        Assert.Equal(eventos, antes.Eventos.Count);

        var errado = EmAtendimento(Agora - TimeSpan.FromDays(9));
        eventos = errado.Eventos.Count;
        Assert.NotNull(errado.LembrarAluno(3, Agora));
        Assert.Null(errado.LembreteEm);
        Assert.Equal(eventos, errado.Eventos.Count);

        Assert.NotNull(limite.LembrarAluno(3, Agora.AddDays(1)));
        Assert.Equal(Agora, limite.LembreteEm);
    }
}
