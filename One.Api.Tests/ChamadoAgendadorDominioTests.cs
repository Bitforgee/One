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

    static Chamado JaResolvido(DateTime em)
    {
        var c = Novo(em);
        c.Resolver(Atendente, "Ana", "Feito.", em);
        return c;
    }

    static Chamado Atendendo(DateTime desde)
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

        var errado = Atendendo(Agora - TimeSpan.FromDays(9));
        eventos = errado.Eventos.Count;
        Assert.NotNull(errado.LembrarAluno(3, Agora));
        Assert.Null(errado.LembreteEm);
        Assert.Equal(eventos, errado.Eventos.Count);

        Assert.NotNull(limite.LembrarAluno(3, Agora.AddDays(1)));
        Assert.Equal(Agora, limite.LembreteEm);
    }

    [Fact]
    public void Resolver_por_falta_de_resposta_no_limite_antes_e_estado_errado()
    {
        var limite = Aguardando(Agora - TimeSpan.FromDays(7));
        var (eventos, mensagens) = (limite.Eventos.Count, limite.Mensagens.Count);
        Assert.Null(limite.ResolverPorFaltaDeResposta(7, Agora));
        Assert.Equal((Resolvido, (DateTime?)Agora, (DateTime?)null), (limite.Estado, limite.ResolvidoEm, limite.AguardandoDesde));
        Assert.Equal(eventos + 1, limite.Eventos.Count);
        var evento = limite.Eventos.Last();
        Assert.Equal((TiposEvento.Transicao, (long?)null, AguardandoAluno, Resolvido, Agora), (evento.Tipo, evento.AtorId, evento.De, evento.Para, evento.CriadoEm));
        Assert.Equal(mensagens + 1, limite.Mensagens.Count);
        var mensagem = limite.Mensagens.Last();
        Assert.Equal((TiposMensagem.Publica, (long?)null, "Encerrado por falta de resposta. Se ainda precisar, rejeite esta resolução.", Agora), (mensagem.Tipo, mensagem.AutorId, mensagem.Texto, mensagem.CriadaEm));

        var antes = Aguardando(Agora - TimeSpan.FromDays(7) + TimeSpan.FromSeconds(1));
        (eventos, mensagens) = (antes.Eventos.Count, antes.Mensagens.Count);
        Assert.NotNull(antes.ResolverPorFaltaDeResposta(7, Agora));
        Assert.Equal((AguardandoAluno, (DateTime?)null), (antes.Estado, antes.ResolvidoEm));
        Assert.Equal((eventos, mensagens), (antes.Eventos.Count, antes.Mensagens.Count));

        var errado = Atendendo(Agora - TimeSpan.FromDays(9));
        (eventos, mensagens) = (errado.Eventos.Count, errado.Mensagens.Count);
        Assert.NotNull(errado.ResolverPorFaltaDeResposta(7, Agora));
        Assert.Equal((EmAtendimento, (DateTime?)null), (errado.Estado, errado.ResolvidoEm));
        Assert.Equal((eventos, mensagens), (errado.Eventos.Count, errado.Mensagens.Count));
    }
    [Fact]
    public void Fechar_por_inatividade_no_limite_antes_e_estado_errado()
    {
        var limite = JaResolvido(Agora - TimeSpan.FromDays(7));
        var eventos = limite.Eventos.Count;
        Assert.Null(limite.FecharPorInatividade(7, Agora));
        Assert.Equal((Fechado, MotivosFechamento.FechadoAutomaticamente, (DateTime?)Agora), (limite.Estado, limite.MotivoFechamento, limite.FechadoEm));
        Assert.Equal(eventos + 1, limite.Eventos.Count);
        var evento = limite.Eventos.Last();
        Assert.Equal((TiposEvento.Transicao, (long?)null, Resolvido, Fechado, "Fechado automaticamente: 7 dias sem confirmação", Agora),
            (evento.Tipo, evento.AtorId, evento.De, evento.Para, evento.Detalhe, evento.CriadoEm));

        var antes = JaResolvido(Agora - TimeSpan.FromDays(7) + TimeSpan.FromSeconds(1));
        eventos = antes.Eventos.Count;
        Assert.NotNull(antes.FecharPorInatividade(7, Agora));
        Assert.Equal((Resolvido, (string?)null, (DateTime?)null), (antes.Estado, antes.MotivoFechamento, antes.FechadoEm));
        Assert.Equal(eventos, antes.Eventos.Count);

        var errado = Atendendo(Agora - TimeSpan.FromDays(9));
        eventos = errado.Eventos.Count;
        Assert.NotNull(errado.FecharPorInatividade(7, Agora));
        Assert.Equal((EmAtendimento, (string?)null), (errado.Estado, errado.MotivoFechamento));
        Assert.Equal(eventos, errado.Eventos.Count);
    }}
