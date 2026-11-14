using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Dados.Conversas;

namespace One.Api.Assistente.Respostas;

public static class LerAnexosDaJanela
{
    record ParaOProvedor(long Id, string Chave, string Tipo);

    public static async Task<Dictionary<long, string>?> Ler(OneDb db, Armazenamento armazenamento, Conversa conversa)
    {
        var mensagens = MontarPrompt.Janela(conversa).Select(m => m.Id).ToList();
        var anexos = await db.AnexosConversa.Where(x => mensagens.Contains(x.MensagemConversaId)).OrderBy(x => x.Id).Select(x => new ParaOProvedor(x.Id, x.Chave, x.Tipo)).ToListAsync();
        var lidos = new Dictionary<long, string>();
        try
        {
            foreach (var a in anexos)
            {
                using var ms = new MemoryStream();
                await using (var fluxo = await armazenamento.Baixar(a.Chave)) await fluxo.CopyToAsync(ms);
                lidos[a.Id] = $"data:{a.Tipo};base64,{Convert.ToBase64String(ms.ToArray())}";
            }
        }
        catch (ArmazenamentoIndisponivel) { return null; }
        return lidos;
    }
}
