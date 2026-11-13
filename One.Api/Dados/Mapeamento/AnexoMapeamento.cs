using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class AnexoMapeamento : IEntityTypeConfiguration<Anexo>
{
    public void Configure(EntityTypeBuilder<Anexo> e)
    {
        e.HasOne<MensagemChamado>().WithMany(m => m.Anexos).HasForeignKey(x => x.MensagemChamadoId);
        e.Property(x => x.Hash).HasColumnType("char(64)");
        e.HasIndex(x => x.Chave).IsUnique();
    }
}
