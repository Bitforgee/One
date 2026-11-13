using One.Api.Dados;

namespace One.Api.Tests.Infra;

public static class ImagemTeste
{
    public static byte[] Png(int largura = 64, int altura = 64, int tamanho = 64)
    {
        var b = new byte[Math.Max(tamanho, 33)];
        Random.Shared.NextBytes(b);
        byte[] cabecalho = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, (byte)'I', (byte)'H', (byte)'D', (byte)'R'];
        cabecalho.CopyTo(b, 0);
        System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(b.AsSpan(16), (uint)largura);
        System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(b.AsSpan(20), (uint)altura);
        return b;
    }

    public static ImagemInstituicao Icone(int versao = 2, DateTimeOffset? removidaEm = null)
    {
        var imagem = ImagemInstituicao.Criar("icone");
        for (var n = 0; n < versao; n++) imagem.Substituir("image/png", 1, new string('a', 64), "x/aparencia/y");
        if (removidaEm is { } quando) imagem.Remover(quando);
        return imagem;
    }

    public static byte[] Jpeg(int tamanho = 64) => Balcao.Arquivo(Balcao.Jpg, tamanho);

    public static async Task<HttpResponseMessage> Enviar(HttpClient c, string tipo, byte[] bytes, string nome = "imagem.bin")
    {
        var form = new MultipartFormDataContent { { new ByteArrayContent(bytes), "arquivo", nome } };
        return await c.PostAsync($"/api/admin/aparencia/imagens/{tipo}", form);
    }
}
