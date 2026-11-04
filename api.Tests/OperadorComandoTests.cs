using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Instituicoes;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

// instituicoes-plataforma S1: o papel OPERADOR só passa pelo comando `instituicao operador` (door 1).
public class OperadorComandoTests(OneFactory f) : IClassFixture<OneFactory>
{
    async Task<(int codigo, string saida, string erro)> Rodar(params string[] args)
    {
        var (saida, erro) = (new StringWriter(), new StringWriter());
        var codigo = await InstituicaoComando.Executar(f.Services, args, saida, erro);
        return (codigo, saida.ToString(), erro.ToString());
    }

    Task<int> LinhasOperador(long usuarioId) =>
        f.Db(null, db => db.UsuarioPapeis.IgnoreQueryFilters().CountAsync(p => p.UsuarioId == usuarioId && p.Papel == "OPERADOR"));

    Task<int> TotalDePapeis() => f.Db(null, db => db.UsuarioPapeis.IgnoreQueryFilters().CountAsync());

    [Fact]
    public async Task Adicionar_operador_sai_0()
    {
        var i = await f.Instituicao(slug: "univag");
        var u = await f.Usuario(i, [Papeis.Administrador]);

        var (codigo, saida, erro) = await Rodar("operador", "--slug", "univag", "--cpf", u.Cpf);

        Assert.Equal(0, codigo);
        Assert.Equal("", erro);
        Assert.Equal($"Operador {u.Nome} adicionado.{Environment.NewLine}", saida);
        Assert.Equal(1, await LinhasOperador(u.Id));

        var (segundo, _, _) = await Rodar("operador", "--slug", "univag", "--cpf", u.Cpf);
        Assert.Equal(0, segundo);
        Assert.Equal(1, await LinhasOperador(u.Id));
    }

    [Fact]
    public async Task Remover_operador_sai_0()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Administrador, Papeis.Operador]);

        var (codigo, saida, erro) = await Rodar("operador", "--slug", i.Slug, "--cpf", u.Cpf, "--remover");

        Assert.Equal(0, codigo);
        Assert.Equal("", erro);
        Assert.Equal($"Operador {u.Nome} removido.{Environment.NewLine}", saida);
        Assert.Equal(0, await LinhasOperador(u.Id));
        Assert.Equal([Papeis.Administrador], await f.Db(i.Id, db => db.UsuarioPapeis.Where(p => p.UsuarioId == u.Id).Select(p => p.Papel).ToListAsync()));

        // a flag pode vir antes dos pares
        var (daNovo, _, _) = await Rodar("operador", "--remover", "--slug", i.Slug, "--cpf", u.Cpf);
        Assert.Equal(0, daNovo);
    }

    [Fact]
    public async Task Operador_invalido_sai_1()
    {
        var i = await f.Instituicao();
        var inativo = await f.Usuario(i, [Papeis.Administrador]);
        await f.Db(i.Id, db => db.Usuarios.Where(u => u.Id == inativo.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.Ativo, false)));
        var outra = await f.Instituicao();
        var deOutra = await f.Usuario(outra, [Papeis.Administrador]);
        var antes = await TotalDePapeis();

        var casos = new[]
        {
            new[] { "operador", "--slug", "nao-existe", "--cpf", inativo.Cpf },
            new[] { "operador", "--slug", i.Slug, "--cpf", deOutra.Cpf }, // CPF sem usuário nesta instituição
            new[] { "operador", "--slug", i.Slug, "--cpf", inativo.Cpf },
        };
        foreach (var args in casos)
        {
            var (codigo, saida, erro) = await Rodar(args);
            Assert.Equal(1, codigo);
            Assert.Equal("", saida);
            Assert.NotEqual("", erro.Trim());
        }
        Assert.Equal(antes, await TotalDePapeis());
    }
}
