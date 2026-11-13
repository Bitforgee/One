using One.Api.Dados;
using One.Api.Instituicoes;

namespace One.Api.Tests;

public class CargaValidacaoTests
{
    static Existentes Existentes() => new(
        Setores: new() { ["Triagem"] = Setor.CriarTriagem() },
        Categorias: new() { ["Não classificado"] = Categoria.CriarPadrao(), ["Boletos"] = Categoria.Criar("Boletos") },
        Cursos: ["Direito"],
        CategoriasComRegra: ["Boletos"]);

    static List<string> Erros(ArquivoCarga arquivo) => CargaValidacao.Validar(arquivo, Existentes()).Erros;

    static ArquivoCarga Arquivo(List<SetorCarga>? setores = null, List<CursoCarga>? cursos = null, List<CategoriaCarga>? categorias = null,
        List<RegraCarga>? regras = null, List<ArtigoCarga>? artigos = null) => new(setores, cursos, categorias, regras, artigos);

    static ArtigoCarga Artigo(string? titulo = "Boleto", List<string>? perguntas = null, string? categoria = "Boletos", string? resposta = "No portal.", List<string>? links = null) =>
        new(titulo, perguntas ?? ["Onde está o boleto?"], categoria, resposta, links);

    [Fact]
    public void Um_caso_por_motivo()
    {
        var casos = new (string motivo, ArquivoCarga arquivo, string[] esperado)[]
        {
            ("setor sem nome", Arquivo(setores: [new(" ")]), ["setores[0].nome: obrigatório"]),
            ("setor repetido no arquivo e na instituição", Arquivo(setores: [new("Financeiro"), new("Financeiro"), new("Triagem")]),
                ["setores[1].nome: \"Financeiro\" repetido", "setores[2].nome: \"Triagem\" repetido"]),
            ("categoria sem nome", Arquivo(categorias: [new(null)]), ["categorias[0].nome: obrigatório"]),
            ("categoria repetida no arquivo e na instituição", Arquivo(categorias: [new("Matrícula"), new("Matrícula"), new("Boletos")]),
                ["categorias[1].nome: \"Matrícula\" repetida", "categorias[2].nome: \"Boletos\" repetida"]),
            ("curso sem nome", Arquivo(cursos: [new("", null)]), ["cursos[0].nome: obrigatório"]),
            ("curso repetido no arquivo e na instituição", Arquivo(cursos: [new("Medicina", null), new("Medicina", null), new("Direito", null)]),
                ["cursos[1].nome: \"Medicina\" repetido", "cursos[2].nome: \"Direito\" repetido"]),
            ("coordenação inexistente", Arquivo(cursos: [new("Medicina", "Coordenação de Medicina")]), ["cursos[0].coordenacao: setor \"Coordenação de Medicina\" não existe"]),
            ("regra sem categoria ou com categoria inexistente", Arquivo(regras: [new(null, "Triagem", false), new("Estágio", "Triagem", false)]),
                ["regras[0].categoria: categoria \"\" não existe", "regras[1].categoria: categoria \"Estágio\" não existe"]),
            ("categoria já com regra, na instituição e no arquivo", Arquivo(categorias: [new("Matrícula")], regras: [new("Boletos", "Triagem", false), new("Matrícula", "Triagem", false), new("Matrícula", null, true)]),
                ["regras[0].categoria: \"Boletos\" já tem regra", "regras[2].categoria: \"Matrícula\" já tem regra"]),
            ("regra sem setor nem coordenação, ou com os dois", Arquivo(regras: [new("Não classificado", null, false), new("Não classificado", "Triagem", true)]),
                ["regras[0]: informe setor ou coordenacaoDoCurso, um dos dois", "regras[1].categoria: \"Não classificado\" já tem regra", "regras[1]: informe setor ou coordenacaoDoCurso, um dos dois"]),
            ("setor da regra inexistente", Arquivo(regras: [new("Não classificado", "Jurídico", false)]), ["regras[0].setor: setor \"Jurídico\" não existe"]),
            ("artigo sem título", Arquivo(artigos: [Artigo(titulo: " ")]), ["artigos[0].titulo: obrigatório"]),
            ("artigo sem pergunta", Arquivo(artigos: [Artigo(perguntas: []), Artigo(perguntas: ["Onde?", " "])]),
                ["artigos[0].perguntas: informe ao menos uma pergunta", "artigos[1].perguntas: informe ao menos uma pergunta"]),
            ("artigo sem resposta", Arquivo(artigos: [Artigo(resposta: null)]), ["artigos[0].resposta: obrigatória"]),
            ("link sem http(s)", Arquivo(artigos: [Artigo(links: ["https://a.br", "ftp://b.br"])]), ["artigos[0].links[1]: deve começar com https:// ou http://"]),
            ("categoria do artigo inexistente", Arquivo(artigos: [Artigo(categoria: "Estágio")]), ["artigos[0].categoria: categoria \"Estágio\" não existe"]),
        };
        Assert.Equal(16, casos.Length);
        foreach (var (motivo, arquivo, esperado) in casos)
            Assert.True(esperado.SequenceEqual(Erros(arquivo)), $"{motivo}: [{string.Join(" | ", Erros(arquivo))}]");

        var (erros, plano) = CargaValidacao.Validar(Arquivo(setores: [new("Financeiro")], categorias: [new("Matrícula")], cursos: [new("Medicina", "Financeiro")],
            regras: [new("Matrícula", null, true)], artigos: [Artigo()]), Existentes());
        Assert.Empty(erros);
        Assert.Equal(["Financeiro", "Triagem"], plano.Setores.Keys.Order());
        Assert.Equal(["Medicina"], plano.Cursos.Select(c => c.Nome));
        Assert.Equal("COORDENACAO_CURSO", Assert.Single(plano.Regras).Destino);
        Assert.Equal("Boletos", Assert.Single(plano.Artigos).Categoria.Nome);
    }

    [Fact]
    public void Regra_da_carga_vira_fluxo_de_uma_etapa()
    {
        var (erros, plano) = CargaValidacao.Validar(Arquivo(setores: [new("Financeiro")], categorias: [new("Matrícula"), new("Notas")],
            regras: [new("Matrícula", "Financeiro", false), new("Notas", null, true)]), Existentes());

        Assert.Empty(erros);
        Assert.Equal(2, plano.Regras.Count);
        Assert.Equal((DestinosEtapa.Setor, "Matrícula", "Financeiro"), (plano.Regras[0].Destino, plano.Regras[0].Categoria.Nome, plano.Regras[0].Setor!.Nome));
        Assert.Equal((DestinosEtapa.CoordenacaoCurso, "Notas", null), (plano.Regras[1].Destino, plano.Regras[1].Categoria.Nome, plano.Regras[1].Setor?.Nome));
    }

    [Fact]
    public void Categoria_com_fluxo_ja_tem_regra()
    {
        var erros = Erros(Arquivo(regras: [new("Boletos", "Triagem", false)]));

        Assert.Equal(["regras[0].categoria: \"Boletos\" já tem regra"], erros);
    }
}
