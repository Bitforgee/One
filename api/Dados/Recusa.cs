namespace One.Api.Dados;

// door 4: motivo de um 409 que a própria entidade decide; o handler o traduz em Problemas.Erro(409, Motivo).
public sealed record Recusa(string Motivo);
