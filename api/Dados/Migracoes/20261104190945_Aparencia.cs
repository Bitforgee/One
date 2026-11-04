using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace One.Api.Dados.Migracoes
{
    /// <inheritdoc />
    public partial class Aparencia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "assistente_boas_vindas",
                table: "instituicao",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "assistente_nome",
                table: "instituicao",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "assistente_perguntas",
                table: "instituicao",
                type: "text[]",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "contato_email",
                table: "instituicao",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "contato_horario",
                table: "instituicao",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "contato_telefone",
                table: "instituicao",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "cor",
                table: "instituicao",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "login_frase",
                table: "instituicao",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "login_itens",
                table: "instituicao",
                type: "text[]",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "login_titulo",
                table: "instituicao",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "nome_curto",
                table: "instituicao",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "imagem_instituicao",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    tipo = table.Column<string>(type: "text", nullable: false),
                    conteudo = table.Column<string>(type: "text", nullable: false),
                    tamanho = table.Column<long>(type: "bigint", nullable: false),
                    hash = table.Column<string>(type: "char(64)", nullable: false),
                    chave = table.Column<string>(type: "text", nullable: false),
                    versao = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_imagem_instituicao", x => x.id);
                    table.ForeignKey(
                        name: "fk_imagem_instituicao_instituicoes_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_imagem_instituicao_instituicao_id_tipo",
                table: "imagem_instituicao",
                columns: new[] { "instituicao_id", "tipo" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "imagem_instituicao");

            migrationBuilder.DropColumn(
                name: "assistente_boas_vindas",
                table: "instituicao");

            migrationBuilder.DropColumn(
                name: "assistente_nome",
                table: "instituicao");

            migrationBuilder.DropColumn(
                name: "assistente_perguntas",
                table: "instituicao");

            migrationBuilder.DropColumn(
                name: "contato_email",
                table: "instituicao");

            migrationBuilder.DropColumn(
                name: "contato_horario",
                table: "instituicao");

            migrationBuilder.DropColumn(
                name: "contato_telefone",
                table: "instituicao");

            migrationBuilder.DropColumn(
                name: "cor",
                table: "instituicao");

            migrationBuilder.DropColumn(
                name: "login_frase",
                table: "instituicao");

            migrationBuilder.DropColumn(
                name: "login_itens",
                table: "instituicao");

            migrationBuilder.DropColumn(
                name: "login_titulo",
                table: "instituicao");

            migrationBuilder.DropColumn(
                name: "nome_curto",
                table: "instituicao");
        }
    }
}
