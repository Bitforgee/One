using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class VersaoDocumentoMapeamento : IEntityTypeConfiguration<VersaoDocumento>
{
    public void Configure(EntityTypeBuilder<VersaoDocumento> e)
    {
        e.HasIndex(x => new { x.DocumentoId, x.Numero }).IsUnique();
        e.Property(x => x.Hash).HasColumnType("char(64)");
        e.HasIndex(x => x.Chave).IsUnique();
    }
}
