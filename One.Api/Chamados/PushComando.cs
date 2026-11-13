using System.Security.Cryptography;

namespace One.Api.Chamados;

public static class PushComando
{
    public static int Rodar(string[] args) => Executar(args, Console.Out, Console.Error);

    public static int Executar(string[] args, TextWriter saida, TextWriter erro)
    {
        if (args is not ["chaves"])
        {
            erro.WriteLine("uso: push chaves");
            return 1;
        }
        var chaves = ParVapid.Gerar();
        saida.WriteLine($"PUSH_CHAVE_PUBLICA={chaves.PublicKey}");
        saida.WriteLine($"PUSH_CHAVE_PRIVADA={chaves.PrivateKey}");
        return 0;
    }
}

public sealed record ParVapid(string PublicKey, string PrivateKey)
{
    public static ParVapid Gerar()
    {
        using var ec = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var p = ec.ExportParameters(true);
        return new(Url([0x04, .. p.Q.X!, .. p.Q.Y!]), Url(p.D!));
    }

    static string Url(byte[] b) => Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
