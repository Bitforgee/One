using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace One.Api.Dados.Mcp;

public class TokenMcp : IDaInstituicao
{
    public static class Estados
    {
        public const string Ativo = "ATIVO";
        public const string Expirado = "EXPIRADO";
        public const string Revogado = "REVOGADO";
    }

    public const int MaximoAtivosPorUsuario = 5;
    public static readonly TimeSpan IntervaloDeUso = TimeSpan.FromMinutes(1);

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long UsuarioId { get; private set; }
    public string Nome { get; private set; } = "";
    public string Hash { get; private set; } = "";
    public string Final { get; private set; } = "";
    public DateTime CriadoEm { get; private set; }
    public DateTime ExpiraEm { get; private set; }
    public DateTime? UltimoUsoEm { get; private set; }
    public DateTime? RevogadoEm { get; private set; }

    static readonly Regex FormatoMcp = new(@"^onemcp_(?<slug>[^.\s]{1,30})\.[A-Za-z0-9_-]{43}$", RegexOptions.Compiled);

    public static string NovoMcp(string slug) => $"onemcp_{slug}.{Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(32))}";

    public static string? SlugDoMcp(string? token) => token is not null && FormatoMcp.Match(token) is { Success: true } m ? m.Groups["slug"].Value : null;

    public static TokenMcp Criar(long usuarioId, string nome, string hash, string final, DateTime agora, int dias) =>
        new() { UsuarioId = usuarioId, Nome = nome, Hash = hash, Final = final, CriadoEm = agora, ExpiraEm = agora.AddDays(dias) };

    public string Estado(DateTime agora) =>
        RevogadoEm is not null ? Estados.Revogado : agora >= ExpiraEm ? Estados.Expirado : Estados.Ativo;

    public void Revogar(DateTime agora) => RevogadoEm ??= agora;

    public bool RegistrarUso(DateTime agora)
    {
        if (UltimoUsoEm is { } ultimo && agora - ultimo < IntervaloDeUso) return false;
        UltimoUsoEm = agora;
        return true;
    }
}
