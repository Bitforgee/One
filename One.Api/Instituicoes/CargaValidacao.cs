using One.Api.Dados;

namespace One.Api.Instituicoes;

public record ArquivoCarga(List<SetorCarga>? Setores, List<CursoCarga>? Cursos, List<CategoriaCarga>? Categorias, List<RegraCarga>? Regras, List<ArtigoCarga>? Artigos);
public record SetorCarga(string? Nome);
public record CursoCarga(string? Nome, string? Coordenacao);
public record CategoriaCarga(string? Nome);
public record RegraCarga(string? Categoria, string? Setor, bool CoordenacaoDoCurso);
public record ArtigoCarga(string? Titulo, List<string>? Perguntas, string? Categoria, string? Resposta, List<string>? Links);

public record Existentes(Dictionary<string, Setor> Setores, Dictionary<string, Categoria> Categorias, HashSet<string> Cursos, List<long> CategoriasComRegra);

public record RegraPlanejada(RegraRoteamento Regra, Categoria Categoria, Setor? Setor);
public record ArtigoPlanejado(ArtigoCarga Artigo, Categoria Categoria);

public record Plano(Dictionary<string, Setor> Setores, Dictionary<string, Categoria> Categorias, List<Curso> Cursos, List<RegraPlanejada> Regras, List<ArtigoPlanejado> Artigos);

public static class CargaValidacao
{
    public static (List<string> Erros, Plano Plano) Validar(ArquivoCarga arq, Existentes ex)
    {
        var erros = new List<string>();
        var setores = Nomeados(arq.Setores?.Select(s => s.Nome), ex.Setores, "setores", "repetido", n => new Setor { Nome = n }, erros);
        var categorias = Nomeados(arq.Categorias?.Select(c => c.Nome), ex.Categorias, "categorias", "repetida", n => new Categoria { Nome = n }, erros);
        var cursos = Cursos(arq.Cursos ?? [], setores, ex.Cursos, erros);
        var regras = Regras(arq.Regras ?? [], categorias, setores, ex.CategoriasComRegra, erros);
        var artigos = Artigos(arq.Artigos ?? [], categorias, erros);
        return (erros, new Plano(setores, categorias, cursos, regras, artigos));
    }

    static Dictionary<string, T> Nomeados<T>(IEnumerable<string?>? nomes, Dictionary<string, T> existentes, string campo, string repetido, Func<string, T> novo, List<string> erros)
    {
        var todos = new Dictionary<string, T>(existentes);
        foreach (var (nome, i) in (nomes ?? []).Select((n, i) => (n, i)))
        {
            if (string.IsNullOrWhiteSpace(nome)) erros.Add($"{campo}[{i}].nome: obrigatório");
            else if (todos.ContainsKey(nome)) erros.Add($"{campo}[{i}].nome: \"{nome}\" {repetido}");
            else todos[nome] = novo(nome);
        }
        return todos;
    }

    static List<Curso> Cursos(List<CursoCarga> itens, Dictionary<string, Setor> setores, HashSet<string> existentes, List<string> erros)
    {
        var nomes = new HashSet<string>(existentes);
        var cursos = new List<Curso>();
        foreach (var (c, i) in itens.Select((c, i) => (c, i)))
        {
            if (string.IsNullOrWhiteSpace(c.Nome)) erros.Add($"cursos[{i}].nome: obrigatório");
            else if (!nomes.Add(c.Nome)) erros.Add($"cursos[{i}].nome: \"{c.Nome}\" repetido");
            if (c.Coordenacao is not null && !setores.ContainsKey(c.Coordenacao)) erros.Add($"cursos[{i}].coordenacao: setor \"{c.Coordenacao}\" não existe");
            cursos.Add(new Curso { Nome = c.Nome ?? "" });
        }
        return cursos;
    }

    static List<RegraPlanejada> Regras(List<RegraCarga> itens, Dictionary<string, Categoria> categorias, Dictionary<string, Setor> setores, List<long> comRegra, List<string> erros)
    {
        var regras = new List<RegraPlanejada>();
        foreach (var (r, i) in itens.Select((r, i) => (r, i)))
        {
            if (r.Categoria is null || !categorias.TryGetValue(r.Categoria, out var categoria)) { erros.Add($"regras[{i}].categoria: categoria \"{r.Categoria}\" não existe"); continue; }
            if (comRegra.Contains(categoria.Id) || regras.Any(x => x.Categoria == categoria)) erros.Add($"regras[{i}].categoria: \"{r.Categoria}\" já tem regra");
            regras.Add(new RegraPlanejada(new RegraRoteamento { Destino = r.CoordenacaoDoCurso ? "COORDENACAO_CURSO" : "SETOR" }, categoria, Destino(r, i, setores, erros)));
        }
        return regras;
    }

    static Setor? Destino(RegraCarga r, int i, Dictionary<string, Setor> setores, List<string> erros)
    {
        Setor? setor = null;
        if (r.CoordenacaoDoCurso == (r.Setor is not null)) erros.Add($"regras[{i}]: informe setor ou coordenacaoDoCurso, um dos dois");
        else if (r.Setor is not null && !setores.TryGetValue(r.Setor, out setor)) erros.Add($"regras[{i}].setor: setor \"{r.Setor}\" não existe");
        return setor;
    }

    static List<ArtigoPlanejado> Artigos(List<ArtigoCarga> itens, Dictionary<string, Categoria> categorias, List<string> erros)
    {
        var artigos = new List<ArtigoPlanejado>();
        foreach (var (a, i) in itens.Select((a, i) => (a, i)))
        {
            erros.AddRange(ErrosDoArtigo(a, i));
            if (a.Categoria is null || !categorias.TryGetValue(a.Categoria, out var categoria)) erros.Add($"artigos[{i}].categoria: categoria \"{a.Categoria}\" não existe");
            else artigos.Add(new ArtigoPlanejado(a, categoria));
        }
        return artigos;
    }

    static IEnumerable<string> ErrosDoArtigo(ArtigoCarga a, int i)
    {
        if (string.IsNullOrWhiteSpace(a.Titulo)) yield return $"artigos[{i}].titulo: obrigatório";
        if (a.Perguntas is null || a.Perguntas.Count == 0 || a.Perguntas.Any(string.IsNullOrWhiteSpace)) yield return $"artigos[{i}].perguntas: informe ao menos uma pergunta";
        if (string.IsNullOrWhiteSpace(a.Resposta)) yield return $"artigos[{i}].resposta: obrigatória";
        foreach (var (l, j) in (a.Links ?? []).Select((l, j) => (l, j)))
            if (!l.StartsWith("https://") && !l.StartsWith("http://")) yield return $"artigos[{i}].links[{j}]: deve começar com https:// ou http://";
    }
}
