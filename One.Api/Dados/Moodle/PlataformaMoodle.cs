namespace One.Api.Dados.Moodle;

public class PlataformaMoodle : IDaInstituicao
{
    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public bool Ativa { get; private set; }
    public string Emissor { get; private set; } = "";
    public string ClientId { get; private set; } = "";
    public string DeploymentId { get; private set; } = "";
    public string AuthUrl { get; private set; } = "";
    public string JwksUrl { get; private set; } = "";

    public void Configurar(bool ativa, string emissor, string clientId, string deploymentId, string authUrl, string jwksUrl) =>
        (Ativa, Emissor, ClientId, DeploymentId, AuthUrl, JwksUrl) = (ativa, emissor, clientId, deploymentId, authUrl, jwksUrl);

    public bool Reconhece(string? emissor, string? clientId) => Ativa && emissor == Emissor && clientId == ClientId;
}
