using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class EtapaFluxoMapeamento : IEntityTypeConfiguration<EtapaFluxo>
{
    public void Configure(EntityTypeBuilder<EtapaFluxo> e)
    {
        e.HasOne<Setor>().WithMany().HasForeignKey(x => x.SetorId);
        e.HasIndex(x => new { x.VersaoFluxoId, x.Ordem }).IsUnique();
        e.ToTable(t =>
        {
            t.HasCheckConstraint("ck_etapa_fluxo_ordem", "ordem BETWEEN 1 AND 5");
            t.HasCheckConstraint("ck_etapa_fluxo_prazo", "prazo_horas IS NULL OR prazo_horas BETWEEN 1 AND 720");
            t.HasCheckConstraint("ck_etapa_fluxo_posicao", "(pos_x IS NULL) = (pos_y IS NULL)");
        });
    }
}
