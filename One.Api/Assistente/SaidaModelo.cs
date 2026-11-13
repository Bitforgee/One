namespace One.Api.Assistente;

public record SaidaModelo(string? Tipo, string? Texto, List<long>? FonteIds, List<Trecho>? Trechos, long? CategoriaId, string? Resumo);
