using WebPush;

namespace One.Api.Chamados;

public static class PushComando
{
    public static int Executar(string[] args, TextWriter saida, TextWriter erro)
    {
        if (args is not ["chaves"])
        {
            erro.WriteLine("uso: push chaves");
            return 1;
        }
        var chaves = VapidHelper.GenerateVapidKeys();
        saida.WriteLine($"PUSH_CHAVE_PUBLICA={chaves.PublicKey}");
        saida.WriteLine($"PUSH_CHAVE_PRIVADA={chaves.PrivateKey}");
        return 0;
    }
}
