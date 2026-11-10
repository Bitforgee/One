using One.Api.Acesso;
using One.Api.Dados;

namespace One.Api.Administracao;

public record MoodleDados(bool Configurada, bool Ativa, string Emissor, string ClientId, string DeploymentId, string AuthUrl, string JwksUrl,
    string UrlLogin, string UrlLancamento, string UrlJwks)
{
    public static MoodleDados De(PlataformaMoodle? p, IConfiguration cfg, string slug)
    {
        var (login, lancamento, jwks) = (MoodleLti.Url(cfg, slug, "login"), MoodleLti.Url(cfg, slug, "lancamento"), MoodleLti.Url(cfg, slug, "jwks"));
        return p is null
            ? new(false, false, "", "", "", "", "", login, lancamento, jwks)
            : new(true, p.Ativa, p.Emissor, p.ClientId, p.DeploymentId, p.AuthUrl, p.JwksUrl, login, lancamento, jwks);
    }
}
