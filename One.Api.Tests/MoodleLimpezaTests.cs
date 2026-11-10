using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class MoodleLimpezaTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Agendador_apaga_o_que_venceu_ha_mais_de_um_dia()
    {
        var a = await f.Instituicao();
        var b = await f.Instituicao();
        var apagar = new List<string>();
        var manter = new List<string>();
        foreach (var i in new[] { a, b })
        {
            apagar.Add((await f.NovoLancamento(i, agora => agora - LtiLancamento.Validade - TimeSpan.FromDays(1) - TimeSpan.FromMinutes(1))).State);
            manter.Add((await f.NovoLancamento(i, agora => agora - LtiLancamento.Validade - TimeSpan.FromHours(23) - TimeSpan.FromMinutes(59))).State);
            manter.Add((await f.NovoLancamento(i)).State);
        }

        await f.Services.GetRequiredService<Agendador>().Executar();

        var restantes = await f.Db(null, db => db.LtiLancamentos.IgnoreQueryFilters().Select(x => x.State).ToListAsync());
        Assert.Equal(manter.Order(), restantes.Order());
        Assert.Empty(restantes.Intersect(apagar));
        var vencimentos = await f.Db(null, db => db.LtiLancamentos.IgnoreQueryFilters().Select(x => x.ExpiraEm).ToListAsync());
        Assert.Contains(f.Relogio.GetUtcNow().UtcDateTime - TimeSpan.FromHours(23) - TimeSpan.FromMinutes(59), vencimentos);
    }
}
