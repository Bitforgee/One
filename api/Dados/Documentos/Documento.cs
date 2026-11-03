namespace One.Api.Dados.Documentos;

// RAG, door R4: PDF da instituição, fonte interna do assistente como o artigo (AD-012)
// door 3: o documento guarda o estado e o número das versões; as versões são append-only e o banco não é consultado aqui.
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

    // AC 19 e 20: versão nova só em documento ATIVO; o número tem de passar o de toda versão que o documento guarda.
    public Recusa? NovaVersao(VersaoDocumento versao)
    {
        if (Estado == EstadosDocumento.Arquivado) return new Recusa("O documento está arquivado.");
        Acrescentar(versao);
        return null;
    }

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
