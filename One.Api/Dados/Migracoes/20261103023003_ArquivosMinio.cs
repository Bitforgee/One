using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace One.Api.Dados.Migracoes
{
    /// <inheritdoc />
    public partial class ArquivosMinio : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Não há cópia dos bytes antigos: com linha em alguma das duas tabelas a migração aborta, sem alterar nada.
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM anexo) OR EXISTS (SELECT 1 FROM versao_documento) THEN
                        RAISE EXCEPTION 'Há anexos ou PDFs guardados no banco (bytea) e a migração ArquivosMinio não os copia para o MinIO. Recrie o banco de desenvolvimento (docker compose down -v) e rode de novo.';
                    END IF;
                END $$;
                """);

            migrationBuilder.DropColumn(
                name: "conteudo",
                table: "versao_documento");

            migrationBuilder.DropColumn(
                name: "conteudo",
                table: "anexo");

            migrationBuilder.AddColumn<string>(
                name: "chave",
                table: "versao_documento",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "hash",
                table: "versao_documento",
                type: "char(64)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "tamanho",
                table: "versao_documento",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "chave",
                table: "anexo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "hash",
                table: "anexo",
                type: "char(64)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "ix_versao_documento_chave",
                table: "versao_documento",
                column: "chave",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_anexo_chave",
                table: "anexo",
                column: "chave",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_versao_documento_chave",
                table: "versao_documento");

            migrationBuilder.DropIndex(
                name: "ix_anexo_chave",
                table: "anexo");

            migrationBuilder.DropColumn(
                name: "chave",
                table: "versao_documento");

            migrationBuilder.DropColumn(
                name: "hash",
                table: "versao_documento");

            migrationBuilder.DropColumn(
                name: "tamanho",
                table: "versao_documento");

            migrationBuilder.DropColumn(
                name: "chave",
                table: "anexo");

            migrationBuilder.DropColumn(
                name: "hash",
                table: "anexo");

            migrationBuilder.AddColumn<byte[]>(
                name: "conteudo",
                table: "versao_documento",
                type: "bytea",
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<byte[]>(
                name: "conteudo",
                table: "anexo",
                type: "bytea",
                nullable: false,
                defaultValue: new byte[0]);
        }
    }
}
