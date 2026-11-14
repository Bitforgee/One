namespace One.Api.Chamados.Push;

public sealed record ConfigPush(string ChavePublica, string ChavePrivada, string Assunto)
{
    public bool Ligado => ChavePublica != "" && ChavePrivada != "" && Assunto != "";

    public static ConfigPush Ler(IConfiguration cfg) => new(cfg["Push:ChavePublica"] ?? "", cfg["Push:ChavePrivada"] ?? "", cfg["Push:Assunto"] ?? "");
}
