using One.Api.Dados;
using One.Api.Dados.Fluxos;
using static One.Api.Dados.Fluxos.ResolverFluxo;

namespace One.Api.Tests;

// fluxos-atendimento C15 e C16: a escolha do fluxo e a resolução de cada tipo de destino, sem banco e sem HTTP.
public class FluxoDominioTests
{
    static readonly DateTime Agora = new(2026, 11, 2, 12, 0, 0, DateTimeKind.Utc);
    const long Curso = 5;
    const int Semestre = 3;

    static Fluxo UmFluxo(long? curso, int? semestre, bool publicado)
    {
        var fluxo = Fluxo.Criar(1, curso, semestre);
        fluxo.SalvarRascunho([new EtapaFluxo.Dados(DestinosEtapa.CoordenacaoCurso, null, null, null, null)]);
        if (publicado) Assert.Null(fluxo.Publicar(Agora));
        return fluxo;
    }

    static EtapaFluxo Etapa(string destino, long? setorId = null)
    {
        var fluxo = Fluxo.Criar(1, null, null);
        fluxo.SalvarRascunho([new EtapaFluxo.Dados(destino, setorId, null, null, null)]);
        fluxo.Publicar(Agora);
        return fluxo.Vigente!.Etapas.Single();
    }

    static Setor UmSetor(long id, bool ativo) => new() { Id = id, Nome = $"Setor {id}", Ativo = ativo };

    static Contexto Ctx(long? coordenacao = null, long? lideranca = null) =>
        new(new Dictionary<long, Setor> { [1] = UmSetor(1, true), [2] = UmSetor(2, false), [7] = UmSetor(7, true), [9] = UmSetor(9, true) }, coordenacao, lideranca);

    // C15: os oito casos de existência (com e sem versão publicada) do fluxo de semestre, do de curso e do de todos os cursos
    [Theory]
    [InlineData(false, false, false, "nenhum")]
    [InlineData(false, false, true, "todos")]
    [InlineData(false, true, false, "curso")]
    [InlineData(false, true, true, "curso")]
    [InlineData(true, false, false, "semestre")]
    [InlineData(true, false, true, "semestre")]
    [InlineData(true, true, false, "semestre")]
    [InlineData(true, true, true, "semestre")]
    public void Escolhe_o_fluxo_mais_especifico(bool semestrePublicado, bool cursoPublicado, bool todosPublicado, string esperado)
    {
        var porNome = new Dictionary<string, Fluxo>
        {
            ["semestre"] = UmFluxo(Curso, Semestre, semestrePublicado),
            ["curso"] = UmFluxo(Curso, null, cursoPublicado),
            ["todos"] = UmFluxo(null, null, todosPublicado),
        };

        var escolhido = Escolher(porNome.Values.Reverse(), Curso, Semestre);

        Assert.Same(esperado == "nenhum" ? null : porNome[esperado], escolhido);
    }

    [Fact]
    public void Fluxo_de_outro_semestre_ou_curso_nao_vale()
    {
        var outroSemestre = UmFluxo(Curso, 4, true);
        var outroCurso = UmFluxo(6, null, true);
        var todos = UmFluxo(null, null, true);

        Assert.Same(todos, Escolher([outroSemestre, outroCurso, todos], Curso, Semestre));
        Assert.Null(Escolher([outroSemestre, outroCurso], Curso, Semestre));
    }

    // C16: os três tipos de destino contra setor ativo ou inativo, curso com ou sem coordenação, liderança disponível ou não
    [Theory]
    [InlineData(DestinosEtapa.Setor, 1L, null, null, 1L, null)]
    [InlineData(DestinosEtapa.Setor, 2L, null, null, null, SetorInativo)]
    [InlineData(DestinosEtapa.Setor, 99L, null, null, null, SetorInativo)]
    [InlineData(DestinosEtapa.Setor, 1L, 7L, 9L, 1L, null)]
    [InlineData(DestinosEtapa.CoordenacaoCurso, null, 7L, null, 7L, null)]
    [InlineData(DestinosEtapa.CoordenacaoCurso, null, null, 9L, null, SemCoordenacao)]
    [InlineData(DestinosEtapa.LiderancaSemestre, null, null, 9L, 9L, null)]
    [InlineData(DestinosEtapa.LiderancaSemestre, null, 7L, null, null, SemLideranca)]
    public void Resolve_cada_tipo_de_destino(string destino, long? setorDaEtapa, long? coordenacao, long? lideranca, long? setor, string? motivo)
    {
        var r = Etapa(destino, setorDaEtapa);

        var resolucao = ResolverFluxo.Etapa(r, Ctx(coordenacao, lideranca));

        Assert.Equal((setor, motivo), (resolucao.SetorId, resolucao.Motivo));
        Assert.Equal(setor is not null, resolucao.Resolvida);
    }

    [Fact]
    public void Lideranca_sem_aceite_nao_resolve_e_o_proximo_passo_a_pula()
    {
        var fluxo = Fluxo.Criar(1, Curso, Semestre);
        fluxo.SalvarRascunho([new(DestinosEtapa.LiderancaSemestre, null, null, null, null), new(DestinosEtapa.CoordenacaoCurso, null, null, null, null)]);
        fluxo.Publicar(Agora);
        var etapas = fluxo.Vigente!.Etapas;
        var contexto = Ctx(coordenacao: 7, lideranca: 9);

        Assert.Equal(SemAceite, Situacao(etapas[0], contexto, aceitaLideranca: false).Motivo);
        Assert.Equal(9, Proximo(etapas, 0, contexto, aceitaLideranca: true)!.SetorId);
        var pulou = Proximo(etapas, 0, contexto, aceitaLideranca: false)!;
        Assert.Equal((7L, 2), (pulou.SetorId, pulou.Etapa.Ordem));
    }

    [Fact]
    public void Proximo_pula_a_etapa_que_nao_resolve_e_acaba_sem_resolver()
    {
        var fluxo = Fluxo.Criar(1, null, null);
        fluxo.SalvarRascunho([new(DestinosEtapa.CoordenacaoCurso, null, null, null, null), new(DestinosEtapa.Setor, 2, null, null, null), new(DestinosEtapa.Setor, 1, null, null, null)]);
        fluxo.Publicar(Agora);
        var etapas = fluxo.Vigente!.Etapas;

        Assert.Equal(3, Proximo(etapas, 0, Ctx(coordenacao: null), false)!.Etapa.Ordem);
        Assert.Equal(1, Proximo(etapas, 0, Ctx(coordenacao: 7), false)!.Etapa.Ordem);
        Assert.Null(Proximo(etapas, 3, Ctx(coordenacao: 7), false));
    }

    [Fact]
    public void Versao_publicada_numera_e_o_rascunho_descartado_some()
    {
        var fluxo = UmFluxo(null, null, true);
        Assert.Equal(1, fluxo.Vigente!.Numero);
        Assert.Null(fluxo.Rascunho);

        fluxo.SalvarRascunho([new(DestinosEtapa.Setor, 1, null, null, null), new(DestinosEtapa.CoordenacaoCurso, null, null, null, null)]);
        Assert.Equal(2, fluxo.Rascunho!.Numero);
        Assert.Equal(1, fluxo.Vigente!.Numero);
        Assert.Single(fluxo.Vigente.Etapas);

        Assert.Null(fluxo.DescartarRascunho());
        Assert.Null(fluxo.Rascunho);
        Assert.NotNull(fluxo.DescartarRascunho());
        Assert.NotNull(fluxo.Publicar(Agora));
        Assert.Equal(1, fluxo.Vigente!.Numero);
    }

    // C98 (door 3): o que cada tipo enxerga e se pede aceite vem do tipo, sem coluna nem entrada
    [Theory]
    [InlineData(DestinosEtapa.Setor, true, false)]
    [InlineData(DestinosEtapa.CoordenacaoCurso, true, false)]
    [InlineData(DestinosEtapa.LiderancaSemestre, false, true)]
    public void Visao_e_aceite_vem_do_tipo(string destino, bool veTudo, bool pedeAceite)
    {
        Assert.Equal(veTudo, DestinosEtapa.VeTudo(destino));
        Assert.Equal(pedeAceite, DestinosEtapa.ExigeAceite(destino));

        // o aceite decide na resolução: só a liderança some sem ele, e as outras resolvem como sempre
        var etapa = Etapa(destino, destino == DestinosEtapa.Setor ? 1 : null);
        var resolucao = Situacao(etapa, Ctx(coordenacao: 7, lideranca: 9), aceitaLideranca: false);
        Assert.Equal(!pedeAceite, resolucao.Resolvida);
        Assert.Equal(pedeAceite ? SemAceite : null, resolucao.Motivo);
        Assert.True(Situacao(etapa, Ctx(coordenacao: 7, lideranca: 9), aceitaLideranca: true).Resolvida);
    }

    [Fact]
    public void Todo_tipo_de_destino_tem_visao_definida()
    {
        Assert.Equal(3, DestinosEtapa.Todos.Length);
        Assert.Single(DestinosEtapa.Todos, d => DestinosEtapa.ExigeAceite(d));
        Assert.Single(DestinosEtapa.Todos, d => !DestinosEtapa.VeTudo(d));
    }
}
