namespace One.Api.Mcp;

public sealed record ChamadoNaLista(string Numero, string Titulo, string Estado, DateTime CriadoEm, string? Categoria, string? Responsavel, int? Dias);

public sealed record ListaDeChamados(int Total, IReadOnlyList<ChamadoNaLista> Itens);

public sealed record MensagemDoChamado(string Tipo, string Autor, string Texto, DateTime CriadaEm);

public sealed record EventoDoChamado(string Tipo, string Ator, string? De, string? Para, string? Detalhe, DateTime CriadoEm);

public sealed record ChamadoDetalhado(
    string Numero, string Titulo, string Estado, string Categoria, string Setor, string? Responsavel, string? Solicitante, string Curso, int Semestre,
    DateTime CriadoEm, DateTime? ResolvidoEm, string? Resumo, IReadOnlyList<MensagemDoChamado> Mensagens, IReadOnlyList<EventoDoChamado> Eventos);

public sealed record FonteDeConhecimento(string Tipo, string Titulo, string Texto, IReadOnlyList<string> Links);

public sealed record ResultadoDaBusca(IReadOnlyList<FonteDeConhecimento> Fontes);
