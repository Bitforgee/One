using System.Text.Json;
using One.Api.Chamados;
using One.Api.Dados;

namespace One.Api.Assistente;

public static class EnvioDeMensagem
{
    public const int LimiteAnexos = 3;

    public static readonly Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute LimiteDoCorpo = new(LimiteAnexos * AnexoDeFormulario.MaxAnexo + 1024 * 1024);

    record CorpoJson(string? Mensagem);

    public static async ValueTask<(string? Mensagem, IReadOnlyList<IFormFile> Anexos)?> LerEntrada(HttpContext ctx)
    {
        var req = ctx.Request;
        if (req.HasFormContentType)
        {
            var form = await req.ReadFormAsync();
            return (form["mensagem"].FirstOrDefault(), form.Files.GetFiles("anexos"));
        }
        if (!req.HasJsonContentType()) return null;
        try { return ((await req.ReadFromJsonAsync<CorpoJson>())?.Mensagem, []); }
        catch (JsonException) { return null; }
    }

    public static IResult? ValidarMensagem(string? m) =>
        string.IsNullOrWhiteSpace(m) || m.Length > 1000
            ? Problemas.Invalido("A mensagem deve ter de 1 a 1000 caracteres.", "mensagem")
            : null;

    public static async Task<(List<Arquivos.Lido>, IResult?)> LerAnexos(IReadOnlyList<IFormFile> arquivos, int jaGravados)
    {
        if (jaGravados + arquivos.Count > LimiteAnexos) return ([], Problemas.Invalido("A conversa aceita até 3 anexos.", "anexos"));
        var lidos = new List<Arquivos.Lido>();
        foreach (var f in arquivos)
        {
            var (lido, recusa) = await AnexoDeFormulario.Ler(f);
            if (recusa is not null) return ([], recusa);
            lidos.Add(lido!);
        }
        return (lidos, null);
    }

    public static async Task<MensagemConversa> Responder(OneDb db, Assistente assistente, Armazenamento armazenamento, Conversa conversa, long instituicaoId,
        string mensagem, List<Arquivos.Lido> lidos, DateTime agora)
    {
        var anexos = new List<AnexoConversa>();
        foreach (var l in lidos)
        {
            var (chave, hash) = await armazenamento.Gravar(instituicaoId, "anexos-conversa", l.Bytes);
            anexos.Add(AnexoConversa.Criar(l.Nome, l.Tipo, l.Bytes.Length, chave, hash));
        }
        conversa.ReceberDoAluno(mensagem, anexos, agora);
        await db.SaveChangesAsync();
        var resposta = await assistente.Responder(conversa);
        conversa.Registrar(resposta);
        await db.SaveChangesAsync();
        return resposta;
    }
}
