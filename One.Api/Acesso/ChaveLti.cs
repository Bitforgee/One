using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;

namespace One.Api.Acesso;

public sealed class ChaveLti
{
    public string Kid { get; }
    public string Modulo { get; }
    public string Expoente { get; }

    public ChaveLti(IConfiguration cfg)
    {
        using var rsa = RSA.Create();
        if (cfg["Moodle:ChavePrivada"] is { Length: > 0 } pem) rsa.ImportFromPem(pem);
        else rsa.KeySize = 2048;
        var p = rsa.ExportParameters(false);
        (Modulo, Expoente) = (WebEncoders.Base64UrlEncode(p.Modulus!), WebEncoders.Base64UrlEncode(p.Exponent!));
        Kid = WebEncoders.Base64UrlEncode(SHA256.HashData([.. p.Modulus!, .. p.Exponent!]))[..16];
    }
}
