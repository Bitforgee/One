using Npgsql;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

// fluxos-atendimento C13 e C14 (doors 1 e 2): o banco impõe o modelo, provado por inserções que ele recusa com o nome da regra.
public class FluxoModeloTests(OneFactory f) : IClassFixture<OneFactory>
{
    async Task<NpgsqlConnection> Abrir()
    {
        var con = new NpgsqlConnection(f.ConnectionString);
        await con.OpenAsync();
        return con;
    }

    static async Task<long> Inserir(NpgsqlConnection con, string sql)
    {
        await using var cmd = new NpgsqlCommand(sql + " RETURNING id", con);
        return (long)(await cmd.ExecuteScalarAsync())!;
    }

    // O nome da regra que o banco violou, ou null quando a linha entrou.
    static async Task<string?> Violou(NpgsqlConnection con, string sql)
    {
        try
        {
            await using var cmd = new NpgsqlCommand(sql, con);
            await cmd.ExecuteNonQueryAsync();
            return null;
        }
        catch (PostgresException e)
        {
            return e.ConstraintName;
        }
    }

    // C13
    [Fact]
    public async Task Constraints_e_indices_da_door_1()
    {
        var i = await f.Instituicao();
        var categoria = await f.Categoria(i, "Boleto");
        var curso = await f.Db(i.Id, async db => { var c = new Curso { Nome = "ADS" }; db.Cursos.Add(c); await db.SaveChangesAsync(); return c; });
        await using var con = await Abrir();
        string Fluxo(string cursoId, string semestre) => $"INSERT INTO fluxo (instituicao_id, categoria_id, curso_id, semestre) VALUES ({i.Id}, {categoria.Id}, {cursoId}, {semestre})";

        // UNIQUE NULLS NOT DISTINCT: dois fluxos para todos os cursos da mesma categoria colidem, e curso e semestre distintos não
        var todos = await Inserir(con, Fluxo("NULL", "NULL"));
        Assert.Equal("ux_fluxo_abrangencia", await Violou(con, Fluxo("NULL", "NULL")));
        Assert.Null(await Violou(con, Fluxo($"{curso.Id}", "NULL")));
        Assert.Null(await Violou(con, Fluxo($"{curso.Id}", "3")));
        Assert.Equal("ux_fluxo_abrangencia", await Violou(con, Fluxo($"{curso.Id}", "3")));
        // semestre só com curso, e de 1 a 12
        Assert.Equal("ck_fluxo_semestre_com_curso", await Violou(con, Fluxo("NULL", "3")));
        Assert.Equal("ck_fluxo_semestre", await Violou(con, Fluxo($"{curso.Id}", "13")));
        Assert.Equal("ck_fluxo_semestre", await Violou(con, Fluxo($"{curso.Id}", "0")));
        Assert.Null(await Violou(con, Fluxo($"{curso.Id}", "12")));
        Assert.Null(await Violou(con, Fluxo($"{curso.Id}", "1")));

        // versões: número único por fluxo e no máximo um rascunho
        string Versao(long fluxo, int numero, bool publicada) =>
            $"INSERT INTO versao_fluxo (instituicao_id, fluxo_id, numero, publicada_em) VALUES ({i.Id}, {fluxo}, {numero}, {(publicada ? "now()" : "NULL")})";
        var v1 = await Inserir(con, Versao(todos, 1, true) + "");
        Assert.Equal("ix_versao_fluxo_fluxo_id_numero", await Violou(con, Versao(todos, 1, true)));
        Assert.Null(await Violou(con, Versao(todos, 2, false)));
        Assert.Equal("ux_versao_rascunho", await Violou(con, Versao(todos, 3, false)));
        Assert.Null(await Violou(con, Versao(todos, 3, true)));

        // etapas: ordem única por versão, de 1 a 5, prazo de 1 a 720 e posição inteira
        string Etapa(int ordem, string prazo = "NULL", string x = "NULL", string y = "NULL") =>
            $"INSERT INTO etapa_fluxo (instituicao_id, versao_fluxo_id, ordem, destino, prazo_horas, pos_x, pos_y) VALUES ({i.Id}, {v1}, {ordem}, 'COORDENACAO_CURSO', {prazo}, {x}, {y})";
        Assert.Null(await Violou(con, Etapa(1)));
        Assert.Equal("ix_etapa_fluxo_versao_fluxo_id_ordem", await Violou(con, Etapa(1)));
        Assert.Equal("ck_etapa_fluxo_ordem", await Violou(con, Etapa(0)));
        Assert.Equal("ck_etapa_fluxo_ordem", await Violou(con, Etapa(6)));
        Assert.Null(await Violou(con, Etapa(5)));
        Assert.Equal("ck_etapa_fluxo_prazo", await Violou(con, Etapa(2, prazo: "0")));
        Assert.Equal("ck_etapa_fluxo_prazo", await Violou(con, Etapa(2, prazo: "721")));
        Assert.Null(await Violou(con, Etapa(2, prazo: "1")));
        Assert.Null(await Violou(con, Etapa(3, prazo: "720")));
        Assert.Equal("ck_etapa_fluxo_posicao", await Violou(con, Etapa(4, x: "10")));
        Assert.Equal("ck_etapa_fluxo_posicao", await Violou(con, Etapa(4, y: "10")));
        Assert.Null(await Violou(con, Etapa(4, x: "10", y: "20")));
    }

    // C14 (a parte do chamado; a do setor com curso e semestre é da liderança)
    [Fact]
    public async Task Colunas_do_chamado_e_do_setor()
    {
        var i = await f.Instituicao();
        var curso = await f.Db(i.Id, async db => { var c = new Curso { Nome = "ADS" }; db.Cursos.Add(c); await db.SaveChangesAsync(); return c; });
        await using var con = await Abrir();
        await using var cmd = new NpgsqlCommand("""
            SELECT column_name || '.' || data_type || '.' || is_nullable FROM information_schema.columns
            WHERE table_name = 'chamado' AND column_name IN ('versao_fluxo_id', 'etapa_ordem', 'etapa_desde') ORDER BY 1
            """, con);
        await using var r = await cmd.ExecuteReaderAsync();
        var colunas = new List<string>();
        while (await r.ReadAsync()) colunas.Add(r.GetString(0));

        Assert.Equal(["etapa_desde.timestamp with time zone.YES", "etapa_ordem.integer.YES", "versao_fluxo_id.bigint.YES"], colunas);
        await using var segunda = await Abrir();
        await ColunasEConstraintsDoSetor(segunda);
        await SetorRecusadoPeloBanco(segunda, i, curso.Id);
    }

    static async Task SetorRecusadoPeloBanco(NpgsqlConnection con, Instituicao i, long cursoId)
    {
        string Setor(string nome, string curso, string semestre, string ativo = "true") =>
            $"INSERT INTO setor (instituicao_id, nome, triagem, ativo, curso_id, semestre) VALUES ({i.Id}, '{nome}', false, {ativo}, {curso}, {semestre})";
        Assert.Equal("ck_setor_curso_e_semestre", await Violou(con, Setor("so curso", $"{cursoId}", "NULL")));
        Assert.Equal("ck_setor_curso_e_semestre", await Violou(con, Setor("so semestre", "NULL", "3")));
        Assert.Equal("ck_setor_semestre", await Violou(con, Setor("semestre 0", $"{cursoId}", "0")));
        Assert.Equal("ck_setor_semestre", await Violou(con, Setor("semestre 13", $"{cursoId}", "13")));
        Assert.Null(await Violou(con, Setor("semestre 1", $"{cursoId}", "1")));
        Assert.Null(await Violou(con, Setor("semestre 12", $"{cursoId}", "12")));
        // uma liderança ativa por curso e semestre; a inativa não conta
        Assert.Equal("ux_setor_lideranca", await Violou(con, Setor("outra do 1", $"{cursoId}", "1")));
        Assert.Null(await Violou(con, Setor("inativa do 1", $"{cursoId}", "1", "false")));
        Assert.Null(await Violou(con, Setor("sem turma a", "NULL", "NULL")));
        Assert.Null(await Violou(con, Setor("sem turma b", "NULL", "NULL")));
    }

    // C14, metade do setor (door 5): curso e semestre anuláveis, os dois checks e o índice parcial da liderança ativa.
    static async Task ColunasEConstraintsDoSetor(NpgsqlConnection con)
    {
        var colunas = await Lista(con, "SELECT column_name || '.' || data_type || '.' || is_nullable FROM information_schema.columns WHERE table_name = 'setor' AND column_name IN ('curso_id', 'semestre') ORDER BY 1");
        Assert.Equal(["curso_id.bigint.YES", "semestre.integer.YES"], colunas);

        var checks = await Lista(con, "SELECT conname || ':' || pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'setor'::regclass AND contype = 'c' ORDER BY 1");
        Assert.Equal(["ck_setor_curso_e_semestre:CHECK (((curso_id IS NULL) = (semestre IS NULL)))", "ck_setor_semestre:CHECK (((semestre >= 1) AND (semestre <= 12)))"], checks);

        var indice = await Lista(con, "SELECT indexdef FROM pg_indexes WHERE indexname = 'ux_setor_lideranca'");
        var definicao = Assert.Single(indice);
        Assert.Contains("UNIQUE INDEX ux_setor_lideranca ON public.setor USING btree (instituicao_id, curso_id, semestre)", definicao);
        Assert.Contains("WHERE ((curso_id IS NOT NULL) AND ativo)", definicao);
    }

    static async Task<List<string>> Lista(NpgsqlConnection con, string sql)
    {
        await using var cmd = new NpgsqlCommand(sql, con);
        await using var r = await cmd.ExecuteReaderAsync();
        var linhas = new List<string>();
        while (await r.ReadAsync()) linhas.Add(r.GetString(0));
        return linhas;
    }
}
