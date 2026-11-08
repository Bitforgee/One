using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using One.Api.Dados;

namespace One.Api.Tests;

// fluxos-atendimento C1 e C2 (door 4): a migração Fluxos roda em banco descartável, com as regras e os chamados do esquema anterior.
public class FluxoMigracaoTests
{
    const string Servidor = "Host=localhost;Port=5432;Username=postgres;Password=postgres";
    const string AntesDosFluxos = "20261104192340_ImagemRemovida";

    // Duas instituições com seus setores e categorias, três regras (SETOR no setor 2, COORDENACAO_CURSO e SETOR no setor 4) e um chamado antigo;
    // o chamado entra com as chaves estrangeiras desligadas (a migração só olha as colunas novas).
    const string Linhas = """
        INSERT INTO instituicao (slug, nome, fuso, ativa, criada_em) VALUES ('a', 'A', 'America/Cuiaba', true, now()), ('b', 'B', 'America/Cuiaba', true, now());
        INSERT INTO setor (instituicao_id, nome, triagem, ativo) VALUES (1, 'Triagem', true, true), (1, 'Financeiro', false, true), (2, 'Triagem', true, true), (2, 'Financeiro', false, true);
        INSERT INTO categoria (instituicao_id, nome, ativa, padrao) VALUES (1, 'Boleto', true, false), (1, 'Notas', true, false), (2, 'Boleto', true, false);
        INSERT INTO regra_roteamento (instituicao_id, categoria_id, destino, setor_id) VALUES (1, 1, 'SETOR', 2), (1, 2, 'COORDENACAO_CURSO', NULL), (2, 3, 'SETOR', 4);
        SET session_replication_role = replica;
        INSERT INTO chamado (instituicao_id, numero, conversa_id, setor_id) VALUES (1, 'ONE-1', 1, 2);
        """;

    static async Task Executar(string cs, string sql)
    {
        await using var con = new NpgsqlConnection(cs);
        await con.OpenAsync();
        await using var cmd = new NpgsqlCommand(sql, con);
        await cmd.ExecuteNonQueryAsync();
    }

    static async Task<List<string>> Consultar(string cs, string sql)
    {
        await using var con = new NpgsqlConnection(cs);
        await con.OpenAsync();
        await using var r = await new NpgsqlCommand(sql, con).ExecuteReaderAsync();
        var lista = new List<string>();
        while (await r.ReadAsync()) lista.Add(r.GetValue(0)?.ToString() ?? "");
        return lista;
    }

    static async Task Com(Func<string, Task> prova)
    {
        var banco = "one_mig_" + Guid.NewGuid().ToString("N")[..12];
        var cs = $"{Servidor};Database={banco}";
        await Executar(Servidor, $"CREATE DATABASE {banco}");
        try
        {
            async Task Migrar(string? alvo)
            {
                var opcoes = new DbContextOptionsBuilder<OneDb>().UseNpgsql(cs, n => n.UseVector()).Options;
                await using var db = new OneDb(opcoes);
                await db.GetService<IMigrator>().MigrateAsync(alvo);
            }
            await Migrar(AntesDosFluxos);
            await Executar(cs, Linhas);
            await Migrar(null);
            await prova(cs);
        }
        finally
        {
            NpgsqlConnection.ClearAllPools();
            await Executar(Servidor, $"DROP DATABASE IF EXISTS {banco} WITH (FORCE)");
        }
    }

    // C1
    [Fact]
    public Task Regra_vira_fluxo_de_todos_os_cursos_com_uma_etapa() => Com(async cs =>
    {
        var fluxos = await Consultar(cs, "SELECT instituicao_id || ',' || categoria_id || ',' || coalesce(curso_id::text, 'nulo') || ',' || coalesce(semestre::text, 'nulo') FROM fluxo ORDER BY 1");
        Assert.Equal(["1,1,nulo,nulo", "1,2,nulo,nulo", "2,3,nulo,nulo"], fluxos);

        var versoes = await Consultar(cs, "SELECT numero || ',' || (publicada_em IS NOT NULL) FROM versao_fluxo");
        Assert.Equal(["1,true", "1,true", "1,true"], versoes);

        var etapas = await Consultar(cs, """
            SELECT f.instituicao_id || ',' || f.categoria_id || ',' || e.ordem || ',' || e.destino || ',' || coalesce(e.setor_id::text, 'nulo') || ',' || coalesce(e.prazo_horas::text, 'nulo')
            FROM etapa_fluxo e JOIN versao_fluxo v ON v.id = e.versao_fluxo_id JOIN fluxo f ON f.id = v.fluxo_id ORDER BY 1
            """);
        Assert.Equal(["1,1,1,SETOR,2,nulo", "1,2,1,COORDENACAO_CURSO,nulo,nulo", "2,3,1,SETOR,4,nulo"], etapas);
    });

    // C2
    [Fact]
    public Task Chamados_antigos_ficam_fora_de_fluxo_e_a_tabela_some() => Com(async cs =>
    {
        var chamado = await Consultar(cs, "SELECT (versao_fluxo_id IS NULL) || ',' || (etapa_ordem IS NULL) || ',' || (etapa_desde IS NULL) FROM chamado");
        Assert.Equal(["true,true,true"], chamado);
        Assert.Equal([""], await Consultar(cs, "SELECT coalesce(to_regclass('public.regra_roteamento')::text, '')"));
    });
}
