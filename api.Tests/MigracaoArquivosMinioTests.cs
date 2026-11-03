using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using One.Api.Dados;

namespace One.Api.Tests;

// arquivos-minio S6: a migração ArquivosMinio roda em banco descartável, sem passar pelo OneFactory.
public class MigracaoArquivosMinioTests
{
    const string Servidor = "Host=localhost;Port=5432;Username=postgres;Password=postgres";
    const string AteRag = "20261102170902_Rag";
    const string Migracao = "20261103023003_ArquivosMinio";

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
        while (await r.ReadAsync()) lista.Add(r.GetString(0));
        return lista;
    }

    // Banco novo migrado até Rag; as linhas de teste entram com as chaves estrangeiras desligadas (a migração só olha a contagem).
    static async Task Com(Func<string, Func<string, Task>, Task> prova, string? insere = null)
    {
        var banco = "one_mig_" + Guid.NewGuid().ToString("N")[..12];
        var cs = $"{Servidor};Database={banco}";
        await Executar(Servidor, $"CREATE DATABASE {banco}");
        try
        {
            async Task Migrar(string alvo)
            {
                var opcoes = new DbContextOptionsBuilder<OneDb>().UseNpgsql(cs, n => n.UseVector()).Options;
                await using var db = new OneDb(opcoes);
                await db.GetService<IMigrator>().MigrateAsync(alvo);
            }
            await Migrar(AteRag);
            if (insere is not null) await Executar(cs, "SET session_replication_role = replica; " + insere);
            await prova(cs, Migrar);
        }
        finally
        {
            NpgsqlConnection.ClearAllPools();
            await Executar(Servidor, $"DROP DATABASE IF EXISTS {banco} WITH (FORCE)");
        }
    }

    const string Colunas = """
        SELECT table_name || '.' || column_name || '.' || is_nullable FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name IN ('anexo', 'versao_documento') ORDER BY 1
        """;

    // C22
    [Fact]
    public Task Migracao_aplica_em_banco_sem_linha() => Com(async (cs, migrar) =>
    {
        await migrar(Migracao);

        var colunas = await Consultar(cs, Colunas);
        foreach (var tabela in new[] { "anexo", "versao_documento" })
        {
            Assert.Contains($"{tabela}.chave.NO", colunas);
            Assert.Contains($"{tabela}.hash.NO", colunas);
            Assert.DoesNotContain(colunas, c => c.StartsWith($"{tabela}.conteudo."));
            var indices = await Consultar(cs, $"SELECT indexdef FROM pg_indexes WHERE tablename = '{tabela}'");
            Assert.Contains(indices, i => i.Contains("UNIQUE") && i.Contains("(chave)"));
        }
        Assert.Contains("versao_documento.tamanho.NO", colunas);
        Assert.Contains(Migracao, await Consultar(cs, """SELECT "MigrationId" FROM "__EFMigrationsHistory" """));
    });

    // C23: caso 1 com linha em anexo, caso 2 com linha em versao_documento
    [Theory]
    [InlineData("INSERT INTO anexo (instituicao_id, mensagem_chamado_id, nome, tipo, tamanho, conteudo) VALUES (1, 1, 'a.png', 'image/png', 1, '\\x00')")]
    [InlineData("INSERT INTO versao_documento (instituicao_id, documento_id, numero, nome_arquivo, conteudo, texto, paginas, criada_em) VALUES (1, 1, 1, 'a.pdf', '\\x00', 't', 1, now())")]
    public Task Migracao_aborta_com_linha_em_anexo_ou_versao(string linha) => Com(async (cs, migrar) =>
    {
        var e = await Assert.ThrowsAnyAsync<Exception>(() => migrar(Migracao));
        Assert.Contains("docker compose down -v", e.ToString());

        var colunas = await Consultar(cs, Colunas);
        Assert.Contains("anexo.conteudo.NO", colunas);
        Assert.Contains("versao_documento.conteudo.NO", colunas);
        Assert.DoesNotContain(Migracao, await Consultar(cs, """SELECT "MigrationId" FROM "__EFMigrationsHistory" """));
    }, linha);
}
