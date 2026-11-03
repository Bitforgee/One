namespace One.Api.Administracao;

public record LinhaCsv(int Numero, string[] Campos);
public record ErroCsv(int Linha, string Motivo);
public record Linha(int Numero, string Cpf, string Nome, string Email, string Matricula, long CursoId, int Semestre, string Situacao);

public static class CsvMatriculas
{
    public const string Cabecalho = "cpf;nome;email;matricula;curso;semestre;situacao";

    public static (List<LinhaCsv> Linhas, ErroCsv? Erro) Separar(string texto)
    {
        var linhas = texto.Split('\n').Select(l => l.TrimEnd('\r')).ToList();
        while (linhas.Count > 0 && linhas[^1].Trim() == "") linhas.RemoveAt(linhas.Count - 1);
        if (linhas.Count == 0 || linhas[0].Trim() != Cabecalho) return ([], new ErroCsv(1, $"O cabeçalho deve ser {Cabecalho}."));
        return (linhas.Skip(1).Select((l, n) => new LinhaCsv(n + 2, l.Split(';').Select(x => x.Trim()).ToArray())).ToList(), null);
    }

    public static (List<Linha> Validas, List<ErroCsv> Erros) Validar(List<LinhaCsv> linhas, IReadOnlyDictionary<string, long> cursos,
        IReadOnlyDictionary<string, string> donoDaMatricula, IReadOnlyDictionary<string, string> donoDoEmail)
    {
        var (matriculas, emails) = (new Dictionary<string, string>(donoDaMatricula), new Dictionary<string, string>(donoDoEmail));
        var (validas, erros) = (new List<Linha>(), new List<ErroCsv>());
        foreach (var (numero, c) in linhas)
        {
            if (c.Length != 7) { erros.Add(new(numero, "A linha deve ter 7 campos separados por ponto e vírgula.")); continue; }
            var cpf = Cpf.Normalizar(c[0]);
            var motivos = DaPessoa(c, cpf, emails).Concat(DaMatricula(c, cpf, cursos, matriculas)).ToList();
            if (motivos.Count > 0) { erros.Add(new(numero, string.Join("; ", motivos))); continue; }
            matriculas[c[3]] = cpf!;
            emails[c[2]] = cpf!;
            validas.Add(new Linha(numero, cpf!, c[1], c[2], c[3], cursos[c[4]], int.Parse(c[5]), c[6]));
        }
        return (validas, erros);
    }

    static IEnumerable<string> DaPessoa(string[] c, string? cpf, Dictionary<string, string> donoDoEmail)
    {
        if (cpf is null) yield return "CPF inválido";
        if (!AdminRotas.Nome(c[1], 200)) yield return "nome vazio ou com mais de 200 caracteres";
        if (!Email.Valido().IsMatch(c[2])) yield return "e-mail inválido";
        else if (cpf is not null && donoDoEmail.TryGetValue(c[2], out var outroCpf) && outroCpf != cpf) yield return "e-mail já usado por outro CPF na instituição";
    }

    static IEnumerable<string> DaMatricula(string[] c, string? cpf, IReadOnlyDictionary<string, long> cursos, Dictionary<string, string> donoDaMatricula)
    {
        if (c[3].Length is 0 or > 20) yield return "matrícula vazia ou com mais de 20 caracteres";
        else if (cpf is not null && donoDaMatricula.TryGetValue(c[3], out var dono) && dono != cpf) yield return "matrícula já ligada a outro CPF na instituição";
        if (!cursos.ContainsKey(c[4])) yield return "curso inexistente na instituição";
        if (!int.TryParse(c[5], out var semestre) || semestre is < 1 or > 12) yield return "semestre fora de 1 a 12";
        if (c[6] is not ("ATIVA" or "INATIVA")) yield return "situação deve ser ATIVA ou INATIVA";
    }
}
