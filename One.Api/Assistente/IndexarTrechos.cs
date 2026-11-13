using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Dados.Trechos;
using Pgvector;

namespace One.Api.Assistente;

public sealed class IndexarTrechos(Embeddings embeddings, ILogger<Agendador> log) : ITarefaAgendada
{
    record Pendente(long Id, string Texto, long InstituicaoId, int Tentativas);

    public string Tipo => "trecho";

    public int Lote => Embeddings.Lote;

    public Task<List<ItemAgendado>> Ler(OneDb db, DateTime agora) =>
        db.TrechosFonte.IgnoreQueryFilters().Where(TrechoFonte.SemEmbedding).Where(t => t.Tentativas < Agendador.MaxTentativas && t.ProximaTentativa <= agora)
            .OrderBy(t => t.Id).Select(t => new ItemAgendado("trecho", t.Id, t.InstituicaoId)).ToListAsync();

    public async Task Executar(OneDb db, IReadOnlyList<ItemAgendado> itens, DateTime agora, CancellationToken parar)
    {
        var ids = itens.Select(i => i.Id).ToList();
        var trechos = await db.TrechosFonte.IgnoreQueryFilters().Where(t => ids.Contains(t.Id)).Where(TrechoFonte.SemEmbedding).OrderBy(t => t.Id)
            .Select(t => new Pendente(t.Id, t.Texto, t.InstituicaoId, t.Tentativas)).ToListAsync();
        if (trechos.Count == 0) return;
        try
        {
            var vetores = await embeddings.Gerar(trechos.Select(t => t.Texto).ToList());
            for (var i = 0; i < trechos.Count; i++)
            {
                var (id, vetor) = (trechos[i].Id, new Vector(vetores[i]));
                await db.TrechosFonte.IgnoreQueryFilters().Where(t => t.Id == id).Where(TrechoFonte.SemEmbedding)
                    .ExecuteUpdateAsync(s => s.SetProperty(t => t.Embedding, vetor));
            }
            log.LogInformation("Agendador indexou {Quantidade} trechos de fonte", trechos.Count);
        }
        catch (Exception falha)
        {
            foreach (var t in trechos)
            {
                var tentativas = t.Tentativas + 1;
                await db.TrechosFonte.IgnoreQueryFilters().Where(x => x.Id == t.Id).Where(TrechoFonte.SemEmbedding)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.Tentativas, tentativas).SetProperty(x => x.ProximaTentativa, agora.AddMinutes(Math.Pow(2, tentativas))));
            }
            foreach (var instituicao in trechos.GroupBy(t => t.InstituicaoId))
                log.LogWarning(falha, "Falha ao gerar embeddings de {Quantidade} trechos da instituição {InstituicaoId}, tentativa {Tentativas}",
                    instituicao.Count(), instituicao.Key, instituicao.Max(t => t.Tentativas) + 1);
        }
    }
}
