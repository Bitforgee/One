using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using Pgvector;

#nullable disable

namespace One.Api.Dados.Migracoes
{
    /// <inheritdoc />
    public partial class Rag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_citacao_artigo_versoes_artigo_versao_artigo_id",
                table: "citacao_artigo");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:vector", ",,");

            migrationBuilder.AddColumn<List<long>>(
                name: "trechos_buscados",
                table: "mensagem_conversa",
                type: "bigint[]",
                nullable: true);

            migrationBuilder.AlterColumn<long>(
                name: "versao_artigo_id",
                table: "citacao_artigo",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AddColumn<long>(
                name: "trecho_fonte_id",
                table: "citacao_artigo",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "documento",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    titulo = table.Column<string>(type: "text", nullable: false),
                    categoria_id = table.Column<long>(type: "bigint", nullable: false),
                    estado = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_documento", x => x.id);
                    table.ForeignKey(
                        name: "fk_documento_categoria_categoria_id",
                        column: x => x.categoria_id,
                        principalTable: "categoria",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_documento_instituicoes_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "versao_documento",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    documento_id = table.Column<long>(type: "bigint", nullable: false),
                    numero = table.Column<int>(type: "integer", nullable: false),
                    nome_arquivo = table.Column<string>(type: "text", nullable: false),
                    conteudo = table.Column<byte[]>(type: "bytea", nullable: false),
                    texto = table.Column<string>(type: "text", nullable: false),
                    paginas = table.Column<int>(type: "integer", nullable: false),
                    criada_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_versao_documento", x => x.id);
                    table.ForeignKey(
                        name: "fk_versao_documento_documento_documento_id",
                        column: x => x.documento_id,
                        principalTable: "documento",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_versao_documento_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "trecho_fonte",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    versao_artigo_id = table.Column<long>(type: "bigint", nullable: true),
                    versao_documento_id = table.Column<long>(type: "bigint", nullable: true),
                    ordem = table.Column<int>(type: "integer", nullable: false),
                    texto = table.Column<string>(type: "text", nullable: false),
                    embedding = table.Column<Vector>(type: "vector(1536)", nullable: true),
                    tentativas = table.Column<int>(type: "integer", nullable: false),
                    proxima_tentativa = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_trecho_fonte", x => x.id);
                    table.CheckConstraint("ck_trecho_fonte_uma_versao", "(versao_artigo_id IS NULL) <> (versao_documento_id IS NULL)");
                    table.ForeignKey(
                        name: "fk_trecho_fonte_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_trecho_fonte_versoes_artigo_versao_artigo_id",
                        column: x => x.versao_artigo_id,
                        principalTable: "versao_artigo",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_trecho_fonte_versoes_documento_versao_documento_id",
                        column: x => x.versao_documento_id,
                        principalTable: "versao_documento",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_citacao_artigo_trecho_fonte_id",
                table: "citacao_artigo",
                column: "trecho_fonte_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_citacao_artigo_fonte",
                table: "citacao_artigo",
                sql: "trecho_fonte_id IS NOT NULL OR versao_artigo_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_documento_categoria_id",
                table: "documento",
                column: "categoria_id");

            migrationBuilder.CreateIndex(
                name: "ix_documento_instituicao_id",
                table: "documento",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_trecho_fonte_embedding",
                table: "trecho_fonte",
                column: "embedding")
                .Annotation("Npgsql:IndexMethod", "hnsw")
                .Annotation("Npgsql:IndexOperators", new[] { "vector_cosine_ops" });

            migrationBuilder.CreateIndex(
                name: "ix_trecho_fonte_instituicao_id",
                table: "trecho_fonte",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_trecho_fonte_versao_artigo_id",
                table: "trecho_fonte",
                column: "versao_artigo_id");

            migrationBuilder.CreateIndex(
                name: "ix_trecho_fonte_versao_documento_id",
                table: "trecho_fonte",
                column: "versao_documento_id");

            migrationBuilder.CreateIndex(
                name: "ix_versao_documento_documento_id_numero",
                table: "versao_documento",
                columns: new[] { "documento_id", "numero" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_versao_documento_instituicao_id",
                table: "versao_documento",
                column: "instituicao_id");

            migrationBuilder.AddForeignKey(
                name: "fk_citacao_artigo_trechos_fonte_trecho_fonte_id",
                table: "citacao_artigo",
                column: "trecho_fonte_id",
                principalTable: "trecho_fonte",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_citacao_artigo_versoes_artigo_versao_artigo_id",
                table: "citacao_artigo",
                column: "versao_artigo_id",
                principalTable: "versao_artigo",
                principalColumn: "id");

            // door R3 e door 6: versões de documento append-only; no trecho de fonte só o embedding vazio e as tentativas mudam
            migrationBuilder.Sql("""
                CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON versao_documento FOR EACH ROW EXECUTE FUNCTION recusa_alteracao();
                CREATE FUNCTION protege_trecho_fonte() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'trecho_fonte não aceita DELETE'; END IF;
                    IF NEW.texto IS DISTINCT FROM OLD.texto OR NEW.ordem IS DISTINCT FROM OLD.ordem
                       OR NEW.versao_artigo_id IS DISTINCT FROM OLD.versao_artigo_id OR NEW.versao_documento_id IS DISTINCT FROM OLD.versao_documento_id
                       OR NEW.instituicao_id IS DISTINCT FROM OLD.instituicao_id
                       OR (OLD.embedding IS NOT NULL AND NEW.embedding IS DISTINCT FROM OLD.embedding) THEN
                        RAISE EXCEPTION 'trecho_fonte: só o embedding vazio e as tentativas podem mudar';
                    END IF;
                    RETURN NEW;
                END $$;
                CREATE TRIGGER protege_trecho BEFORE UPDATE OR DELETE ON trecho_fonte FOR EACH ROW EXECUTE FUNCTION protege_trecho_fonte();
                """);

            // os artigos que já estão ATIVO ganham o trecho da versão atual, pendente; o agendador gera o embedding
            migrationBuilder.Sql("""
                INSERT INTO trecho_fonte (instituicao_id, versao_artigo_id, ordem, texto, tentativas, proxima_tentativa)
                SELECT v.instituicao_id, v.id, 0, v.titulo || E'\n' || array_to_string(v.perguntas, E'\n') || E'\n' || v.resposta, 0, now()
                FROM versao_artigo v JOIN artigo a ON a.id = v.artigo_id
                WHERE a.estado = 'ATIVO' AND v.numero = (SELECT max(x.numero) FROM versao_artigo x WHERE x.artigo_id = v.artigo_id);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TRIGGER append_only ON versao_documento;
                DROP FUNCTION protege_trecho_fonte CASCADE;
                """);
            migrationBuilder.DropForeignKey(
                name: "fk_citacao_artigo_trechos_fonte_trecho_fonte_id",
                table: "citacao_artigo");

            migrationBuilder.DropForeignKey(
                name: "fk_citacao_artigo_versoes_artigo_versao_artigo_id",
                table: "citacao_artigo");

            migrationBuilder.DropTable(
                name: "trecho_fonte");

            migrationBuilder.DropTable(
                name: "versao_documento");

            migrationBuilder.DropTable(
                name: "documento");

            migrationBuilder.DropIndex(
                name: "ix_citacao_artigo_trecho_fonte_id",
                table: "citacao_artigo");

            migrationBuilder.DropCheckConstraint(
                name: "ck_citacao_artigo_fonte",
                table: "citacao_artigo");

            migrationBuilder.DropColumn(
                name: "trechos_buscados",
                table: "mensagem_conversa");

            migrationBuilder.DropColumn(
                name: "trecho_fonte_id",
                table: "citacao_artigo");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:vector", ",,");

            migrationBuilder.AlterColumn<long>(
                name: "versao_artigo_id",
                table: "citacao_artigo",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "fk_citacao_artigo_versoes_artigo_versao_artigo_id",
                table: "citacao_artigo",
                column: "versao_artigo_id",
                principalTable: "versao_artigo",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
