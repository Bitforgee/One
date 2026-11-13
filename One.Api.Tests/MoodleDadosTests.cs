using Microsoft.EntityFrameworkCore;
using Npgsql;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class MoodleDadosTests(OneFactory f) : IClassFixture<OneFactory>
{
    async Task<List<string>> IndicesUnicos(string tabela)
    {
        await using var con = new NpgsqlConnection(f.ConnectionString);
        await con.OpenAsync();
        await using var cmd = new NpgsqlCommand("""
            SELECT string_agg(a.attname, ',' ORDER BY array_position(ix.indkey, a.attnum))
            FROM pg_index ix JOIN pg_class t ON t.oid = ix.indrelid JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
            WHERE t.relname = @t AND ix.indisunique AND NOT ix.indisprimary GROUP BY ix.indexrelid
            """, con);
        cmd.Parameters.AddWithValue("t", tabela);
        var lista = new List<string>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) lista.Add(r.GetString(0));
        return lista;
    }

    [Fact]
    public async Task Plataforma_unica_por_instituicao() =>
        Assert.Equal(["instituicao_id"], await IndicesUnicos("plataforma_moodle"));

    [Fact]
    public async Task Vinculo_unico_por_emissor_e_sub()
    {
        Assert.Equal(["instituicao_id,emissor,sub"], await IndicesUnicos("vinculo_moodle"));
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [One.Api.Dados.Usuarios.Papeis.Aluno]);
        var agora = f.Relogio.GetUtcNow().UtcDateTime;
        await f.Db(i.Id, async db => { db.VinculosMoodle.Add(VinculoMoodle.Criar(u.Id, "https://m.teste", "1", agora)); await db.SaveChangesAsync(); });

        var erro = await Assert.ThrowsAsync<DbUpdateException>(() => f.Db(i.Id, async db =>
        {
            db.VinculosMoodle.Add(VinculoMoodle.Criar(u.Id, "https://m.teste", "1", agora));
            await db.SaveChangesAsync();
        }));
        Assert.Equal(PostgresErrorCodes.UniqueViolation, Assert.IsType<PostgresException>(erro.InnerException).SqlState);
    }

    [Fact]
    public async Task State_unico() =>
        Assert.Equal(["state"], await IndicesUnicos("lti_lancamento"));
}
