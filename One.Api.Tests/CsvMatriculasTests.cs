using One.Api.Administracao;

namespace One.Api.Tests;

// refatoracao-solid C25: a leitura do CSV de matrículas devolve as linhas válidas e os erros por linha, sem gravar.
public class CsvMatriculasTests
{
    const string CpfA = "52998224725", CpfB = "11144477735";
    static readonly Dictionary<string, long> Cursos = new() { ["Direito"] = 5 };

    // Uma instituição onde a matrícula 2024002 e o e-mail b@univag.br já são do CPF B.
    static (List<Linha> Validas, List<ErroCsv> Erros) Ler(params string[] linhas)
    {
        var (lidas, erro) = CsvMatriculas.Separar(string.Join("\n", [CsvMatriculas.Cabecalho, .. linhas]));
        Assert.Null(erro);
        return CsvMatriculas.Validar(lidas, Cursos, new Dictionary<string, string> { ["2024002"] = CpfB }, new Dictionary<string, string> { ["b@univag.br"] = CpfB });
    }

    static string Linha(string cpf = CpfA, string nome = "Ana", string email = "a@univag.br", string matricula = "2024001", string curso = "Direito", string semestre = "3", string situacao = "ATIVA") =>
        string.Join(";", cpf, nome, email, matricula, curso, semestre, situacao);

    [Fact]
    public void Um_caso_por_motivo()
    {
        var casos = new (string motivo, string[] linhas, ErroCsv[] esperado)[]
        {
            ("campos diferentes de 7", ["1;2;3", Linha() + ";a mais"],
                [new(2, "A linha deve ter 7 campos separados por ponto e vírgula."), new(3, "A linha deve ter 7 campos separados por ponto e vírgula.")]),
            ("CPF inválido", [Linha(cpf: "52998224724")], [new(2, "CPF inválido")]),
            ("nome vazio ou longo", [Linha(nome: " "), Linha(nome: new string('n', 201), matricula: "2024003")],
                [new(2, "nome vazio ou com mais de 200 caracteres"), new(3, "nome vazio ou com mais de 200 caracteres")]),
            ("e-mail inválido", [Linha(email: "sem-arroba")], [new(2, "e-mail inválido")]),
            ("e-mail de outro CPF, na instituição e no arquivo", [Linha(email: "b@univag.br"), Linha(email: "c@univag.br"), Linha(cpf: CpfB, email: "c@univag.br", matricula: "2024009")],
                [new(2, "e-mail já usado por outro CPF na instituição"), new(4, "e-mail já usado por outro CPF na instituição")]),
            ("matrícula vazia ou longa", [Linha(matricula: ""), Linha(matricula: new string('1', 21))],
                [new(2, "matrícula vazia ou com mais de 20 caracteres"), new(3, "matrícula vazia ou com mais de 20 caracteres")]),
            ("matrícula de outro CPF, na instituição e no arquivo", [Linha(matricula: "2024002"), Linha(matricula: "2024005"), Linha(cpf: CpfB, email: "b@univag.br", matricula: "2024005")],
                [new(2, "matrícula já ligada a outro CPF na instituição"), new(4, "matrícula já ligada a outro CPF na instituição")]),
            ("curso inexistente", [Linha(curso: "Medicina")], [new(2, "curso inexistente na instituição")]),
            ("semestre fora de 1 a 12", [Linha(semestre: "0"), Linha(semestre: "13"), Linha(semestre: "x")],
                [new(2, "semestre fora de 1 a 12"), new(3, "semestre fora de 1 a 12"), new(4, "semestre fora de 1 a 12")]),
            ("situação", [Linha(situacao: "TRANCADA")], [new(2, "situação deve ser ATIVA ou INATIVA")]),
            ("dois motivos na mesma linha", [Linha(cpf: "123", semestre: "13")], [new(2, "CPF inválido; semestre fora de 1 a 12")]),
        };
        foreach (var (motivo, linhas, esperado) in casos)
            Assert.True(esperado.SequenceEqual(Ler(linhas).Erros), $"{motivo}: [{string.Join(" | ", Ler(linhas).Erros)}]");

        // nos limites aceitos: nome de 200, matrícula de 20, semestres 1 e 12, INATIVA; CPF com pontos e traço normalizado
        var (validas, erros) = Ler(Linha(cpf: "529.982.247-25", nome: new string('n', 200), matricula: new string('1', 20), semestre: "1"),
            Linha(cpf: CpfB, email: "b@univag.br", matricula: "2024002", semestre: "12", situacao: "INATIVA"));
        Assert.Empty(erros);
        Assert.Equal([new Linha(2, CpfA, new string('n', 200), "a@univag.br", new string('1', 20), 5, 1, "ATIVA"), new Linha(3, CpfB, "Ana", "b@univag.br", "2024002", 5, 12, "INATIVA")], validas);
    }

    [Fact]
    public void Cabecalho_errado_e_linhas_em_branco_no_fim()
    {
        Assert.Equal(new ErroCsv(1, $"O cabeçalho deve ser {CsvMatriculas.Cabecalho}."), CsvMatriculas.Separar("cpf;nome\n" + Linha()).Erro);
        Assert.Equal(new ErroCsv(1, $"O cabeçalho deve ser {CsvMatriculas.Cabecalho}."), CsvMatriculas.Separar("\n \n").Erro);
        var (linhas, erro) = CsvMatriculas.Separar(CsvMatriculas.Cabecalho + "\r\n" + Linha() + "\r\n\r\n \n");
        Assert.Null(erro);
        Assert.Equal(2, Assert.Single(linhas).Numero);
    }
}
