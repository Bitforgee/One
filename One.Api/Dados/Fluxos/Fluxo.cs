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
