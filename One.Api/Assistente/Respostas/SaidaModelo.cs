using One.Api.Assistente.Busca;

namespace One.Api.Assistente.Respostas;

public record SaidaModelo(string? Tipo, string? Texto, List<long>? FonteIds, List<Trecho>? Trechos, long? CategoriaId, string? Resumo);
