namespace One.Api;

// Os 5 prazos do atendimento (.specs/GLOSSARIO.md), lidos de Prazos:* uma vez no startup.
public record Prazos(int AbandonoMinutos, int ConfirmacaoDias, int LembreteAguardandoDias, int ResolverAguardandoDias)
{
    public static Prazos Ler(IConfiguration cfg) => new(
        cfg.GetValue("Prazos:AbandonoMinutos", 30),
        cfg.GetValue("Prazos:ConfirmacaoDias", 7),
        cfg.GetValue("Prazos:LembreteAguardandoDias", 3),
        cfg.GetValue("Prazos:ResolverAguardandoDias", 7));

    public TimeSpan Abandono => TimeSpan.FromMinutes(AbandonoMinutos);
    public TimeSpan Confirmacao => TimeSpan.FromDays(ConfirmacaoDias);
    public TimeSpan Lembrete => TimeSpan.FromDays(LembreteAguardandoDias);
    public TimeSpan ResolverAguardando => TimeSpan.FromDays(ResolverAguardandoDias);

    // O aluno pode rejeitar enquanto o chamado não fecha sozinho: o prazo de rejeição é o de confirmação.
    public int RejeicaoDias => ConfirmacaoDias;
    public TimeSpan Rejeicao => Confirmacao;
}
