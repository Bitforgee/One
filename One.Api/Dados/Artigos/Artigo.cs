namespace One.Api.Dados.Artigos;

public class Artigo : IDaInstituicao
{
    readonly List<VersaoArtigo> _versoes = [];

    Artigo() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long CategoriaId { get; private set; }
    public string Estado { get; private set; } = EstadosArtigo.Rascunho;
    public DateOnly? VisivelDe { get; private set; }
    public DateOnly? VisivelAte { get; private set; }
    public IReadOnlyCollection<VersaoArtigo> Versoes => _versoes;

    public static Artigo Criar(long categoriaId, DateOnly? visivelDe, DateOnly? visivelAte, VersaoArtigo primeira)
    {
        var a = new Artigo { CategoriaId = categoriaId, VisivelDe = visivelDe, VisivelAte = visivelAte };
        a.Acrescentar(primeira.Numero == 1 ? primeira : throw new InvalidOperationException("A primeira versão tem o número 1."));
        return a;
    }

    public void NovaVersao(VersaoArtigo versao, long categoriaId, DateOnly? visivelDe, DateOnly? visivelAte)
    {
        Acrescentar(versao);
        (CategoriaId, VisivelDe, VisivelAte) = (categoriaId, visivelDe, visivelAte);
    }

    public VersaoArtigo UltimaVersao => _versoes.MaxBy(v => v.Numero)!;

    public Recusa? Ativar()
    {
        if (Estado == EstadosArtigo.Ativo) return new Recusa("O artigo já está ativo.");
        Estado = EstadosArtigo.Ativo;
        return null;
    }

    public Recusa? Arquivar()
    {
        if (Estado == EstadosArtigo.Arquivado) return new Recusa("O artigo já está arquivado.");
        Estado = EstadosArtigo.Arquivado;
        return null;
    }

    void Acrescentar(VersaoArtigo versao)
    {
        if (_versoes.Any(v => v.Numero >= versao.Numero)) throw new InvalidOperationException($"A versão {versao.Numero} não passa a última do artigo.");
        _versoes.Add(versao);
    }
}
