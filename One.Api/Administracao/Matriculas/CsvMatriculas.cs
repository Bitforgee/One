using One.Api.Administracao.Usuarios;

namespace One.Api.Administracao.Matriculas;

public record LinhaCsv(int Numero, int Colunas, string Cpf, string Nome, string Email, string Matricula, string Curso, string Semestre, string Situacao)
{
    public static LinhaCsv De(int numero, string[] c)
    {
        string Campo(int i) => i < c.Length ? c[i] : "";
        return new(numero, c.Length, Campo(0), Campo(1), Campo(2), Campo(3), Campo(4), Campo(5), Campo(6));
    }
}
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
        return (linhas.Skip(1).Select((l, n) => LinhaCsv.De(n + 2, l.Split(';').Select(x => x.Trim()).ToArray())).ToList(), null);
    }

    public static (List<Linha> Validas, List<ErroCsv> Erros) Validar(List<LinhaCsv> linhas, IReadOnlyDictionary<string, long> cursos,
        IReadOnlyDictionary<string, string> donoDaMatricula, IReadOnlyDictionary<string, string> donoDoEmail)
    {
        var (matriculas, emails) = (new Dictionary<string, string>(donoDaMatricula), new Dictionary<string, string>(donoDoEmail));
        var (validas, erros) = (new List<Linha>(), new List<ErroCsv>());
        foreach (var l in linhas)
        {
            if (l.Colunas != 7) { erros.Add(new(l.Numero, "A linha deve ter 7 campos separados por ponto e vírgula.")); continue; }
            var cpf = Cpf.Tentar(l.Cpf)?.Valor;
            var motivos = DaPessoa(l, cpf, emails).Concat(DaMatricula(l, cpf, cursos, matriculas)).ToList();
            if (motivos.Count > 0) { erros.Add(new(l.Numero, string.Join("; ", motivos))); continue; }
            matriculas[l.Matricula] = cpf!;
            emails[l.Email] = cpf!;
            validas.Add(new Linha(l.Numero, cpf!, l.Nome, l.Email, l.Matricula, cursos[l.Curso], int.Parse(l.Semestre), l.Situacao));
        }
        return (validas, erros);
    }

    static IEnumerable<string> DaPessoa(LinhaCsv l, string? cpf, Dictionary<string, string> donoDoEmail)
    {
        if (cpf is null) yield return "CPF inválido";
        if (!ValidacaoDeUsuario.Nome(l.Nome, 200)) yield return "nome vazio ou com mais de 200 caracteres";
        if (!EnviadorSmtp.Valido().IsMatch(l.Email)) yield return "e-mail inválido";
        else if (cpf is not null && donoDoEmail.TryGetValue(l.Email, out var outroCpf) && outroCpf != cpf) yield return "e-mail já usado por outro CPF na instituição";
    }

    static IEnumerable<string> DaMatricula(LinhaCsv l, string? cpf, IReadOnlyDictionary<string, long> cursos, Dictionary<string, string> donoDaMatricula)
    {
        if (l.Matricula.Length is 0 or > 20) yield return "matrícula vazia ou com mais de 20 caracteres";
        else if (cpf is not null && donoDaMatricula.TryGetValue(l.Matricula, out var dono) && dono != cpf) yield return "matrícula já ligada a outro CPF na instituição";
        if (!cursos.ContainsKey(l.Curso)) yield return "curso inexistente na instituição";
        if (!int.TryParse(l.Semestre, out var semestre) || semestre is < 1 or > 12) yield return "semestre fora de 1 a 12";
        if (l.Situacao is not ("ATIVA" or "INATIVA")) yield return "situação deve ser ATIVA ou INATIVA";
    }
}
