using static One.Api.Dados.EstadosChamado;

namespace One.Api.Dados.Chamados;

public class Chamado : IDaInstituicao
{
    static readonly string[] Abertos = [Aberto, EmAtendimento, AguardandoAluno];
    static readonly string[] NaoFechados = [Aberto, EmAtendimento, AguardandoAluno, Resolvido];

    readonly List<MensagemChamado> _mensagens = [];
    readonly List<EventoChamado> _eventos = [];

    Chamado() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public string Numero { get; private set; } = "";
    public long ConversaId { get; private set; }
    public long SolicitanteId { get; private set; }
    public long MatriculaId { get; private set; }
    public int Semestre { get; private set; }
    public string Titulo { get; private set; } = "";
    public string? Resumo { get; private set; }
    public long CategoriaId { get; private set; }
    public long CategoriaOriginalId { get; private set; }
    public string OrigemCategoria { get; private set; } = "";
    public long SetorId { get; private set; }
    public long? ResponsavelId { get; private set; }
    public string Estado { get; private set; } = Aberto;
    public string? MotivoFechamento { get; private set; }
    public int Reaberturas { get; private set; }
    public int Encaminhamentos { get; private set; }
    public DateTime CriadoEm { get; private set; }
    public DateTime? ResolvidoEm { get; private set; }
    public DateTime? FechadoEm { get; private set; }
    public DateTime? AguardandoDesde { get; private set; }
    public DateTime? LembreteEm { get; private set; }
    public long? VersaoFluxoId { get; private set; }
    public int? EtapaOrdem { get; private set; }
    public DateTime? EtapaDesde { get; private set; }
    public string? NumeroOriginal { get; private set; }
    public uint Xmin { get; private set; }
    public IReadOnlyCollection<MensagemChamado> Mensagens => _mensagens;
    public IReadOnlyCollection<EventoChamado> Eventos => _eventos;

    readonly record struct Ato(long? AtorId, DateTime Agora);

    public static Chamado Abrir(string numero, long conversaId, long solicitanteId, long matriculaId, int semestre, string titulo,
        string? resumo, long categoriaId, string origemCategoria, long setorId, DateTime agora, long? versaoFluxoId = null, int? etapaOrdem = null)
    {
        var c = new Chamado
        {
            Numero = numero, ConversaId = conversaId, SolicitanteId = solicitanteId, MatriculaId = matriculaId, Semestre = semestre,
            Titulo = titulo, Resumo = resumo, CategoriaId = categoriaId, CategoriaOriginalId = categoriaId, OrigemCategoria = origemCategoria,
            SetorId = setorId, CriadoEm = agora, VersaoFluxoId = etapaOrdem is null ? null : versaoFluxoId, EtapaOrdem = etapaOrdem, EtapaDesde = etapaOrdem is null ? null : agora,
        };
        c._eventos.Add(new EventoChamado { Tipo = TiposEvento.Criacao, Para = c.Estado, CriadoEm = agora });
        return c;
    }

    public Recusa? Assumir(long atorId, string? nomeAnterior, string nomeNovo, DateTime agora)
    {
        Exigir(Abertos);
        if (ResponsavelId == atorId) return new Recusa("Você já é o responsável por este chamado.");
        var ato = new Ato(atorId, agora);
        Atribuir(atorId, nomeAnterior, nomeNovo, ato);
        if (Estado == Aberto) Mudar(EmAtendimento, ato);
        return null;
    }

    public void ResponderComoAluno(long atorId, string texto, IEnumerable<Anexo> anexos, DateTime agora)
    {
        Exigir(Abertos);
        var ato = new Ato(atorId, agora);
        Anexar(Mensagem(TiposMensagem.Publica, texto, ato), anexos, ato);
        if (Estado == AguardandoAluno) Mudar(EmAtendimento, ato);
    }

    public void ResponderComoEquipe(long atorId, string nomeAtor, string texto, IEnumerable<Anexo> anexos, bool aguardaAluno, DateTime agora)
    {
        Exigir(Abertos);
        var ato = new Ato(atorId, agora);
        Anexar(Mensagem(TiposMensagem.Publica, texto, ato), anexos, ato);
        if (ResponsavelId is null) Atribuir(atorId, null, nomeAtor, ato);
        Mudar(aguardaAluno ? AguardandoAluno : EmAtendimento, ato);
    }

    public void Anotar(long atorId, string texto, DateTime agora)
    {
        Exigir(NaoFechados);
        Mensagem(TiposMensagem.Nota, texto, new Ato(atorId, agora));
    }

    public void Resolver(long atorId, string nomeAtor, string texto, DateTime agora)
    {
        Exigir(Abertos);
        var ato = new Ato(atorId, agora);
        Mensagem(TiposMensagem.Publica, texto, ato);
        if (ResponsavelId is null) Atribuir(atorId, null, nomeAtor, ato);
        Mudar(Resolvido, ato);
        ResolvidoEm = agora;
    }

    public void Confirmar(long atorId, DateTime agora)
    {
        Exigir([Resolvido]);
        Fechar(MotivosFechamento.Confirmado, null, new Ato(atorId, agora));
    }

    public Recusa? Rejeitar(long atorId, string motivo, IEnumerable<Anexo> anexos, bool responsavelAtivo, string? nomeResponsavel, int prazoDias, DateTime agora)
    {
        Exigir([Resolvido]);
        if (agora > ResolvidoEm!.Value + TimeSpan.FromDays(prazoDias)) return new Recusa($"O prazo de {prazoDias} dias para rejeitar a resolução terminou.");
        var ato = new Ato(atorId, agora);
        Anexar(Mensagem(TiposMensagem.Publica, motivo, ato), anexos, ato);
        if (!responsavelAtivo) Atribuir(null, nomeResponsavel, null, ato);
        Mudar(responsavelAtivo ? EmAtendimento : Aberto, ato);
        Reaberturas++;
        return null;
    }

    public void Cancelar(long atorId, string? justificativa, DateTime agora)
    {
        Exigir(Abertos);
        Fechar(MotivosFechamento.Cancelado, string.IsNullOrWhiteSpace(justificativa) ? null : justificativa, new Ato(atorId, agora));
    }

    public void Encaminhar(long atorId, long setorId, string nomeSetorAtual, string nomeSetorNovo, string motivo, string? nomeResponsavel, DateTime agora)
    {
        Exigir(Abertos);
        var ato = new Ato(atorId, agora);
        Mensagem(TiposMensagem.Nota, motivo, ato);
        Evento(TiposEvento.Encaminhamento, ato, nomeSetorAtual, nomeSetorNovo);
        Atribuir(null, nomeResponsavel, null, ato);
        Mudar(Aberto, ato);
        SetorId = setorId;
        Encaminhamentos++;
        EtapaOrdem = null;
        EtapaDesde = null;
    }

    // Passa o chamado à etapa seguinte do próprio fluxo. Não é encaminhamento: Encaminhamentos não muda (RoteamentoCorreto).
    // torId nulo é a subida do Agendador, que não escreve nota.
    public void Subir(long? atorId, string nomeSetorAtual, string nomeSetorNovo, long setorId, int etapaOrdem, string detalhe, string? nomeResponsavel, DateTime agora)
    {
        Exigir(Abertos);
        var ato = new Ato(atorId, agora);
        if (atorId is not null) Mensagem(TiposMensagem.Nota, detalhe, ato);
        Evento(TiposEvento.Subida, ato, nomeSetorAtual, nomeSetorNovo, detalhe);
        Atribuir(null, nomeResponsavel, null, ato);
        Mudar(Aberto, ato);
        SetorId = setorId;
        EtapaOrdem = etapaOrdem;
        EtapaDesde = agora;
    }

    public void Reclassificar(long atorId, long categoriaId, string nomeAtual, string nomeNova, DateTime agora)
    {
        Exigir(NaoFechados);
        Evento(TiposEvento.Reclassificacao, new Ato(atorId, agora), nomeAtual, nomeNova);
        CategoriaId = categoriaId;
    }

    public void MarcarDuplicado(long atorId, string numeroOriginal, DateTime agora)
    {
        Exigir(Abertos);
        var ato = new Ato(atorId, agora);
        Mensagem(TiposMensagem.Publica, $"Este pedido continua em {numeroOriginal}.", ato);
        NumeroOriginal = numeroOriginal;
        Fechar(MotivosFechamento.Duplicado, null, ato);
    }

    public void DevolverAFila(long atorId, string nomeResponsavel, DateTime agora)
    {
        Exigir(NaoFechados);
        var ato = new Ato(atorId, agora);
        Evento(TiposEvento.Atribuicao, ato, nomeResponsavel, detalhe: "Responsável desativado");
        ResponsavelId = null;
        if (Estado is not (EmAtendimento or AguardandoAluno)) return;
        Evento(TiposEvento.Transicao, ato, Estado, Aberto);
        Estado = Aberto;
        AguardandoDesde = null;
    }

    void Exigir(string[] estados)
    {
        if (!estados.Contains(Estado)) throw new InvalidOperationException($"A transição não existe no estado {Estado}.");
    }

    void Evento(string tipo, Ato ato, string? de = null, string? para = null, string? detalhe = null) =>
        _eventos.Add(new EventoChamado { Tipo = tipo, AtorId = ato.AtorId, De = de, Para = para, Detalhe = detalhe, CriadoEm = ato.Agora });

    MensagemChamado Mensagem(string tipo, string texto, Ato ato)
    {
        var m = new MensagemChamado { AutorId = ato.AtorId, Tipo = tipo, Texto = texto, CriadaEm = ato.Agora };
        _mensagens.Add(m);
        Evento(tipo == TiposMensagem.Nota ? TiposEvento.Nota : TiposEvento.Resposta, ato);
        return m;
    }

    void Anexar(MensagemChamado m, IEnumerable<Anexo> anexos, Ato ato)
    {
        foreach (var anexo in anexos)
        {
            m.Anexos.Add(anexo);
            Evento(TiposEvento.Anexo, ato, detalhe: anexo.Nome);
        }
    }

    void Atribuir(long? responsavelId, string? nomeAnterior, string? nomeNovo, Ato ato)
    {
        if (ResponsavelId == responsavelId) return;
        Evento(TiposEvento.Atribuicao, ato, ResponsavelId is null ? null : nomeAnterior, responsavelId is null ? null : nomeNovo);
        ResponsavelId = responsavelId;
    }

    void Mudar(string estado, Ato ato)
    {
        if (Estado == estado) return;
        Evento(TiposEvento.Transicao, ato, Estado, estado);
        Estado = estado;
        AguardandoDesde = estado == AguardandoAluno ? ato.Agora : null;
        LembreteEm = null;
    }

    void Fechar(string motivo, string? justificativa, Ato ato)
    {
        Evento(TiposEvento.Transicao, ato, Estado, Fechado, justificativa);
        Estado = Fechado;
        MotivoFechamento = motivo;
        FechadoEm = ato.Agora;
        AguardandoDesde = null;
    }
}
