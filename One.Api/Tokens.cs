using System.Security.Cryptography;
using System.Text;

namespace One.Api;

public static class Tokens
{
    public static string Hash(string token) => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public static string UrlBase(IConfiguration cfg) => (cfg["App:UrlBase"] ?? "http://localhost:8080").TrimEnd('/');

    public static string Link(IConfiguration cfg, string slug, string token) => $"{UrlBase(cfg)}/{slug}/definir-senha?token={token}";
}