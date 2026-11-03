using One.Api.Dados;

namespace One.Api.Tests;

// dominio-e-contratos C30, C32 e C33: o Documento decide o próprio estado e o número das versões, sem banco e sem HTTP.
public class DocumentoDominioTests
{
    static readonly DateTime Agora = new(2026, 11, 2, 12, 0, 0, DateTimeKind.Utc);

    static VersaoDocumento Versao(int numero) => new() { Numero = numero, NomeArquivo = $"r{numero}.pdf", Conteudo = [1], Texto = "t", Paginas = 1, CriadaEm = Agora };

    static Documento Novo() => Documento.Criar("Regulamento", 10, Versao(1));

    [Fact]
    public void Cada_transicao_como_a_base()
    {
        var d = Novo();
        Assert.Equal((EstadosDocumento.Ativo, "Regulamento", 10), (d.Estado, d.Titulo, d.CategoriaId));
        Assert.Equal(1, Assert.Single(d.Versoes).Numero);

        Assert.Null(d.NovaVersao(Versao(2)));
        Assert.Equal([1, 2], d.Versoes.Select(v => v.Numero));
        Assert.Equal(EstadosDocumento.Ativo, d.Estado);

        Assert.Null(d.Arquivar());
        Assert.Equal(EstadosDocumento.Arquivado, d.Estado);
    }

    [Fact]
    public void Arquivado_recusa_versao_e_arquivar()
    {
        var d = Novo();
        d.Arquivar();
        Assert.Equal("O documento está arquivado.", d.NovaVersao(Versao(2))?.Motivo);
        Assert.Equal("O documento já está arquivado.", d.Arquivar()?.Motivo);
        Assert.Equal(EstadosDocumento.Arquivado, d.Estado);
        Assert.Equal(1, Assert.Single(d.Versoes).Numero);
    }

    [Fact]
    public void Versao_sem_numero_maior_lanca()
    {
        var d = Novo();
        d.NovaVersao(Versao(2));
        foreach (var numero in new[] { 2, 1 })
        {
            Assert.Throws<InvalidOperationException>(() => d.NovaVersao(Versao(numero)));
            Assert.Equal([1, 2], d.Versoes.Select(v => v.Numero));
        }
        Assert.Null(d.NovaVersao(Versao(3)));
        Assert.Equal([1, 2, 3], d.Versoes.Select(v => v.Numero));
        Assert.Throws<InvalidOperationException>(() => Documento.Criar("x", 10, Versao(2)));
    }
}
