using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class AnexoConversaMapeamento : IEntityTypeConfiguration<AnexoConversa>
{
    public void Configure(EntityTypeBuilder<AnexoConversa> e)
    {
        e.HasOne<MensagemConversa>().WithMany(m => m.Anexos).HasForeignKey(x => x.MensagemConversaId);
        e.Property(x => x.Hash).HasColumnType("char(64)");
        e.HasIndex(x => x.Chave).IsUnique();
    }
}
