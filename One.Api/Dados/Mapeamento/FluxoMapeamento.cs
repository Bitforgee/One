using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class FluxoMapeamento : IEntityTypeConfiguration<Fluxo>
{
    public void Configure(EntityTypeBuilder<Fluxo> e)
    {
        e.HasOne<Categoria>().WithMany().HasForeignKey(x => x.CategoriaId);
        e.HasOne<Curso>().WithMany().HasForeignKey(x => x.CursoId);
        e.HasMany(x => x.Versoes).WithOne().HasForeignKey(v => v.FluxoId);
        e.HasIndex(x => new { x.InstituicaoId, x.CategoriaId, x.CursoId, x.Semestre }).IsUnique().AreNullsDistinct(false).HasDatabaseName("ux_fluxo_abrangencia");
        e.ToTable(t =>
        {
            t.HasCheckConstraint("ck_fluxo_semestre_com_curso", "semestre IS NULL OR curso_id IS NOT NULL");
            t.HasCheckConstraint("ck_fluxo_semestre", "semestre BETWEEN 1 AND 12");
        });
    }
}
