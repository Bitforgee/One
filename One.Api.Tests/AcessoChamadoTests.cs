using One.Api.Chamados;

namespace One.Api.Tests;

public class AcessoChamadoTests
{
    [Fact]
    public void Tem_so_Agora_Chamado_e_Papel()
    {
        var propriedades = typeof(AcessoChamado).GetProperties().Select(p => p.Name).Order().ToList();
        Assert.Equal(["Agora", "Chamado", "Papel"], propriedades);
    }
}
