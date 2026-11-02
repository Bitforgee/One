using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using One.Api.Dados;

namespace One.Api;

public static class Tokens
{
    public static readonly TimeSpan Validade = TimeSpan.FromMinutes(60);

    // O slug vai na frente para achar a instituição sem sair do filtro global; o segredo são os 32 bytes.
    public static (string token, TokenAcesso registro) Novo(string slug, long usuarioId, DateTime agora)
    {
        var token = slug + "." + WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        return (token, new TokenAcesso { UsuarioId = usuarioId, Hash = Hash(token), CriadoEm = agora, ExpiraEm = agora + Validade });
    }

    public static string Hash(string token) => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public static string Link(IConfiguration cfg, string slug, string token) =>
        $"{(cfg["App:UrlBase"] ?? "http://localhost:8080").TrimEnd('/')}/{slug}/definir-senha?token={token}";
}
