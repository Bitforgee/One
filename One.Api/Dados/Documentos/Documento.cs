namespace One.Api.Dados.Documentos;

public class Documento : IDaInstituicao
{
    readonly List<VersaoDocumento> _versoes = [];

    Documento() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public string Titulo { get; private set; } = "";
    public long CategoriaId { get; private set; }
    public string Estado { get; private set; } = EstadosDocumento.Ativo;
    public IReadOnlyCollection<VersaoDocumento> Versoes => _versoes;

    public static Documento Criar(string titulo, long categoriaId, VersaoDocumento primeira)
    {
        var d = new Documento { Titulo = titulo, CategoriaId = categoriaId };
        d.Acrescentar(primeira.Numero == 1 ? primeira : throw new InvalidOperationException("A primeira versão tem o número 1."));
        return d;
    }

    public Recusa? NovaVersao(VersaoDocumento versao)
    {
        if (Estado == EstadosDocumento.Arquivado) return new Recusa("O documento está arquivado.");
        Acrescentar(versao);
        return null;
    }

    public VersaoDocumento UltimaVersao => _versoes.MaxBy(v => v.Numero)!;

    public Recusa? Arquivar()
    {
        if (Estado == EstadosDocumento.Arquivado) return new Recusa("O documento já está arquivado.");
        Estado = EstadosDocumento.Arquivado;
        return null;
    }

    void Acrescentar(VersaoDocumento versao)
    {
        if (_versoes.Any(v => v.Numero >= versao.Numero)) throw new InvalidOperationException($"A versão {versao.Numero} não passa a última do documento.");
        _versoes.Add(versao);
    }
}
