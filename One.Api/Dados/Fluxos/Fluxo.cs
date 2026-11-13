namespace One.Api.Dados.Fluxos;

public class Fluxo : IDaInstituicao
{
    readonly List<VersaoFluxo> _versoes = [];

    Fluxo() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long CategoriaId { get; private set; }
    public long? CursoId { get; private set; }
    public int? Semestre { get; private set; }
    public IReadOnlyCollection<VersaoFluxo> Versoes => _versoes;

    public VersaoFluxo? Vigente => _versoes.Where(v => v.PublicadaEm is not null).MaxBy(v => v.Numero);
    public VersaoFluxo? Rascunho => _versoes.FirstOrDefault(v => v.PublicadaEm is null);

    public static Fluxo Criar(long categoriaId, long? cursoId, int? semestre) =>
        new() { CategoriaId = categoriaId, CursoId = cursoId, Semestre = semestre };

    public const string MotivoDestino = "O destino deve ser SETOR, COORDENACAO_CURSO ou LIDERANCA_SEMESTRE.";
    public const string MotivoLideranca = "A liderança do semestre só pode ser a primeira etapa e nunca a última.";
    public const string MotivoSetorAtivo = "Escolha um setor ativo da instituição.";
    public const string MotivoSetorSoDeSetor = "Só a etapa de setor leva um setor.";
    public const string MotivoPrazo = "O prazo vai de 1 a 720 horas e não vale na última etapa.";

    public static List<long> SetoresPedidos(IEnumerable<EtapaFluxo.Dados>? etapas) =>
        [.. (etapas ?? []).Where(e => e.Destino == DestinosEtapa.Setor && e.SetorId is not null).Select(e => e.SetorId!.Value)];

    public static Invalido? Validar(IReadOnlyList<EtapaFluxo.Dados>? etapas, IReadOnlySet<long> setoresValidos)
    {
        if (etapas is null || etapas.Count is < 1 or > 5) return new Invalido("O fluxo precisa de 1 a 5 etapas.");
        return etapas.Select((e, i) => ErroDaEtapa(e, i, etapas.Count, setoresValidos)).FirstOrDefault(erro => erro is not null);
    }

    static Invalido? ErroDaEtapa(EtapaFluxo.Dados e, int indice, int total, IReadOnlySet<long> setoresValidos) =>
        ErroDoDestino(e, indice, total) ?? ErroDoSetor(e, setoresValidos) ?? ErroDoPrazo(e, indice, total) ?? ErroDaPosicao(e);

    static Invalido? ErroDoDestino(EtapaFluxo.Dados e, int indice, int total)
    {
        if (!DestinosEtapa.Todos.Contains(e.Destino)) return new Invalido(MotivoDestino);
        var lideranca = e.Destino == DestinosEtapa.LiderancaSemestre;
        return lideranca && (indice != 0 || indice == total - 1) ? new Invalido(MotivoLideranca) : null;
    }

    static Invalido? ErroDoSetor(EtapaFluxo.Dados e, IReadOnlySet<long> setoresValidos)
    {
        if (e.Destino == DestinosEtapa.Setor)
            return e.SetorId is { } id && setoresValidos.Contains(id) ? null : new Invalido(MotivoSetorAtivo);
        return e.SetorId is null ? null : new Invalido(MotivoSetorSoDeSetor);
    }

    static Invalido? ErroDoPrazo(EtapaFluxo.Dados e, int indice, int total) =>
        e.PrazoHoras is { } horas && (horas is < 1 or > 720 || indice == total - 1)
            ? new Invalido(MotivoPrazo)
            : null;

    static Invalido? ErroDaPosicao(EtapaFluxo.Dados e) =>
        (e.X is null) != (e.Y is null) ? new Invalido("Informe x e y juntos.") : null;

    public void SalvarRascunho(IEnumerable<EtapaFluxo.Dados> etapas)
    {
        var rascunho = Rascunho;
        if (rascunho is null)
        {
            rascunho = VersaoFluxo.Nova(_versoes.Select(v => v.Numero).DefaultIfEmpty(0).Max() + 1);
            _versoes.Add(rascunho);
        }
        rascunho.Substituir(etapas);
    }

    public Recusa? Publicar(DateTime agora)
    {
        if (Rascunho is not { } rascunho) return new Recusa("Não há rascunho para publicar.");
        rascunho.Publicar(agora);
        return null;
    }

    public Recusa? DescartarRascunho()
    {
        if (Rascunho is not { } rascunho) return new Recusa("Não há rascunho para descartar.");
        _versoes.Remove(rascunho);
        return null;
    }
}
