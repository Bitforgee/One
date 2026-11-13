using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class MensagemChamadoMapeamento : IEntityTypeConfiguration<MensagemChamado>
{
    public void Configure(EntityTypeBuilder<MensagemChamado> e)
    {
        e.HasOne<Chamado>().WithMany(c => c.Mensagens).HasForeignKey(x => x.ChamadoId);
        e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.AutorId);
    }
}
