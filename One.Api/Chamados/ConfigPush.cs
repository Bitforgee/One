namespace One.Api.Chamados;

// As três chaves do push, lidas só aqui; sem as três o push fica desligado (404 nas rotas, nenhuma PushSaida).
public sealed record ConfigPush(string ChavePublica, string ChavePrivada, string Assunto)
{
    public bool Ligado => ChavePublica != "" && ChavePrivada != "" && Assunto != "";

    public static ConfigPush Ler(IConfiguration cfg) => new(cfg["Push:ChavePublica"] ?? "", cfg["Push:ChavePrivada"] ?? "", cfg["Push:Assunto"] ?? "");
}
