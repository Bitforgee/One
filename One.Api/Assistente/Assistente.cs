using System.Net.Http.Json;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using One.Api.Conhecimento;
using One.Api.Dados;
using One.Api.Dados.Conversas;

namespace One.Api.Assistente;

public class Assistente(IHttpClientFactory http, IConfiguration cfg, TimeProvider relogio, ILogger<Assistente> log, OneDb db, Embeddings embeddings, Armazenamento armazenamento)
{
    public const string Autor = MensagemConversa.AutorAssistente;

    public async Task<List<Fonte>> Buscar(float[] vetor, long instituicaoId)
    {
        var k = cfg.GetValue("Rag:K", 5);
        var fuso = await db.Instituicoes.Where(i => i.Id == instituicaoId).Select(i => i.Fuso).SingleAsync();
        var hoje = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(relogio.GetUtcNow().UtcDateTime, TimeZoneInfo.FindSystemTimeZoneById(fuso)));
        return await BuscarFontes.Buscar(db, vetor, hoje, k);
    }

    public async Task<MensagemConversa> Responder(Conversa conversa)
    {
        var modelo = cfg["Llm:Modelo"] ?? "gpt-6-luna";
        var inicioBusca = relogio.GetTimestamp();
        List<Fonte> fontes;
        try
        {
            fontes = await Buscar((await embeddings.Gerar([MontarPrompt.Consulta(conversa.Mensagens)]))[0], conversa.InstituicaoId);
        }
        catch (Exception e) when (e is HttpRequestException or OperationCanceledException or JsonException or InvalidOperationException)
        {
            log.LogWarning(e, "Assistente respondeu sem_base por {Motivo} (instituição {InstituicaoId}, conversa {ConversaId})", "busca_indisponivel", conversa.InstituicaoId, conversa.Id);
            return SemBase(modelo);
        }
        log.LogInformation("Busca de fontes: instituicao={InstituicaoId} conversa={ConversaId} trechos={Trechos} distancias={Distancias} duracaoMs={DuracaoMs}",
            conversa.InstituicaoId, conversa.Id, string.Join(",", fontes.Select(f => f.Id)),
            string.Join(",", fontes.Select(f => f.Distancia.ToString("0.####", System.Globalization.CultureInfo.InvariantCulture))),
            (long)relogio.GetElapsedTime(inicioBusca).TotalMilliseconds);

        var anexos = await LerAnexosDaJanela.Ler(db, armazenamento, conversa);
        if (anexos is null)
        {
            log.LogWarning("Assistente respondeu sem_base por {Motivo} (instituição {InstituicaoId}, conversa {ConversaId})", "anexo_indisponivel", conversa.InstituicaoId, conversa.Id);
            return SemBase(modelo);
        }
        var corpo = await MontarPrompt.Montar(db, conversa, modelo, fontes, anexos);
        var inicio = relogio.GetTimestamp();
        var (saida, motivoDoProvedor, uso) = await ChamarProvedor.Chamar(http, relogio, log, corpo);
        var (tipoFinal, motivo, citacoes) = motivoDoProvedor is null ? ConferirResposta.Classificar(saida!, fontes, conversa) : (Tipos.SemBase, motivoDoProvedor, []);

        if (motivo is not null)
            log.LogWarning("Assistente respondeu sem_base por {Motivo} (instituição {InstituicaoId}, conversa {ConversaId})", motivo, conversa.InstituicaoId, conversa.Id);
        log.LogInformation(
            "Chamada ao provedor de IA: instituicao={InstituicaoId} modelo={Modelo} duracaoMs={DuracaoMs} entradaComCache={EntradaComCache} entradaSemCache={EntradaSemCache} saida={TokensSaida} tipoDevolvido={TipoDevolvido} tipoFinal={TipoFinal} artigos={Artigos} anexos={Anexos}",
            conversa.InstituicaoId, modelo, (long)relogio.GetElapsedTime(inicio).TotalMilliseconds, uso.ComCache, uso.SemCache, uso.Saida,
            saida?.Tipo, tipoFinal, ConferirResposta.ArtigosCitados(saida, fontes), anexos.Count);

        return MensagemConversa.DoAssistente(new MensagemConversa.RespostaDoAssistente
        {
            Texto = ConferirResposta.TextoFinal(tipoFinal, saida),
            TipoDevolvido = saida?.Tipo,
            TipoFinal = tipoFinal,
            Modelo = modelo,
            CategoriaIdSugerida = saida?.CategoriaId,
            Resumo = saida?.Resumo,
            CriadaEm = relogio.GetUtcNow().UtcDateTime,
            Citacoes = citacoes,
            TrechosBuscados = fontes.Select(f => f.Id).ToList(),
        });
    }

    MensagemConversa SemBase(string modelo) =>
        MensagemConversa.DoAssistente(new() { Texto = Textos.SemBase, TipoFinal = Tipos.SemBase, Modelo = modelo, CriadaEm = relogio.GetUtcNow().UtcDateTime, TrechosBuscados = [] });
}

