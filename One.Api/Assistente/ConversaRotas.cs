using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Chamados;
using One.Api.Conhecimento;
using One.Api.Dados;

namespace One.Api.Assistente;

public static class ConversaRotas
{
    public const string Aluno = "ALUNO";
    public const int LimiteAnexos = 3;
    const long MaxAnexo = 10 * 1024 * 1024;

    // 3 arquivos de 10 MiB mais o multipart: o Kestrel recusa mais de 30.000.000 bytes se a rota não declarar o limite.
    public static readonly Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute LimiteDoCorpo = new(LimiteAnexos * MaxAnexo + 1024 * 1024);

    record CorpoJson(string? Mensagem);

    // O corpo das rotas de mensagem: JSON { "mensagem" } como sempre, ou multipart com "mensagem" e "anexos". null vira 400 (ThrowOnBadRequest é false).
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

    public static IResult NaoEncontrada() => Problemas.Erro(404, "Conversa não encontrada.");
    public static IResult JaEncerrada() => Problemas.Erro(409, "Esta conversa já foi encerrada.");

    public static Task<Conversa?> DoAluno(OneDb db, Usuario aluno, long id) =>
        db.Conversas.Include(c => c.Mensagens).ThenInclude(m => m.Citacoes).Include(c => c.Mensagens).ThenInclude(m => m.Anexos)
            .FirstOrDefaultAsync(c => c.Id == id && c.AlunoId == aluno.Id);

    public static async Task<bool> PodeUsarAssistente(OneDb db, Usuario u) =>
        u.Tem(Papeis.Aluno) && await db.Matriculas.AnyAsync(m => m.UsuarioId == u.Id && m.Situacao == "ATIVA");

    public static async Task<IResult> Transferido<TResposta>(OneDb db, Chamado chamado, Func<string, string, string, TResposta> resposta) =>
        Results.Created($"/api/chamados/{chamado.Numero}",
            resposta(chamado.Numero, chamado.Estado, await db.Setores.Where(s => s.Id == chamado.SetorId).Select(s => s.Nome).SingleAsync()));

    public static async Task<(List<Arquivos.Lido>, IResult?)> LerAnexos(IReadOnlyList<IFormFile> arquivos, int jaGravados)
    {
        if (jaGravados + arquivos.Count > LimiteAnexos) return ([], Problemas.Invalido("A conversa aceita até 3 anexos.", "anexos"));
        var lidos = new List<Arquivos.Lido>();
        foreach (var f in arquivos)
        {
            var (lido, recusa) = await ResponderChamado.LerAnexo(f);
            if (recusa is not null) return ([], recusa);
            lidos.Add(lido!);
        }
        return (lidos, null);
    }

    // Os objetos são gravados antes da mensagem: com o MinIO fora, nada é salvo (503). Quem chama já fez todas as recusas.
    public static async Task<MensagemConversa> Responder(OneDb db, Assistente assistente, Armazenamento armazenamento, Conversa conversa, long instituicaoId,
        string mensagem, List<Arquivos.Lido> lidos, DateTime agora)
    {
        var anexos = new List<AnexoConversa>();
        foreach (var l in lidos)
        {
            var (chave, hash) = await armazenamento.Gravar(instituicaoId, "anexos-conversa", l.Bytes);
            anexos.Add(new AnexoConversa { Nome = l.Nome, Tipo = l.Tipo, Tamanho = l.Bytes.Length, Chave = chave, Hash = hash });
        }
        conversa.Mensagens.Add(new MensagemConversa { Autor = Aluno, Texto = mensagem, CriadaEm = agora, Anexos = anexos });
        conversa.UltimaMensagemEm = agora;
        await db.SaveChangesAsync();
        var resposta = await assistente.Responder(conversa);
        conversa.Mensagens.Add(resposta);
        await db.SaveChangesAsync();
        return resposta;
    }

    public static void Mapear(RouteGroupBuilder api)
    {
        NovaConversa.Mapear(api);
        NovaMensagem.Mapear(api);
        VerConversa.Mapear(api);
        BaixarAnexoConversa.Mapear(api);
        AvaliarConversa.Mapear(api);
        TransferirConversa.Mapear(api);
        AtendimentoDireto.Mapear(api);
        EncerrarConversa.Mapear(api);
    }
}
