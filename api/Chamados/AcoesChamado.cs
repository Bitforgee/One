using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Chamados;

public record ResolverIn(string? Texto);
public record RejeitarIn(string? Motivo);
public record CancelarIn(string? Motivo);
public record EncaminharIn(long? SetorId, string? Motivo);
public record ReclassificarIn(long? CategoriaId);
public record DuplicadoIn(string? NumeroOriginal);

// As ações sobre o chamado passam todas pelo AgirNoChamado; aqui ficam as rotas e as transições que mais de uma ação usa.
public static class AcoesChamado
{
    public static void Mapear(RouteGroupBuilder api)
    {
        ResponderChamado.Mapear(api);
        AssumirChamado.Mapear(api);
        ResolverChamado.Mapear(api);
        ConfirmarChamado.Mapear(api);
        RejeitarChamado.Mapear(api);
        CancelarChamado.Mapear(api);
        EncaminharChamado.Mapear(api);
        ReclassificarChamado.Mapear(api);
        // AC 148 e 149: só outro chamado do mesmo aluno; o duplicado sai dos indicadores
        MarcarDuplicado.Mapear(api);
    }

    public static IResult? Texto(string? texto, string campo, string mensagem) =>
        string.IsNullOrWhiteSpace(texto) || texto.Length > 4000 ? Problemas.Invalido(mensagem, campo) : null;

    public static void Evento(OneDb db, AcessoChamado a, string tipo, string? de = null, string? para = null, string? detalhe = null) =>
        db.EventosChamado.Add(new EventoChamado { ChamadoId = a.Chamado.Id, Tipo = tipo, AtorId = a.Usuario.Id, De = de, Para = para, Detalhe = detalhe, CriadoEm = a.Agora });

    public static void Mudar(OneDb db, AcessoChamado a, string estado)
    {
        if (a.Chamado.Estado == estado) return;
        Evento(db, a, TiposEvento.Transicao, a.Chamado.Estado, estado);
        a.Chamado.Estado = estado;
        a.Chamado.AguardandoDesde = estado == AguardandoAluno ? a.Agora : null;
        a.Chamado.LembreteEm = null;
    }

    public static void Fechar(OneDb db, AcessoChamado a, string motivo, string? justificativa)
    {
        Evento(db, a, TiposEvento.Transicao, a.Chamado.Estado, Fechado, justificativa);
        a.Chamado.Estado = Fechado;
        a.Chamado.MotivoFechamento = motivo;
        a.Chamado.FechadoEm = a.Agora;
        a.Chamado.AguardandoDesde = null;
    }

    public static async Task Atribuir(OneDb db, AcessoChamado a, long? responsavelId)
    {
        if (a.Chamado.ResponsavelId == responsavelId) return;
        var nomes = await db.Usuarios.Where(u => u.Id == a.Chamado.ResponsavelId || u.Id == responsavelId).ToDictionaryAsync(u => u.Id, u => u.Nome);
        Evento(db, a, TiposEvento.Atribuicao, a.Chamado.ResponsavelId is { } de ? nomes[de] : null, responsavelId is { } para ? nomes[para] : null);
        a.Chamado.ResponsavelId = responsavelId;
    }

    public static MensagemChamado Mensagem(OneDb db, AcessoChamado a, string tipo, string texto)
    {
        var m = new MensagemChamado { ChamadoId = a.Chamado.Id, AutorId = a.Usuario.Id, Tipo = tipo, Texto = texto, CriadaEm = a.Agora };
        db.MensagensChamado.Add(m);
        Evento(db, a, tipo == TiposMensagem.Nota ? TiposEvento.Nota : TiposEvento.Resposta);
        return m;
    }

    public static void Anexar(OneDb db, AcessoChamado a, MensagemChamado m, List<Anexo> anexos)
    {
        foreach (var anexo in anexos)
        {
            m.Anexos.Add(anexo);
            Evento(db, a, TiposEvento.Anexo, detalhe: anexo.Nome);
        }
    }

    // AC 122: resposta pública de atendente avisa o aluno por e-mail
    public static async Task RespostaDaEquipe(OneDb db, AcessoChamado a, string texto, List<Anexo>? anexos = null)
    {
        Anexar(db, a, Mensagem(db, a, TiposMensagem.Publica, texto), anexos ?? []);
        await Avisos.NovaResposta(db, a.Cfg, a.Instituicao, a.Chamado, a.Agora);
    }

    // AC 84 a 87: volta ao responsável ativo, ou à fila do setor se ele não existe mais. Results.Empty quando aplicou.
    public static async Task<IResult> RejeitarResolucao(OneDb db, AcessoChamado a, string motivo, List<Anexo>? anexos = null)
    {
        if (a.Agora > a.Chamado.ResolvidoEm!.Value + a.Prazos.Rejeicao)
            return Problemas.Erro(409, $"O prazo de {a.Prazos.RejeicaoDias} dias para rejeitar a resolução terminou.");
        Anexar(db, a, Mensagem(db, a, TiposMensagem.Publica, motivo), anexos ?? []);
        var ativo = a.Chamado.ResponsavelId is { } r && await db.Usuarios.AnyAsync(u => u.Id == r && u.Ativo);
        if (!ativo) await Atribuir(db, a, null);
        Mudar(db, a, ativo ? EmAtendimento : Aberto);
        a.Chamado.Reaberturas++;
        return Results.Empty;
    }
}
