using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace One.Api.Dados.Migracoes
{
    /// <inheritdoc />
    public partial class Push : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "subscricao_push",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    usuario_id = table.Column<long>(type: "bigint", nullable: false),
                    endpoint = table.Column<string>(type: "text", nullable: false),
                    p256dh = table.Column<string>(type: "text", nullable: false),
                    auth = table.Column<string>(type: "text", nullable: false),
                    registrada_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_subscricao_push", x => x.id);
                    table.ForeignKey(
                        name: "fk_subscricao_push_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_subscricao_push_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuario",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "push_saida",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    subscricao_id = table.Column<long>(type: "bigint", nullable: false),
                    chamado_id = table.Column<long>(type: "bigint", nullable: false),
                    tentativas = table.Column<int>(type: "integer", nullable: false),
                    proxima_tentativa = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    enviado_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_push_saida", x => x.id);
                    table.ForeignKey(
                        name: "fk_push_saida_chamado_chamado_id",
                        column: x => x.chamado_id,
                        principalTable: "chamado",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_push_saida_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_push_saida_subscricoes_push_subscricao_id",
                        column: x => x.subscricao_id,
                        principalTable: "subscricao_push",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_push_saida_chamado_id",
                table: "push_saida",
                column: "chamado_id");

            migrationBuilder.CreateIndex(
                name: "ix_push_saida_instituicao_id",
                table: "push_saida",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_push_saida_subscricao_id",
                table: "push_saida",
                column: "subscricao_id");

            migrationBuilder.CreateIndex(
                name: "ix_subscricao_push_endpoint",
                table: "subscricao_push",
                column: "endpoint",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_subscricao_push_instituicao_id",
                table: "subscricao_push",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_subscricao_push_usuario_id",
                table: "subscricao_push",
                column: "usuario_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "push_saida");

            migrationBuilder.DropTable(
                name: "subscricao_push");
        }
    }
}
