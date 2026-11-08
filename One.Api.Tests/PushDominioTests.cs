using One.Api.Dados.Push;

namespace One.Api.Tests;

public class PushDominioTests
{
    static readonly DateTime Agora = new(2026, 11, 2, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Registrar_e_reatribuir_trocam_so_o_que_devem()
    {
        var s = SubscricaoPush.Registrar(7, 3, "https://push.teste/a", "p1", "a1", Agora);
        Assert.Equal((7L, 3L, "https://push.teste/a", "p1", "a1", Agora), (s.UsuarioId, s.InstituicaoId, s.Endpoint, s.P256dh, s.Auth, s.RegistradaEm));

        s.Reatribuir(9, 4, "p2", "a2", Agora.AddMinutes(5));
        Assert.Equal((9L, 4L, "https://push.teste/a", "p2", "a2", Agora.AddMinutes(5)), (s.UsuarioId, s.InstituicaoId, s.Endpoint, s.P256dh, s.Auth, s.RegistradaEm));
    }

    [Fact]
    public void Falha_agenda_2_elevado_a_n_minutos()
    {
        var p = PushSaida.Criar(1, 2, Agora);
        Assert.Equal((0, Agora, (DateTime?)null), (p.Tentativas, p.ProximaTentativa, p.EnviadoEm));
        var agora = Agora;
        foreach (var (tentativas, minutos) in new[] { (1, 2), (2, 4), (3, 8), (4, 16), (5, 32) })
        {
            agora = agora.AddHours(1);
            p.RegistrarFalha(agora);
            Assert.Equal((tentativas, agora.AddMinutes(minutos)), (p.Tentativas, p.ProximaTentativa));
        }
        Assert.Null(p.EnviadoEm);
    }

    [Fact]
    public void Concluir_grava_enviado_em()
    {
        var p = PushSaida.Criar(1, 2, Agora);
        p.Concluir(Agora.AddSeconds(3));
        Assert.Equal(Agora.AddSeconds(3), p.EnviadoEm);
        Assert.Equal(0, p.Tentativas);
    }

    // AD-024: a única propriedade com set público é InstituicaoId, que a interface IDaInstituicao exige (como nos outros agregados)
    [Fact]
    public void Sem_setter_publico()
    {
        foreach (var tipo in new[] { typeof(SubscricaoPush), typeof(PushSaida) })
        {
            Assert.Empty(tipo.GetConstructors());
            Assert.Equal(["InstituicaoId"], tipo.GetProperties().Where(p => p.SetMethod is { IsPublic: true }).Select(p => p.Name));
        }
    }
}
