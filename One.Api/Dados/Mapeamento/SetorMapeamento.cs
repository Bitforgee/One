using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class SetorMapeamento : IEntityTypeConfiguration<Setor>
{
    public void Configure(EntityTypeBuilder<Setor> e)
    {
        e.HasIndex(x => x.InstituicaoId).IsUnique().HasFilter("triagem").HasDatabaseName("ux_setor_triagem");
        e.HasIndex(x => new { x.InstituicaoId, x.Nome }).IsUnique();
        e.HasOne<Curso>().WithMany().HasForeignKey(x => x.CursoId);
        e.HasIndex(x => new { x.InstituicaoId, x.CursoId, x.Semestre }).IsUnique().HasFilter("curso_id IS NOT NULL AND ativo").HasDatabaseName("ux_setor_lideranca");
        e.ToTable(t =>
        {
            t.HasCheckConstraint("ck_setor_curso_e_semestre", "(curso_id IS NULL) = (semestre IS NULL)");
            t.HasCheckConstraint("ck_setor_semestre", "semestre BETWEEN 1 AND 12");
        });
    }
}
