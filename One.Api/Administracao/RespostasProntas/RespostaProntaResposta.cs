namespace One.Api.Administracao.RespostasProntas;

public sealed record RespostaProntaResposta(long Id, long SetorId, string Titulo, string Texto)
{
    public static RespostaProntaResposta De(RespostaPronta r) => new(r.Id, r.SetorId, r.Titulo, r.Texto);
}
