using Npgsql;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class CpfPersistenciaTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Cpf_grava_char_11_sem_mascara()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Aluno], cpf: "11144477735");

        await using var con = new NpgsqlConnection(f.ConnectionString);
        await con.OpenAsync();
        await using var cmd = new NpgsqlCommand("SELECT cpf FROM usuario WHERE id = @id", con);
        cmd.Parameters.AddWithValue("id", u.Id);
        Assert.Equal("11144477735", (string?)await cmd.ExecuteScalarAsync());

        await using var tipo = new NpgsqlCommand("SELECT data_type || '(' || character_maximum_length || ')' FROM information_schema.columns WHERE table_name = 'usuario' AND column_name = 'cpf'", con);
        Assert.Equal("character(11)", (string?)await tipo.ExecuteScalarAsync());
        Assert.Equal("11144477735", (await f.Db(i.Id, db => db.Usuarios.FindAsync(u.Id).AsTask()))!.Cpf.Valor);
    }
}