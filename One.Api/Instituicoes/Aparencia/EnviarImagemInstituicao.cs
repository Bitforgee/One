using System.Buffers.Binary;
using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Instituicoes.Aparencia;

public sealed record EnviarImagemInstituicao(string Tipo, IFormCollection Form) : IRequest<IResult>
{
    public sealed record Resposta(string Tipo, int Versao);

    public const string IconeInvalido = "O ícone deve ser um PNG quadrado de pelo menos 512 px.";
    const long UmMb = 1024 * 1024;

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/aparencia/imagens/{tipo}", async (string tipo, HttpRequest req, IMediator m) =>
            await m.Send(new EnviarImagemInstituicao(tipo, req.HasFormContentType ? await req.ReadFormAsync() : FormCollection.Empty)));

    public static long Limite(string tipo) => tipo == TiposDeImagem.Login ? 3 * UmMb : UmMb;

    public static bool IconeAceito(byte[] png)
    {
        if (png.Length < 24) return false;
        var (largura, altura) = (BinaryPrimitives.ReadUInt32BigEndian(png.AsSpan(16)), BinaryPrimitives.ReadUInt32BigEndian(png.AsSpan(20)));
        return largura == altura && largura >= 512;
    }
}

public sealed class EnviarImagemInstituicaoHandler(OneDb db, Armazenamento armazenamento) : IRequestHandler<EnviarImagemInstituicao, IResult>
{
    public async ValueTask<IResult> Handle(EnviarImagemInstituicao m, CancellationToken ct)
    {
        var tipo = m.Tipo;
        if (!TiposDeImagem.Todos.Contains(tipo)) return Problemas.Erro(404, "Tipo de imagem não encontrado.");
        if (m.Form.Files["arquivo"] is not { } arquivo) return Problemas.Invalido("Envie a imagem no campo arquivo.", "arquivo");

        var icone = tipo == TiposDeImagem.Icone;
        var limite = EnviarImagemInstituicao.Limite(tipo);
        var (lido, recusa) = await Arquivos.Ler(arquivo, limite, icone ? [Arquivos.Png] : [Arquivos.Png, Arquivos.Jpeg],
            $"A imagem passa de {limite / 1024 / 1024} MB.", icone ? "O ícone deve ser PNG." : "Envie uma imagem PNG ou JPEG.");
        if (lido is null) return recusa!;
        if (icone && !EnviarImagemInstituicao.IconeAceito(lido.Bytes)) return Problemas.Invalido(EnviarImagemInstituicao.IconeInvalido, "arquivo");

        var chave = Armazenamento.NovaChave(db.InstituicaoAtual!.Value, "aparencia");
        await armazenamento.Gravar(chave, lido.Bytes);
        var imagem = await db.ImagensInstituicao.FirstOrDefaultAsync(x => x.Tipo == tipo, ct);
        if (imagem is null) db.ImagensInstituicao.Add(imagem = ImagemInstituicao.Criar(tipo));
        imagem.Substituir(lido.Tipo, lido.Bytes.Length, Armazenamento.Hash(lido.Bytes), chave);
        await db.SaveChangesAsync(ct);
        return Results.Ok(new EnviarImagemInstituicao.Resposta(tipo, imagem.Versao));
    }
}
