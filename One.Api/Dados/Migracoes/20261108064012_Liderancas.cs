using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace One.Api.Dados.Migracoes
{
    /// <inheritdoc />
    public partial class Liderancas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "curso_id",
                table: "setor",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "semestre",
                table: "setor",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_setor_curso_id",
                table: "setor",
                column: "curso_id");

            migrationBuilder.CreateIndex(
                name: "ux_setor_lideranca",
                table: "setor",
                columns: new[] { "instituicao_id", "curso_id", "semestre" },
                unique: true,
                filter: "curso_id IS NOT NULL AND ativo");

            migrationBuilder.AddCheckConstraint(
                name: "ck_setor_curso_e_semestre",
                table: "setor",
                sql: "(curso_id IS NULL) = (semestre IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_setor_semestre",
                table: "setor",
                sql: "semestre BETWEEN 1 AND 12");

            migrationBuilder.AddForeignKey(
                name: "fk_setor_curso_curso_id",
                table: "setor",
                column: "curso_id",
                principalTable: "curso",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_setor_curso_curso_id",
                table: "setor");

            migrationBuilder.DropIndex(
                name: "ix_setor_curso_id",
                table: "setor");

            migrationBuilder.DropIndex(
                name: "ux_setor_lideranca",
                table: "setor");

            migrationBuilder.DropCheckConstraint(
                name: "ck_setor_curso_e_semestre",
                table: "setor");

            migrationBuilder.DropCheckConstraint(
                name: "ck_setor_semestre",
                table: "setor");

            migrationBuilder.DropColumn(
                name: "curso_id",
                table: "setor");

            migrationBuilder.DropColumn(
                name: "semestre",
                table: "setor");
        }
    }
}
