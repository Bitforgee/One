using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class TrechoFonteMapeamento : IEntityTypeConfiguration<TrechoFonte>
{
    public void Configure(EntityTypeBuilder<TrechoFonte> e)
    {
        e.HasOne(x => x.VersaoArtigo).WithMany().HasForeignKey(x => x.VersaoArtigoId);
        e.HasOne(x => x.VersaoDocumento).WithMany().HasForeignKey(x => x.VersaoDocumentoId);
        e.Property(x => x.Embedding).HasColumnType("vector(1536)");
        e.HasIndex(x => x.Embedding).HasMethod("hnsw").HasOperators("vector_cosine_ops");
        e.ToTable(t => t.HasCheckConstraint("ck_trecho_fonte_uma_versao", "(versao_artigo_id IS NULL) <> (versao_documento_id IS NULL)"));
    }
}
