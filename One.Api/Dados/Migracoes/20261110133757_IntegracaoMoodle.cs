using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace One.Api.Dados.Migracoes
{
    /// <inheritdoc />
    public partial class IntegracaoMoodle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lti_lancamento",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    state = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    nonce = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    expira_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    usado_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_lti_lancamento", x => x.id);
                    table.ForeignKey(
                        name: "fk_lti_lancamento_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "plataforma_moodle",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    ativa = table.Column<bool>(type: "boolean", nullable: false),
                    emissor = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    client_id = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    deployment_id = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    auth_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    jwks_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_plataforma_moodle", x => x.id);
                    table.ForeignKey(
                        name: "fk_plataforma_moodle_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "vinculo_moodle",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    usuario_id = table.Column<long>(type: "bigint", nullable: false),
                    emissor = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    sub = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    criado_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_vinculo_moodle", x => x.id);
                    table.ForeignKey(
                        name: "fk_vinculo_moodle_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_vinculo_moodle_usuario_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuario",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_lti_lancamento_instituicao_id",
                table: "lti_lancamento",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_lti_lancamento_state",
                table: "lti_lancamento",
                column: "state",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_plataforma_moodle_instituicao_id",
                table: "plataforma_moodle",
                column: "instituicao_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_vinculo_moodle_instituicao_id_emissor_sub",
                table: "vinculo_moodle",
                columns: new[] { "instituicao_id", "emissor", "sub" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_vinculo_moodle_usuario_id",
                table: "vinculo_moodle",
                column: "usuario_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lti_lancamento");

            migrationBuilder.DropTable(
                name: "plataforma_moodle");

            migrationBuilder.DropTable(
                name: "vinculo_moodle");
        }
    }
}
