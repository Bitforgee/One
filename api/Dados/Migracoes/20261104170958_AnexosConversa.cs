using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace One.Api.Dados.Migracoes
{
    /// <inheritdoc />
    public partial class AnexosConversa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "anexo_conversa",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    mensagem_conversa_id = table.Column<long>(type: "bigint", nullable: false),
                    nome = table.Column<string>(type: "text", nullable: false),
                    tipo = table.Column<string>(type: "text", nullable: false),
                    tamanho = table.Column<long>(type: "bigint", nullable: false),
                    chave = table.Column<string>(type: "text", nullable: false),
                    hash = table.Column<string>(type: "char(64)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_anexo_conversa", x => x.id);
                    table.ForeignKey(
                        name: "fk_anexo_conversa_instituicoes_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_anexo_conversa_mensagens_conversa_mensagem_conversa_id",
                        column: x => x.mensagem_conversa_id,
                        principalTable: "mensagem_conversa",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_anexo_conversa_chave",
                table: "anexo_conversa",
                column: "chave",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_anexo_conversa_instituicao_id",
                table: "anexo_conversa",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_anexo_conversa_mensagem_conversa_id",
                table: "anexo_conversa",
                column: "mensagem_conversa_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "anexo_conversa");
        }
    }
}
