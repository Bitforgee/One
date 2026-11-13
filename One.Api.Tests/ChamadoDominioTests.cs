using One.Api.Chamados;
using One.Api.Dados;
using static One.Api.Dados.Chamados.EstadosChamado;

namespace One.Api.Tests;

public class ChamadoDominioTests
{
    const long Ator = 7, Outro = 9;
    static readonly DateTime Antes = new(2026, 11, 2, 7, 0, 0, DateTimeKind.Utc);
    static readonly DateTime Agora = Antes.AddHours(5);

    static string Nome(long id) => id == Ator ? "Ana" : "Beto";

    static Chamado ChamadoAberto() => Chamado.Abrir("ONE-1", 1, 2, 3, 4, "Titulo", null, 10, "IA", 20, Antes.AddHours(-1));

    static Chamado EmAtend(long resp = Ator) { var c = ChamadoAberto(); c.Assumir(resp, null, Nome(resp), Antes); return c; }

    static Chamado Aguardando(long resp = Ator) { var c = ChamadoAberto(); c.ResponderComoEquipe(resp, Nome(resp), "oi", [], true, Antes); return c; }

    static Chamado ChamadoResolvido(long resp = Ator) { var c = ChamadoAberto(); c.Resolver(resp, Nome(resp), "feito", Antes); return c; }

    static Chamado ChamadoFechado() { var c = ChamadoAberto(); c.Cancelar(Ator, null, Antes); return c; }

    static Dictionary<string, object?> Colunas(Chamado c) => typeof(Chamado).GetProperties()
        .Where(p => p.PropertyType.IsValueType || p.PropertyType == typeof(string)).ToDictionary(p => p.Name, p => p.GetValue(c));

    static string[] Mudaram(Dictionary<string, object?> antes, Chamado c) =>
        [.. Colunas(c).Where(kv => !Equals(kv.Value, antes[kv.Key])).Select(kv => kv.Key).Order()];

    record Evento(string Tipo, string? De = null, string? Para = null, string? Detalhe = null);

    record Linha(string Nome, Chamado C, Action<Chamado> Age, string Final, string[] Mudam, Evento[] Eventos, (string Tipo, string Texto, int Anexos)[] Mensagens, Action<Chamado>? Extra = null);

    static Anexo Foto => new() { Nome = "foto.png", Tipo = "image/png", Tamanho = 3, Chave = $"1/anexos/{Guid.NewGuid():N}", Hash = new string('a', 64) };

    static Linha[] Tabela() =>
    [
        new("2 Assumir ABERTO", ChamadoAberto(), c => c.Assumir(Ator, null, "Ana", Agora), EmAtendimento, ["Estado", "ResponsavelId"],
            [new("ATRIBUICAO", null, "Ana"), new("TRANSICAO", Aberto, EmAtendimento)], [], c => Assert.Equal(Ator, c.ResponsavelId)),
        new("3 Assumir AGUARDANDO_ALUNO de outro", Aguardando(Outro), c => c.Assumir(Ator, "Beto", "Ana", Agora), AguardandoAluno, ["ResponsavelId"],
            [new("ATRIBUICAO", "Beto", "Ana")], [], c => Assert.Equal(Antes, c.AguardandoDesde)),
        new("4 ResponderComoAluno AGUARDANDO_ALUNO com anexo", Aguardando(), c => c.ResponderComoAluno(Ator, "resposta", [Foto], Agora), EmAtendimento, ["AguardandoDesde", "Estado"],
            [new("RESPOSTA"), new("ANEXO", Detalhe: "foto.png"), new("TRANSICAO", AguardandoAluno, EmAtendimento)], [("PUBLICA", "resposta", 1)], c => Assert.Null(c.AguardandoDesde)),
        new("5 ResponderComoAluno ABERTO", ChamadoAberto(), c => c.ResponderComoAluno(Ator, "resposta", [], Agora), Aberto, [],
            [new("RESPOSTA")], [("PUBLICA", "resposta", 0)]),
        new("6 ResponderComoEquipe ABERTO aguardando o aluno", ChamadoAberto(), c => c.ResponderComoEquipe(Ator, "Ana", "resposta", [], true, Agora), AguardandoAluno,
            ["AguardandoDesde", "Estado", "ResponsavelId"], [new("RESPOSTA"), new("ATRIBUICAO", null, "Ana"), new("TRANSICAO", Aberto, AguardandoAluno)], [("PUBLICA", "resposta", 0)],
            c => Assert.Equal(Agora, c.AguardandoDesde)),
        new("7 ResponderComoEquipe AGUARDANDO_ALUNO do responsável", Aguardando(), c => c.ResponderComoEquipe(Ator, "Ana", "resposta", [], true, Agora), AguardandoAluno, [],
            [new("RESPOSTA")], [("PUBLICA", "resposta", 0)], c => Assert.Equal(Antes, c.AguardandoDesde)),
        new("8 Anotar EM_ATENDIMENTO", EmAtend(), c => c.Anotar(Ator, "nota", Agora), EmAtendimento, [], [new("NOTA")], [("NOTA", "nota", 0)]),
        new("9 Resolver ABERTO", ChamadoAberto(), c => c.Resolver(Ator, "Ana", "feito", Agora), Resolvido, ["Estado", "ResolvidoEm", "ResponsavelId"],
            [new("RESPOSTA"), new("ATRIBUICAO", null, "Ana"), new("TRANSICAO", Aberto, Resolvido)], [("PUBLICA", "feito", 0)], c => Assert.Equal(Agora, c.ResolvidoEm)),
        new("10 Confirmar RESOLVIDO", ChamadoResolvido(), c => c.Confirmar(Ator, Agora), Fechado, ["Estado", "FechadoEm", "MotivoFechamento"],
            [new("TRANSICAO", Resolvido, Fechado)], [], c => { Assert.Equal("CONFIRMADO", c.MotivoFechamento); Assert.Equal(Agora, c.FechadoEm); }),
        new("11 Rejeitar RESOLVIDO com responsável ativo", ChamadoResolvido(), c => Assert.Null(c.Rejeitar(Ator, "nao resolveu", [], true, "Ana", 7, Agora)), EmAtendimento,
            ["Estado", "Reaberturas"], [new("RESPOSTA"), new("TRANSICAO", Resolvido, EmAtendimento)], [("PUBLICA", "nao resolveu", 0)], c => Assert.Equal(1, c.Reaberturas)),
        new("12 Rejeitar RESOLVIDO com responsável inativo", ChamadoResolvido(), c => Assert.Null(c.Rejeitar(Ator, "nao resolveu", [], false, "Ana", 7, Agora)), Aberto,
            ["Estado", "Reaberturas", "ResponsavelId"], [new("RESPOSTA"), new("ATRIBUICAO", "Ana", null), new("TRANSICAO", Resolvido, Aberto)], [("PUBLICA", "nao resolveu", 0)],
            c => { Assert.Null(c.ResponsavelId); Assert.Equal(1, c.Reaberturas); }),
        new("13 Cancelar AGUARDANDO_ALUNO", Aguardando(), c => c.Cancelar(Ator, "desisti", Agora), Fechado, ["AguardandoDesde", "Estado", "FechadoEm", "MotivoFechamento"],
            [new("TRANSICAO", AguardandoAluno, Fechado, "desisti")], [], c => { Assert.Equal("CANCELADO", c.MotivoFechamento); Assert.Null(c.AguardandoDesde); }),
        new("13b Cancelar com justificativa em branco", EmAtend(), c => c.Cancelar(Ator, "  ", Agora), Fechado, ["Estado", "FechadoEm", "MotivoFechamento"],
            [new("TRANSICAO", EmAtendimento, Fechado)], []),
        new("14 Encaminhar AGUARDANDO_ALUNO com responsável", Aguardando(), c => c.Encaminhar(Ator, 21, "Secretaria", "Coordenação", "melhor com eles", "Ana", Agora), Aberto,
            ["AguardandoDesde", "Encaminhamentos", "Estado", "ResponsavelId", "SetorId"],
            [new("NOTA"), new("ENCAMINHAMENTO", "Secretaria", "Coordenação"), new("ATRIBUICAO", "Ana", null), new("TRANSICAO", AguardandoAluno, Aberto)],
            [("NOTA", "melhor com eles", 0)], c => { Assert.Equal(21, c.SetorId); Assert.Equal(1, c.Encaminhamentos); }),
        new("15 Reclassificar RESOLVIDO", ChamadoResolvido(), c => c.Reclassificar(Ator, 11, "Boleto", "Matrícula", Agora), Resolvido, ["CategoriaId"],
            [new("RECLASSIFICACAO", "Boleto", "Matrícula")], [], c => Assert.Equal(10, c.CategoriaOriginalId)),
        new("16 MarcarDuplicado EM_ATENDIMENTO", EmAtend(), c => c.MarcarDuplicado(Ator, "ONE-9", Agora), Fechado, ["Estado", "FechadoEm", "MotivoFechamento", "NumeroOriginal"],
            [new("RESPOSTA"), new("TRANSICAO", EmAtendimento, Fechado)], [("PUBLICA", "Este pedido continua em ONE-9.", 0)],
            c => { Assert.Equal("DUPLICADO", c.MotivoFechamento); Assert.Equal("ONE-9", c.NumeroOriginal); }),
        new("17 DevolverAFila AGUARDANDO_ALUNO", Aguardando(), c => c.DevolverAFila(Outro, "Ana", Agora), Aberto, ["AguardandoDesde", "Estado", "ResponsavelId"],
            [new("ATRIBUICAO", "Ana", null, "Responsável desativado"), new("TRANSICAO", AguardandoAluno, Aberto)], [], c => Assert.Null(c.AguardandoDesde)),
        new("18 DevolverAFila RESOLVIDO", ChamadoResolvido(), c => c.DevolverAFila(Outro, "Ana", Agora), Resolvido, ["ResponsavelId"],
            [new("ATRIBUICAO", "Ana", null, "Responsável desativado")], []),
    ];

    [Fact]
    public void Abrir_cria_aberto_com_o_evento_de_criacao()
    {
        var c = ChamadoAberto();
        Assert.Equal(Aberto, c.Estado);
        Assert.Null(c.ResponsavelId);
        Assert.Equal(10, c.CategoriaOriginalId);
        Assert.Empty(c.Mensagens);
        var e = Assert.Single(c.Eventos);
        Assert.Equal("CRIACAO", e.Tipo);
        Assert.Null(e.AtorId);
        Assert.Equal(Aberto, e.Para);
        Assert.Equal(Antes.AddHours(-1), e.CriadoEm);
    }

    [Fact]
    public void Cada_transicao_como_a_base()
    {
        foreach (var l in Tabela())
        {
            var antes = Colunas(l.C);
            var (eventos0, mensagens0) = (l.C.Eventos.Count, l.C.Mensagens.Count);
            l.Age(l.C);
            Assert.True(l.Final == l.C.Estado, $"{l.Nome}: estado {l.C.Estado}");
            Assert.True(l.Mudam.SequenceEqual(Mudaram(antes, l.C)), $"{l.Nome}: mudaram {string.Join(",", Mudaram(antes, l.C))}");
            var eventos = l.C.Eventos.Skip(eventos0).ToList();
            Assert.True(l.Eventos.SequenceEqual(eventos.Select(e => new Evento(e.Tipo, e.De, e.Para, e.Detalhe))), $"{l.Nome}: eventos {string.Join(" ", eventos.Select(e => e.Tipo))}");
            Assert.True(eventos.All(e => e.AtorId == (l.Nome.StartsWith("17") || l.Nome.StartsWith("18") ? Outro : Ator) && e.CriadoEm == Agora), $"{l.Nome}: ator ou instante do evento");
            var mensagens = l.C.Mensagens.Skip(mensagens0).ToList();
            Assert.True(l.Mensagens.SequenceEqual(mensagens.Select(m => (m.Tipo, m.Texto, m.Anexos.Count))), $"{l.Nome}: mensagens");
            Assert.True(mensagens.All(m => m.AutorId == Ator && m.CriadaEm == Agora), $"{l.Nome}: autor ou instante da mensagem");
            l.Extra?.Invoke(l.C);
        }
        Assert.Equal(18, Tabela().Length);
    }

    [Fact]
    public void Transicao_inexistente_lanca_e_nao_muda()
    {
        var casos = new (string Nome, Chamado C, Action<Chamado> Age)[]
        {
            ("Assumir FECHADO", ChamadoFechado(), c => c.Assumir(Ator, null, "Ana", Agora)),
            ("ResponderComoAluno FECHADO", ChamadoFechado(), c => c.ResponderComoAluno(Ator, "x", [], Agora)),
            ("ResponderComoEquipe FECHADO", ChamadoFechado(), c => c.ResponderComoEquipe(Ator, "Ana", "x", [], false, Agora)),
            ("Anotar FECHADO", ChamadoFechado(), c => c.Anotar(Ator, "x", Agora)),
            ("Resolver FECHADO", ChamadoFechado(), c => c.Resolver(Ator, "Ana", "x", Agora)),
            ("Confirmar FECHADO", ChamadoFechado(), c => c.Confirmar(Ator, Agora)),
            ("Rejeitar FECHADO", ChamadoFechado(), c => c.Rejeitar(Ator, "x", [], true, "Ana", 7, Agora)),
            ("Cancelar FECHADO", ChamadoFechado(), c => c.Cancelar(Ator, "x", Agora)),
            ("Encaminhar FECHADO", ChamadoFechado(), c => c.Encaminhar(Ator, 21, "A", "B", "x", null, Agora)),
            ("Reclassificar FECHADO", ChamadoFechado(), c => c.Reclassificar(Ator, 11, "A", "B", Agora)),
            ("MarcarDuplicado FECHADO", ChamadoFechado(), c => c.MarcarDuplicado(Ator, "ONE-9", Agora)),
            ("DevolverAFila FECHADO", ChamadoFechado(), c => c.DevolverAFila(Ator, "Ana", Agora)),
            ("Confirmar ABERTO", ChamadoAberto(), c => c.Confirmar(Ator, Agora)),
            ("Confirmar EM_ATENDIMENTO", EmAtend(), c => c.Confirmar(Ator, Agora)),
            ("Confirmar AGUARDANDO_ALUNO", Aguardando(), c => c.Confirmar(Ator, Agora)),
            ("Rejeitar ABERTO", ChamadoAberto(), c => c.Rejeitar(Ator, "x", [], true, "Ana", 7, Agora)),
            ("Rejeitar EM_ATENDIMENTO", EmAtend(), c => c.Rejeitar(Ator, "x", [], true, "Ana", 7, Agora)),
            ("Rejeitar AGUARDANDO_ALUNO", Aguardando(), c => c.Rejeitar(Ator, "x", [], true, "Ana", 7, Agora)),
        };
        Assert.Equal(18, casos.Length);
        foreach (var (nome, c, age) in casos)
        {
            var antes = Colunas(c);
            var (mensagens, eventos) = (c.Mensagens.ToList(), c.Eventos.ToList());
            Assert.Throws<InvalidOperationException>(() => age(c));
            Assert.True(Mudaram(antes, c).Length == 0, $"{nome}: colunas mudaram");
            Assert.True(mensagens.SequenceEqual(c.Mensagens) && eventos.SequenceEqual(c.Eventos), $"{nome}: mensagens ou eventos mudaram");
        }
    }

    static void Aplicar(string acao, string papel, Chamado c) => _ = (acao, papel) switch
    {
        ("responder", "ALUNO") when c.Estado == Resolvido => c.Rejeitar(Outro, "x", [], true, "Ana", 7, Agora),
        ("responder", "ALUNO") => Faz(() => c.ResponderComoAluno(Outro, "x", [], Agora)),
        ("responder", _) => Faz(() => c.ResponderComoEquipe(Outro, "Beto", "x", [], false, Agora)),
        ("nota", _) => Faz(() => c.Anotar(Outro, "x", Agora)),
        ("assumir", _) => c.Assumir(Outro, "Ana", "Beto", Agora),
        ("resolver", _) => Faz(() => c.Resolver(Outro, "Beto", "x", Agora)),
        ("confirmar", _) => Faz(() => c.Confirmar(Outro, Agora)),
        ("rejeitar", _) => c.Rejeitar(Outro, "x", [], true, "Ana", 7, Agora),
        ("cancelar", _) => Faz(() => c.Cancelar(Outro, "x", Agora)),
        ("encaminhar", _) => Faz(() => c.Encaminhar(Outro, 21, "A", "B", "x", "Ana", Agora)),
        ("reclassificar", _) => Faz(() => c.Reclassificar(Outro, 11, "A", "B", Agora)),
        ("duplicado", _) => Faz(() => c.MarcarDuplicado(Outro, "ONE-9", Agora)),
        _ => throw new InvalidOperationException(acao),
    };

    static Recusa? Faz(Action a) { a(); return null; }

    [Fact]
    public void Todo_trio_permitido_e_aceito()
    {
        string[] acoes = ["responder", "nota", "assumir", "resolver", "confirmar", "rejeitar", "cancelar", "encaminhar", "reclassificar", "duplicado"];
        var contados = 0;
        foreach (var acao in acoes)
            foreach (var papel in new[] { PermissoesChamado.Aluno, PermissoesChamado.Atendente })
                foreach (var estado in PermissoesChamado.Estados(acao, papel) ?? [])
                {
                    var c = estado switch { Aberto => ChamadoAberto(), EmAtendimento => EmAtend(), AguardandoAluno => Aguardando(), _ => ChamadoResolvido() };
                    Assert.Equal(estado, c.Estado);
                    var recusa = Record.Exception(() => Aplicar(acao, papel, c));
                    Assert.True(recusa is null, $"{acao}/{papel}/{estado}: {recusa?.Message}");
                    contados++;
                }
        Assert.Equal(32, contados);
    }

    [Fact]
    public void Assumir_pelo_responsavel_recusa()
    {
        var c = EmAtend();
        var antes = Colunas(c);
        var eventos = c.Eventos.ToList();
        var recusa = c.Assumir(Ator, "Ana", "Ana", Agora);
        Assert.Equal("Você já é o responsável por este chamado.", recusa?.Motivo);
        Assert.Empty(Mudaram(antes, c));
        Assert.True(eventos.SequenceEqual(c.Eventos));
    }

    [Fact]
    public void Rejeitar_no_limite_aceita_e_depois_recusa()
    {
        var limite = Antes.AddDays(7);
        var noLimite = ChamadoResolvido();
        Assert.Null(noLimite.Rejeitar(Ator, "nao resolveu", [], true, "Ana", 7, limite));
        Assert.Equal(EmAtendimento, noLimite.Estado);

        var depois = ChamadoResolvido();
        var antes = Colunas(depois);
        var (mensagens, eventos) = (depois.Mensagens.ToList(), depois.Eventos.ToList());
        var recusa = depois.Rejeitar(Ator, "nao resolveu", [], true, "Ana", 7, limite.AddTicks(1));
        Assert.Equal("O prazo de 7 dias para rejeitar a resolução terminou.", recusa?.Motivo);
        Assert.Empty(Mudaram(antes, depois));
        Assert.True(mensagens.SequenceEqual(depois.Mensagens) && eventos.SequenceEqual(depois.Eventos));

        Assert.Equal("O prazo de 10 dias para rejeitar a resolução terminou.", ChamadoResolvido().Rejeitar(Ator, "x", [], true, "Ana", 10, Antes.AddDays(10).AddTicks(1))?.Motivo);
    }

    static Chamado NoFluxo() => Chamado.Abrir("ONE-1", 1, 2, 3, 4, "Titulo", null, 10, "IA", 20, Antes, versaoFluxoId: 5, etapaOrdem: 1);

    [Fact]
    public void Subir_move_a_etapa_registra_SUBIDA_e_nao_soma_encaminhamento()
    {
        var c = NoFluxo();
        c.Assumir(Ator, null, "Ana", Antes);
        var eventosAntes = c.Eventos.Count;

        c.Subir(Ator, "Líderes", "Coordenação", 21, 2, "A coordenação resolve", "Ana", Agora);

        Assert.Equal((Aberto, 21L, (int?)2, 0), (c.Estado, c.SetorId, c.EtapaOrdem, c.Encaminhamentos));
        Assert.Equal(((long?)5, (DateTime?)Agora, (long?)null), (c.VersaoFluxoId, c.EtapaDesde, c.ResponsavelId));
        Assert.Equal([("NOTA", (string?)null, (string?)null, (string?)null), ("SUBIDA", "Líderes", "Coordenação", "A coordenação resolve"), ("ATRIBUICAO", "Ana", null, null), ("TRANSICAO", EmAtendimento, Aberto, null)],
            c.Eventos.Skip(eventosAntes).Select(e => (e.Tipo, e.De, e.Para, e.Detalhe)));
        var nota = Assert.Single(c.Mensagens);
        Assert.Equal(("NOTA", "A coordenação resolve"), (nota.Tipo, nota.Texto));
    }

    [Fact]
    public void Subir_pelo_prazo_nao_tem_autor_nem_nota()
    {
        var c = NoFluxo();

        c.Subir(null, "Líderes", "Coordenação", 21, 2, "Sem resposta em 48 horas", null, Agora);

        Assert.Empty(c.Mensagens);
        var subida = Assert.Single(c.Eventos, e => e.Tipo == "SUBIDA");
        Assert.Equal((null, "Líderes", "Coordenação", "Sem resposta em 48 horas"), (subida.AtorId, subida.De, subida.Para, subida.Detalhe));
        Assert.Equal((Aberto, (int?)2, 0), (c.Estado, c.EtapaOrdem, c.Encaminhamentos));
    }

    [Fact]
    public void Subir_so_nos_estados_abertos()
    {
        var aguardando = Aguardando();
        aguardando.Subir(Ator, "A", "B", 21, 2, "x", "Ana", Agora);
        Assert.Equal(Aberto, aguardando.Estado);
        Assert.Throws<InvalidOperationException>(() => ChamadoResolvido().Subir(Ator, "A", "B", 21, 2, "x", null, Agora));
        Assert.Throws<InvalidOperationException>(() => ChamadoFechado().Subir(Ator, "A", "B", 21, 2, "x", null, Agora));
    }

    [Fact]
    public void Reclassificar_em_fluxo_sai_da_etapa()
    {
        var c = NoFluxo();
        c.Subir(Ator, "A", "B", 21, 2, "x", null, Antes);
        var (setor, eventos) = (c.SetorId, c.Eventos.Count);

        c.Reclassificar(Ator, 11, "Boleto", "Matrícula", Agora);

        Assert.Equal((11L, (int?)null, (DateTime?)null), (c.CategoriaId, c.EtapaOrdem, c.EtapaDesde));
        Assert.Equal((setor, (long?)5), (c.SetorId, c.VersaoFluxoId));
        var novos = c.Eventos.Skip(eventos).ToList();
        Assert.Equal([("RECLASSIFICACAO", "Boleto", "Matrícula")], novos.Select(e => (e.Tipo, e.De, e.Para)));
    }

    [Fact]
    public void Encaminhar_sai_do_fluxo_e_abrir_sem_etapa_fica_fora()
    {
        var c = NoFluxo();
        Assert.Equal(((long?)5, (int?)1, (DateTime?)Antes), (c.VersaoFluxoId, c.EtapaOrdem, c.EtapaDesde));

        c.Encaminhar(Ator, 21, "A", "B", "melhor com eles", null, Agora);

        Assert.Equal((null, null, 1), (c.EtapaOrdem, c.EtapaDesde, c.Encaminhamentos));
        var fora = Chamado.Abrir("ONE-2", 1, 2, 3, 4, "Titulo", null, 10, "IA", 20, Antes, versaoFluxoId: 5, etapaOrdem: null);
        Assert.Equal((null, null, null), (fora.VersaoFluxoId, fora.EtapaOrdem, fora.EtapaDesde));
    }
}
