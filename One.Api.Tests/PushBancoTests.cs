using Microsoft.EntityFrameworkCore;
using Npgsql;
using One.Api.Dados;
using One.Api.Dados.Push;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class PushBancoTests(OneFactory f) : IClassFixture<OneFactory>
{
    async Task<List<string>> Colunas(string tabela)
    {
        await using var con = new NpgsqlConnection(f.ConnectionString);
        await con.OpenAsync();
        await using var cmd = new NpgsqlCommand("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = @t", con);
        cmd.Parameters.AddWithValue("t", tabela);
        await using var r = await cmd.ExecuteReaderAsync();
        var lista = new List<string>();
        while (await r.ReadAsync()) lista.Add(r.GetString(0));
        return lista;
    }

    [Fact]
    public async Task Endpoint_unico_no_banco()
    {
        var a = await f.AlunoLogado();
        var b = await f.AlunoLogado();
        var endpoint = PushSemente.Endpoint();
        await f.Subscrever(a.Instituicao, a.Usuario, endpoint);
        var falha = await Assert.ThrowsAsync<DbUpdateException>(() => f.Subscrever(b.Instituicao, b.Usuario, endpoint));
        Assert.Equal(PostgresErrorCodes.UniqueViolation, Assert.IsType<PostgresException>(falha.InnerException).SqlState);
    }

    [Fact]
    public async Task Push_saida_some_com_a_subscricao()
    {
        var balcao = await Balcao.Criar(f);
        var s = await f.Subscrever(balcao.Instituicao, balcao.Aluno.Usuario);
        var outra = await f.Subscrever(balcao.Instituicao, balcao.Aluno.Usuario);
        var (n1, n2) = (await balcao.Chamado(), await balcao.Chamado());
        var (c1, c2) = ((await balcao.Ler(n1)).Id, (await balcao.Ler(n2)).Id);
        await f.Db(balcao.Instituicao.Id, async db =>
        {
            db.PushesSaida.AddRange(PushSaida.Criar(s.Id, c1, f.Relogio.GetUtcNow().UtcDateTime), PushSaida.Criar(s.Id, c2, f.Relogio.GetUtcNow().UtcDateTime),
                PushSaida.Criar(outra.Id, c1, f.Relogio.GetUtcNow().UtcDateTime));
            await db.SaveChangesAsync();
        });

        await using (var con = new NpgsqlConnection(f.ConnectionString))
        {
            await con.OpenAsync();
            await new NpgsqlCommand($"DELETE FROM subscricao_push WHERE id = {s.Id}", con).ExecuteNonQueryAsync();
        }

        var restam = await f.Pushes();
        Assert.Equal([outra.Id], restam.Select(p => p.SubscricaoId));
    }

    [Fact]
    public async Task Colunas_das_duas_tabelas()
    {
        Assert.Equal(new[] { "id", "instituicao_id", "usuario_id", "endpoint", "p256dh", "auth", "registrada_em" }.Order(), (await Colunas("subscricao_push")).Order());
        Assert.Equal(new[] { "id", "instituicao_id", "subscricao_id", "chamado_id", "tentativas", "proxima_tentativa", "enviado_em" }.Order(), (await Colunas("push_saida")).Order());
    }
}
