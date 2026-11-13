using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class CursoMapeamento : IEntityTypeConfiguration<Curso>
{
    public void Configure(EntityTypeBuilder<Curso> e)
    {
        e.HasOne<Setor>().WithMany().HasForeignKey(x => x.SetorCoordenacaoId);
        e.HasIndex(x => new { x.InstituicaoId, x.Nome }).IsUnique();
    }
}
