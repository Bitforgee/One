using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class MatriculaMapeamento : IEntityTypeConfiguration<Matricula>
{
    public void Configure(EntityTypeBuilder<Matricula> e)
    {
        e.Property(x => x.Numero).HasMaxLength(20);
        e.HasIndex(x => new { x.InstituicaoId, x.Numero }).IsUnique();
    }
}
