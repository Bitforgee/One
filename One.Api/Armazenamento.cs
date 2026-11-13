using System.Security.Cryptography;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;

namespace One.Api;

public sealed class ArmazenamentoIndisponivel(Exception causa) : Exception("Armazenamento de arquivos indisponível.", causa);

public class Armazenamento(IAmazonS3 s3, string bucket, TimeProvider relogio, HttpMessageHandler? handler = null)
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
            Expires = relogio.GetUtcNow().UtcDateTime.AddMinutes(1),
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
}

public static class ArmazenamentoExtensoes
{
    public static IServiceCollection AddArmazenamento(this IServiceCollection s)
    {
        s.AddSingleton<IAmazonS3>(sp =>
        {
            var c = sp.GetRequiredService<IConfiguration>();
            return new AmazonS3Client(new BasicAWSCredentials(c["Armazenamento:Chave"], c["Armazenamento:Segredo"]), new AmazonS3Config
            {
                ServiceURL = c["Armazenamento:Endpoint"],
                ForcePathStyle = true,
                RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
                ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
            });
        });
        s.AddSingleton(sp => new Armazenamento(sp.GetRequiredService<IAmazonS3>(), sp.GetRequiredService<IConfiguration>()["Armazenamento:Bucket"]!, sp.GetRequiredService<TimeProvider>()));
        return s;
    }
}