using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace One.Api.Dados;

public class OneDb(DbContextOptions<OneDb> options) : DbContext(options)
{
    public long? InstituicaoAtual { get; set; }

    public DbSet<Instituicao> Instituicoes => Set<Instituicao>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<UsuarioPapel> UsuarioPapeis => Set<UsuarioPapel>();
    public DbSet<Setor> Setores => Set<Setor>();
    public DbSet<AtendenteSetor> AtendenteSetores => Set<AtendenteSetor>();
    public DbSet<Curso> Cursos => Set<Curso>();
    public DbSet<Matricula> Matriculas => Set<Matricula>();
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Fluxo> Fluxos => Set<Fluxo>();
    public DbSet<VersaoFluxo> VersoesFluxo => Set<VersaoFluxo>();
    public DbSet<EtapaFluxo> EtapasFluxo => Set<EtapaFluxo>();
    public DbSet<Artigo> Artigos => Set<Artigo>();
    public DbSet<VersaoArtigo> VersoesArtigo => Set<VersaoArtigo>();
    public DbSet<TokenAcesso> Tokens => Set<TokenAcesso>();
    public DbSet<Conversa> Conversas => Set<Conversa>();
    public DbSet<MensagemConversa> MensagensConversa => Set<MensagemConversa>();
    public DbSet<CitacaoArtigo> Citacoes => Set<CitacaoArtigo>();
    public DbSet<AnexoConversa> AnexosConversa => Set<AnexoConversa>();
    public DbSet<Chamado> Chamados => Set<Chamado>();
    public DbSet<MensagemChamado> MensagensChamado => Set<MensagemChamado>();
    public DbSet<Anexo> Anexos => Set<Anexo>();
    public DbSet<EventoChamado> EventosChamado => Set<EventoChamado>();
    public DbSet<RespostaPronta> RespostasProntas => Set<RespostaPronta>();
    public DbSet<EmailSaida> EmailsSaida => Set<EmailSaida>();
    public DbSet<Documento> Documentos => Set<Documento>();
    public DbSet<VersaoDocumento> VersoesDocumento => Set<VersaoDocumento>();
    public DbSet<TrechoFonte> TrechosFonte => Set<TrechoFonte>();
    public DbSet<SubscricaoPush> SubscricoesPush => Set<SubscricaoPush>();
    public DbSet<PushSaida> PushesSaida => Set<PushSaida>();
    public DbSet<ImagemInstituicao> ImagensInstituicao => Set<ImagemInstituicao>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.HasPostgresExtension("vector");
        mb.Entity<Instituicao>(e =>
        {
            e.Property(x => x.Slug).HasMaxLength(30);
            e.HasIndex(x => x.Slug).IsUnique();
        });
        mb.Entity<ImagemInstituicao>(e =>
        {
            e.Property(x => x.Hash).HasColumnType("char(64)");
            e.HasIndex(nameof(ImagemInstituicao.InstituicaoId), nameof(ImagemInstituicao.Tipo)).IsUnique();
        });
        mb.Entity<Usuario>(e =>
        {
            e.Property(x => x.Cpf).HasColumnType("char(11)");
            e.HasIndex(x => new { x.InstituicaoId, x.Cpf }).IsUnique();
            e.HasIndex(x => new { x.InstituicaoId, x.Email }).IsUnique();
        });
        mb.Entity<UsuarioPapel>().HasIndex(x => new { x.UsuarioId, x.Papel }).IsUnique();
        mb.Entity<Setor>(e =>
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
        });
        mb.Entity<Categoria>().HasIndex(x => new { x.InstituicaoId, x.Nome }).IsUnique();
        mb.Entity<AtendenteSetor>(e =>
        {
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId);
            e.HasOne<Setor>().WithMany().HasForeignKey(x => x.SetorId);
        });
        mb.Entity<Curso>(e =>
        {
            e.HasOne<Setor>().WithMany().HasForeignKey(x => x.SetorCoordenacaoId);
            e.HasIndex(x => new { x.InstituicaoId, x.Nome }).IsUnique();
        });
        mb.Entity<Matricula>(e =>
        {
            e.Property(x => x.Numero).HasMaxLength(20);
            e.HasIndex(x => new { x.InstituicaoId, x.Numero }).IsUnique();
        });
        mb.Entity<Fluxo>(e =>
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
        });
        mb.Entity<VersaoFluxo>(e =>
        {
            e.HasMany(x => x.Etapas).WithOne().HasForeignKey(x => x.VersaoFluxoId);
            e.HasIndex(x => new { x.FluxoId, x.Numero }).IsUnique();
            e.HasIndex(x => x.FluxoId).IsUnique().HasFilter("publicada_em IS NULL").HasDatabaseName("ux_versao_rascunho");
            e.Property(x => x.PublicadaEm).IsConcurrencyToken();
        });
        mb.Entity<EtapaFluxo>(e =>
        {
            e.HasOne<Setor>().WithMany().HasForeignKey(x => x.SetorId);
            e.HasIndex(x => new { x.VersaoFluxoId, x.Ordem }).IsUnique();
            e.ToTable(t =>
            {
                t.HasCheckConstraint("ck_etapa_fluxo_ordem", "ordem BETWEEN 1 AND 5");
                t.HasCheckConstraint("ck_etapa_fluxo_prazo", "prazo_horas IS NULL OR prazo_horas BETWEEN 1 AND 720");
                t.HasCheckConstraint("ck_etapa_fluxo_posicao", "(pos_x IS NULL) = (pos_y IS NULL)");
            });
        });
        mb.Entity<Artigo>().HasOne<Categoria>().WithMany().HasForeignKey(x => x.CategoriaId);
        mb.Entity<Artigo>().HasMany(a => a.Versoes).WithOne(v => v.Artigo).HasForeignKey(v => v.ArtigoId);
        mb.Entity<VersaoArtigo>().HasIndex(x => new { x.ArtigoId, x.Numero }).IsUnique();
        mb.Entity<TokenAcesso>(e =>
        {
            e.Property(x => x.Hash).HasColumnType("char(64)");
            e.HasIndex(x => x.Hash).IsUnique();
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId);
        });
        mb.Entity<Conversa>().HasOne<Usuario>().WithMany().HasForeignKey(x => x.AlunoId);
        mb.Entity<CitacaoArtigo>(e =>
        {
            e.HasOne<VersaoArtigo>().WithMany().HasForeignKey(x => x.VersaoArtigoId);
            e.HasOne<TrechoFonte>().WithMany().HasForeignKey(x => x.TrechoFonteId);
            e.ToTable(t => t.HasCheckConstraint("ck_citacao_artigo_fonte", "trecho_fonte_id IS NOT NULL OR versao_artigo_id IS NOT NULL"));
        });
        mb.Entity<Documento>().HasOne<Categoria>().WithMany().HasForeignKey(x => x.CategoriaId);
        mb.Entity<Documento>().HasMany(d => d.Versoes).WithOne(v => v.Documento).HasForeignKey(v => v.DocumentoId);
        mb.Entity<VersaoDocumento>(e =>
        {
            e.HasIndex(x => new { x.DocumentoId, x.Numero }).IsUnique();
            e.Property(x => x.Hash).HasColumnType("char(64)");
            e.HasIndex(x => x.Chave).IsUnique();
        });
        mb.Entity<TrechoFonte>(e =>
        {
            e.HasOne(x => x.VersaoArtigo).WithMany().HasForeignKey(x => x.VersaoArtigoId);
            e.HasOne(x => x.VersaoDocumento).WithMany().HasForeignKey(x => x.VersaoDocumentoId);
            e.Property(x => x.Embedding).HasColumnType("vector(1536)");
            e.HasIndex(x => x.Embedding).HasMethod("hnsw").HasOperators("vector_cosine_ops");
            e.ToTable(t => t.HasCheckConstraint("ck_trecho_fonte_uma_versao", "(versao_artigo_id IS NULL) <> (versao_documento_id IS NULL)"));
        });
        mb.Entity<SubscricaoPush>(e =>
        {
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId);
            e.HasIndex(x => x.Endpoint).IsUnique();
        });
        mb.Entity<PushSaida>(e =>
        {
            e.HasOne<SubscricaoPush>().WithMany().HasForeignKey(x => x.SubscricaoId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<Chamado>().WithMany().HasForeignKey(x => x.ChamadoId);
            e.Property(x => x.EnviadoEm).IsConcurrencyToken();
        });
        mb.Entity<Chamado>(e =>
        {
            e.Property(x => x.Numero).HasMaxLength(20);
            e.HasIndex(x => new { x.InstituicaoId, x.Numero }).IsUnique();
            e.HasOne<Conversa>().WithOne().HasForeignKey<Chamado>(x => x.ConversaId);
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.SolicitanteId);
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.ResponsavelId);
            e.HasOne<Matricula>().WithMany().HasForeignKey(x => x.MatriculaId);
            e.HasOne<Setor>().WithMany().HasForeignKey(x => x.SetorId);
            e.HasOne<VersaoFluxo>().WithMany().HasForeignKey(x => x.VersaoFluxoId);
            e.HasOne<Categoria>().WithMany().HasForeignKey(x => x.CategoriaId);
            e.HasOne<Categoria>().WithMany().HasForeignKey(x => x.CategoriaOriginalId);
            e.Property(x => x.Titulo).HasMaxLength(120);
            e.Property(x => x.Resumo).HasMaxLength(500);
            e.Property(x => x.Xmin).IsRowVersion();
        });
        mb.Entity<MensagemChamado>(e =>
        {
            e.HasOne<Chamado>().WithMany(c => c.Mensagens).HasForeignKey(x => x.ChamadoId);
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.AutorId);
        });
        mb.Entity<Anexo>(e =>
        {
            e.HasOne<MensagemChamado>().WithMany(m => m.Anexos).HasForeignKey(x => x.MensagemChamadoId);
            e.Property(x => x.Hash).HasColumnType("char(64)");
            e.HasIndex(x => x.Chave).IsUnique();
        });
        mb.Entity<AnexoConversa>(e =>
        {
            e.HasOne<MensagemConversa>().WithMany(m => m.Anexos).HasForeignKey(x => x.MensagemConversaId);
            e.Property(x => x.Hash).HasColumnType("char(64)");
            e.HasIndex(x => x.Chave).IsUnique();
        });
        mb.Entity<EventoChamado>(e =>
        {
            e.HasOne<Chamado>().WithMany(c => c.Eventos).HasForeignKey(x => x.ChamadoId);
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.AtorId);
        });
        mb.Entity<RespostaPronta>(e =>
        {
            e.HasOne<Setor>().WithMany().HasForeignKey(x => x.SetorId);
            e.HasIndex(x => new { x.SetorId, x.Titulo }).IsUnique();
        });

        var configurar = GetType().GetMethod(nameof(DaInstituicao), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        foreach (var tipo in mb.Model.GetEntityTypes().Select(e => e.ClrType).Where(t => typeof(IDaInstituicao).IsAssignableFrom(t)).ToList())
            configurar.MakeGenericMethod(tipo).Invoke(this, [mb]);

        foreach (var e in mb.Model.GetEntityTypes().OrderBy(t => t.ClrType.Name, StringComparer.Ordinal).ToList())
        {
            e.SetTableName(Snake(e.ClrType.Name));
            foreach (var p in e.GetProperties()) p.SetColumnName(Snake(p.Name));
            foreach (var k in e.GetKeys()) k.SetName(Snake(k.GetName()!));
            foreach (var fk in e.GetForeignKeys()) fk.SetConstraintName(Snake(fk.GetConstraintName()!));
            foreach (var ix in e.GetIndexes()) ix.SetDatabaseName(Snake(ix.GetDatabaseName()!));
        }
    }

    void DaInstituicao<T>(ModelBuilder mb) where T : class, IDaInstituicao
    {
        mb.Entity<T>().HasQueryFilter(e => e.InstituicaoId == InstituicaoAtual);
        mb.Entity<T>().HasOne<Instituicao>().WithMany().HasForeignKey(e => e.InstituicaoId).OnDelete(DeleteBehavior.Restrict);
    }

    public static string Snake(string nome) => Regex.Replace(nome, "([a-z0-9])([A-Z])", "$1_$2").ToLowerInvariant();

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        CarimbarInstituicao();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        CarimbarInstituicao();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    void CarimbarInstituicao()
    {
        foreach (var e in ChangeTracker.Entries<IDaInstituicao>().Where(e => e.State == EntityState.Added))
        {
            if (InstituicaoAtual is null)
                throw new InvalidOperationException("Gravação sem instituição na sessão.");
            if (e.Entity.InstituicaoId == 0)
                e.Entity.InstituicaoId = InstituicaoAtual.Value;
            else if (e.Entity.InstituicaoId != InstituicaoAtual)
                throw new InvalidOperationException("Entidade de outra instituição.");
        }
    }
}

public class OneDbDesignTime : IDesignTimeDbContextFactory<OneDb>
{
    public OneDb CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<OneDb>().UseNpgsql("Host=localhost;Database=one;Username=postgres;Password=postgres", o => o.UseVector()).Options);
}
