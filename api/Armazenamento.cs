using System.Security.Cryptography;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;

namespace One.Api;

// O único código que fala com o MinIO (API S3). Nunca apaga objeto: o bucket é versionado e as chaves são novas a cada gravação.
public sealed class ArmazenamentoIndisponivel(Exception causa) : Exception("Armazenamento de arquivos indisponível.", causa);

public class Armazenamento(IAmazonS3 s3, string bucket)
{
    readonly HttpClient http = new();
    string Bucket => bucket;

    public async Task Preparar()
    {
        try
        {
            if (!await Amazon.S3.Util.AmazonS3Util.DoesS3BucketExistV2Async(s3, Bucket))
                await s3.PutBucketAsync(Bucket);
            await s3.PutBucketVersioningAsync(new PutBucketVersioningRequest { BucketName = Bucket, VersioningConfig = new S3BucketVersioningConfig { Status = VersionStatus.Enabled } });
        }
        catch (Exception e) when (e is AmazonServiceException or HttpRequestException)
        {
            throw new InvalidOperationException($"Armazenamento indisponível em {s3.Config.ServiceURL} (bucket {Bucket}).", e);
        }
    }

    public async Task<(string Chave, string Hash)> Gravar(long instituicaoId, string tipo, byte[] bytes)
    {
        var chave = $"{instituicaoId}/{tipo}/{Guid.NewGuid():N}";
        using var corpo = new MemoryStream(bytes);
        try { await s3.PutObjectAsync(new PutObjectRequest { BucketName = Bucket, Key = chave, InputStream = corpo }); }
        catch (Exception e) when (e is AmazonClientException or HttpRequestException) { throw new ArmazenamentoIndisponivel(e); }
        return (chave, Convert.ToHexStringLower(SHA256.HashData(bytes)));
    }

    // O ResponseStream do SDK passa por um MD5Stream que aloca ~1,4 vezes o tamanho do objeto (medido: 14,5 MB para 10 MiB). A URL
    // assinada é só interna: a API a abre com HttpClient e repassa o fluxo, e o navegador nunca vê a URL.
    public async Task<Stream> Baixar(string chave)
    {
        var url = s3.GetPreSignedURL(new GetPreSignedUrlRequest
        {
            BucketName = Bucket,
            Key = chave,
            Expires = TimeProvider.System.GetUtcNow().UtcDateTime.AddMinutes(1), // relógio real: o MinIO confere a assinatura com o dele
            Protocol = new Uri(s3.Config.ServiceURL).Scheme == "https" ? Protocol.HTTPS : Protocol.HTTP,
        });
        try
        {
            var resposta = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
            resposta.EnsureSuccessStatusCode(); // objeto ausente: 404 do MinIO vira 503, nunca 200 vazio
            return await resposta.Content.ReadAsStreamAsync();
        }
        catch (HttpRequestException e) { throw new ArmazenamentoIndisponivel(e); }
    }

    // Results.Stream não deduz o tamanho de um fluxo que não anda para trás: o Content-Length vem da linha do banco.
    public static IResult ComTamanho(IResult resultado, long tamanho) => new ResultadoComTamanho(resultado, tamanho);

    sealed class ResultadoComTamanho(IResult resultado, long tamanho) : IResult
    {
        public Task ExecuteAsync(HttpContext ctx)
        {
            ctx.Response.ContentLength = tamanho;
            return resultado.ExecuteAsync(ctx);
        }
    }
}
