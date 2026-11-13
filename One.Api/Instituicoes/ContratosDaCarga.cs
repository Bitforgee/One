using One.Api.Dados;

namespace One.Api.Instituicoes;

public record ArquivoCarga(List<SetorCarga>? Setores, List<CursoCarga>? Cursos, List<CategoriaCarga>? Categorias, List<RegraCarga>? Regras, List<ArtigoCarga>? Artigos);
public record SetorCarga(string? Nome);
public record CursoCarga(string? Nome, string? Coordenacao);
public record CategoriaCarga(string? Nome);
public record RegraCarga(string? Categoria, string? Setor, bool CoordenacaoDoCurso);
public record ArtigoCarga(string? Titulo, List<string>? Perguntas, string? Categoria, string? Resposta, List<string>? Links);

public record Existentes(Dictionary<string, Setor> Setores, Dictionary<string, Categoria> Categorias, HashSet<string> Cursos, HashSet<string> CategoriasComRegra);

public record RegraPlanejada(string Destino, Categoria Categoria, Setor? Setor);
public record ArtigoPlanejado(ArtigoCarga Artigo, Categoria Categoria);

public record Plano(Dictionary<string, Setor> Setores, Dictionary<string, Categoria> Categorias, List<Curso> Cursos, List<RegraPlanejada> Regras, List<ArtigoPlanejado> Artigos);
