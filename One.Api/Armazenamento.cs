using System.Security.Cryptography;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;

namespace One.Api;

public sealed class ArmazenamentoIndisponivel(Exception causa) : Exception("Armazenamento de arquivos indisponível.", causa);

public class Armazenamento(IAmazonS3 s3, string bucket, HttpMessageHandler? handler = null)
{
    readonly HttpClient http = new(handler ?? new HttpClientHandler());
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

    public static string NovaChave(long instituicaoId, string tipo) => $"{instituicaoId}/{tipo}/{Guid.NewGuid():N}";

    public static string Hash(byte[] bytes) => Convert.ToHexStringLower(SHA256.HashData(bytes));

    public async Task<(string Chave, string Hash)> Gravar(long instituicaoId, string tipo, byte[] bytes)
    {
        var chave = NovaChave(instituicaoId, tipo);
        await Gravar(chave, bytes);
        return (chave, Hash(bytes));
    }

    public async Task Gravar(string chave, byte[] bytes)
    {
        using var corpo = new MemoryStream(bytes);
        try { await s3.PutObjectAsync(new PutObjectRequest { BucketName = Bucket, Key = chave, InputStream = corpo }); }
        catch (Exception e) when (e is AmazonServiceException or AmazonClientException or HttpRequestException) { throw new ArmazenamentoIndisponivel(e); }
    }

    public async Task<Stream> Baixar(string chave)
    {
        var url = s3.GetPreSignedURL(new GetPreSignedUrlRequest
        {
            BucketName = Bucket,
            Key = chave,
            Expires = TimeProvider.System.GetUtcNow().UtcDateTime.AddMinutes(1),
            Protocol = new Uri(s3.Config.ServiceURL).Scheme == "https" ? Protocol.HTTPS : Protocol.HTTP,
        });
        try
        {
            var resposta = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
            resposta.EnsureSuccessStatusCode();
            return await resposta.Content.ReadAsStreamAsync();
        }
        catch (HttpRequestException e) { throw new ArmazenamentoIndisponivel(e); }
    }

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
