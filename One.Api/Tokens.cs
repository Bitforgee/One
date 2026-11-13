using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.WebUtilities;
using One.Api.Dados;

namespace One.Api;

public static class Tokens
{
    public static readonly TimeSpan Validade = TimeSpan.FromMinutes(60);

    public static (string token, TokenAcesso registro) Novo(string slug, long usuarioId, DateTime agora)
    {
        var token = slug + "." + WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        return (token, TokenAcesso.Criar(usuarioId, Hash(token), agora, Validade));
    }

    public static string Hash(string token) => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    static readonly Regex FormatoMcp = new(@"^onemcp_(?<slug>[^.\s]{1,30})\.[A-Za-z0-9_-]{43}$", RegexOptions.Compiled);

    public static string NovoMcp(string slug) => $"onemcp_{slug}.{WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32))}";

    public static string? SlugDoMcp(string? token) => token is not null && FormatoMcp.Match(token) is { Success: true } m ? m.Groups["slug"].Value : null;

    public static string UrlBase(IConfiguration cfg) => (cfg["App:UrlBase"] ?? "http://localhost:8080").TrimEnd('/');

    public static string Link(IConfiguration cfg, string slug, string token) => $"{UrlBase(cfg)}/{slug}/definir-senha?token={token}";
}
