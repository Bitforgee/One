using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record SimularFluxo(long Id, SimularFluxo.Entrada Corpo) : IRequest<IResult>
{
    public const string Rascunho = "RASCUNHO";
    public const string Vigente = "VIGENTE";
    public const string Resolvida = "RESOLVIDA";
    public const string NaoResolvida = "NAO_RESOLVIDA";

    public sealed record Entrada(string? Versao, long? CursoId, int? Semestre);

    public sealed record Resposta(IReadOnlyList<Resposta.DaEtapa> Etapas, string Inicial, Resposta.DoFluxo? Escolhido)
    {
        public sealed record DaEtapa(int Ordem, string Destino, string? Setor, string Situacao, string? Motivo);

        public sealed record DoFluxo(long Id, long? CursoId, int? Semestre);
    }

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/fluxos/{id:long}/simular", (long id, SimularFluxo.Entrada i, IMediator m) => m.Send(new SimularFluxo(id, i)));
}

public sealed class SimularFluxoHandler(OneDb db) : IRequestHandler<SimularFluxo, IResult>
{
    public async ValueTask<IResult> Handle(SimularFluxo m, CancellationToken ct)
    {
        var i = m.Corpo;
        var fluxo = await db.Fluxos.Include(f => f.Versoes).ThenInclude(v => v.Etapas).FirstOrDefaultAsync(f => f.Id == m.Id);
        if (fluxo is null) return AdminRotas.NaoEncontrado();
        if (await Validar(i, fluxo) is { } erro) return erro;

        var versao = i.Versao == SimularFluxo.Rascunho ? fluxo.Rascunho! : fluxo.Vigente!;
        var contexto = await ResolverFluxo.CarregarContexto(db, i.CursoId!.Value, i.Semestre);
        var etapas = versao.Etapas.OrderBy(e => e.Ordem).Select(e => Etapa(e, contexto)).ToList();
        var primeira = ResolverFluxo.Proximo(versao.Etapas, 0, contexto, true);
        var escolhido = ResolverFluxo.Escolher(await ResolverFluxo.Candidatos(db, fluxo.CategoriaId, i.CursoId.Value), i.CursoId.Value, i.Semestre!.Value);
        var inicial = primeira?.SetorId ?? contexto.Setores.Values.Single(s => s.Triagem).Id;
        return Results.Ok(new SimularFluxo.Resposta(etapas, contexto.Setores[inicial].Nome,
            escolhido is null ? null : new SimularFluxo.Resposta.DoFluxo(escolhido.Id, escolhido.CursoId, escolhido.Semestre)));
    }

    async Task<IResult?> Validar(SimularFluxo.Entrada i, Fluxo fluxo)
    {
        if (i.Versao is not (SimularFluxo.Rascunho or SimularFluxo.Vigente)) return Problemas.Invalido("A versão deve ser RASCUNHO ou VIGENTE.", "versao");
        if ((i.Versao == SimularFluxo.Rascunho ? fluxo.Rascunho : fluxo.Vigente) is null) return Problemas.Invalido("O fluxo não tem essa versão.", "versao");
        if (i.Semestre is null or < 1 or > 12) return Problemas.Invalido("O semestre deve ficar entre 1 e 12.", "semestre");
        return i.CursoId is null || !await db.Cursos.AnyAsync(c => c.Id == i.CursoId) ? Problemas.Invalido("Escolha um curso da instituição.", "cursoId") : null;
    }

    static SimularFluxo.Resposta.DaEtapa Etapa(EtapaFluxo e, ResolverFluxo.Contexto contexto)
    {
        var r = ResolverFluxo.Situacao(e, contexto, true);
        return new(e.Ordem, e.Destino, r.SetorId is { } id ? contexto.Setores[id].Nome : null, r.Resolvida ? SimularFluxo.Resolvida : SimularFluxo.NaoResolvida, r.Motivo);
    }
}
