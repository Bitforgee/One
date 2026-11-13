using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Chamados;
using One.Api.Chamados.Shared;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.Chamados.EstadosChamado;

namespace One.Api.Tests;

public class DetalheChamadoTests(OneFactory f) : IClassFixture<OneFactory>
{
    sealed class ContadorDeConsultas : DbCommandInterceptor
    {
        int total;
        public int Total => total;

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            Interlocked.Increment(ref total);
            return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
        }
    }

    [Theory]
    [InlineData(PermissoesChamado.Aluno)]
    [InlineData(PermissoesChamado.Lider)]
    [InlineData(PermissoesChamado.Atendente)]
    public async Task Montar_faz_no_maximo_4_consultas(string papel)
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(EmAtendimento);
        Assert.True((await Balcao.Mensagem(b.A.Cliente, numero, "Aluno ligou.", "NOTA")).IsSuccessStatusCode);
        Assert.True((await Balcao.Mensagem(b.ClienteAluno, numero, "Segue o comprovante.")).IsSuccessStatusCode);
        var contador = new ContadorDeConsultas();
        using var escopo = f.Services.CreateScope();
        var opcoes = new DbContextOptionsBuilder<OneDb>(escopo.ServiceProvider.GetRequiredService<DbContextOptions<OneDb>>()).AddInterceptors(contador).Options;
        await using var db = new OneDb(opcoes) { InstituicaoAtual = b.Instituicao.Id };
        var chamado = await db.Chamados.SingleAsync(c => c.Numero == numero);
        var antes = contador.Total;

        var detalhe = await DetalheChamado.Montar(db, papel == PermissoesChamado.Aluno ? chamado.SolicitanteId : b.A.Usuario.Id, chamado, papel);

        Assert.Equal(numero, detalhe.Numero);
        Assert.True(contador.Total - antes <= 4, $"{papel}: {contador.Total - antes} consultas");
    }
}
