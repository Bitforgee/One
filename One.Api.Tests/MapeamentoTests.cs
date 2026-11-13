using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using One.Api.Dados;

namespace One.Api.Tests;

public class MapeamentoTests
{
    static OneDb NovoContexto() =>
        new(new DbContextOptionsBuilder<OneDb>().UseNpgsql("Host=localhost;Database=one;Username=postgres;Password=postgres", o => o.UseVector())
            .EnableServiceProviderCaching(false).Options);

    static string Modelo(string cultura)
    {
        CultureInfo.CurrentCulture = CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo(cultura);
        using var db = NovoContexto();
        return db.GetService<IDesignTimeModel>().Model.ToDebugString(MetadataDebugStringOptions.LongDefault);
    }

    [Fact]
    public void Modelo_igual_em_pt_BR_e_Invariant()
    {
        var cultura = CultureInfo.CurrentCulture;
        var culturaDaTela = CultureInfo.CurrentUICulture;
        try
        {
            var invariante = Modelo("");
            Assert.Equal(invariante, Modelo("pt-BR"));
            Assert.Contains("Relational:TableName", invariante);
        }
        finally
        {
            CultureInfo.CurrentCulture = cultura;
            CultureInfo.CurrentUICulture = culturaDaTela;
        }
    }

    [Fact]
    public void Uma_configuracao_por_tipo_de_entidade()
    {
        var configuracoes = typeof(OneDb).Assembly.GetTypes()
            .Where(t => t is { IsClass: true, IsAbstract: false } && t.Namespace == "One.Api.Dados.Mapeamento")
            .SelectMany(t => t.GetInterfaces().Where(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IEntityTypeConfiguration<>))
                .Select(i => (classe: t.Name, entidade: i.GetGenericArguments()[0].Name)))
            .ToList();
        using var db = NovoContexto();
        var entidades = db.Model.GetEntityTypes().Select(e => e.ClrType.Name).Order().ToList();

        Assert.Equal(34, configuracoes.Count);
        Assert.Equal(entidades, configuracoes.Select(c => c.entidade).Order());
        Assert.Equal(configuracoes.Select(c => c.classe).Order(), configuracoes.Select(c => c.classe).Distinct().Order());

        var onedb = File.ReadAllText(Path.Combine(ArquiteturaTests.Raiz(), "One.Api", "Dados", "OneDb.cs"));
        var aplicadas = Regex.Matches(onedb, @"ApplyConfiguration\(new (\w+)\(\)\)").Select(m => m.Groups[1].Value).ToList();
        Assert.Equal(configuracoes.Select(c => c.classe).Order(), aplicadas.Order());
        Assert.True(onedb.LastIndexOf("ApplyConfiguration(", StringComparison.Ordinal) < onedb.IndexOf("SetTableName", StringComparison.Ordinal));
    }
}
