using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class RespostaProntaMapeamento : IEntityTypeConfiguration<RespostaPronta>
{
    public void Configure(EntityTypeBuilder<RespostaPronta> e)
    {
        e.HasOne<Setor>().WithMany().HasForeignKey(x => x.SetorId);
        e.HasIndex(x => new { x.SetorId, x.Titulo }).IsUnique();
    }
}
