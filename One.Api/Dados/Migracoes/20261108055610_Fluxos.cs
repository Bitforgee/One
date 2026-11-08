using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace One.Api.Dados.Migracoes
{
    /// <inheritdoc />
    public partial class Fluxos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "etapa_desde",
                table: "chamado",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "etapa_ordem",
                table: "chamado",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "versao_fluxo_id",
                table: "chamado",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "fluxo",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    categoria_id = table.Column<long>(type: "bigint", nullable: false),
                    curso_id = table.Column<long>(type: "bigint", nullable: true),
                    semestre = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_fluxo", x => x.id);
                    table.CheckConstraint("ck_fluxo_semestre", "semestre BETWEEN 1 AND 12");
                    table.CheckConstraint("ck_fluxo_semestre_com_curso", "semestre IS NULL OR curso_id IS NOT NULL");
                    table.ForeignKey(
                        name: "fk_fluxo_categoria_categoria_id",
                        column: x => x.categoria_id,
                        principalTable: "categoria",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_fluxo_curso_curso_id",
                        column: x => x.curso_id,
                        principalTable: "curso",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_fluxo_instituicoes_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "versao_fluxo",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    fluxo_id = table.Column<long>(type: "bigint", nullable: false),
                    numero = table.Column<int>(type: "integer", nullable: false),
                    publicada_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_versao_fluxo", x => x.id);
                    table.ForeignKey(
                        name: "fk_versao_fluxo_fluxo_fluxo_id",
                        column: x => x.fluxo_id,
                        principalTable: "fluxo",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_versao_fluxo_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "etapa_fluxo",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    versao_fluxo_id = table.Column<long>(type: "bigint", nullable: false),
                    ordem = table.Column<int>(type: "integer", nullable: false),
                    destino = table.Column<string>(type: "text", nullable: false),
                    setor_id = table.Column<long>(type: "bigint", nullable: true),
                    prazo_horas = table.Column<int>(type: "integer", nullable: true),
                    pos_x = table.Column<double>(type: "double precision", nullable: true),
                    pos_y = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_etapa_fluxo", x => x.id);
                    table.CheckConstraint("ck_etapa_fluxo_ordem", "ordem BETWEEN 1 AND 5");
                    table.CheckConstraint("ck_etapa_fluxo_posicao", "(pos_x IS NULL) = (pos_y IS NULL)");
                    table.CheckConstraint("ck_etapa_fluxo_prazo", "prazo_horas IS NULL OR prazo_horas BETWEEN 1 AND 720");
                    table.ForeignKey(
                        name: "fk_etapa_fluxo_instituicoes_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_etapa_fluxo_setores_setor_id",
                        column: x => x.setor_id,
                        principalTable: "setor",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_etapa_fluxo_versoes_fluxo_versao_fluxo_id",
                        column: x => x.versao_fluxo_id,
                        principalTable: "versao_fluxo",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_chamado_versao_fluxo_id",
                table: "chamado",
                column: "versao_fluxo_id");

            migrationBuilder.CreateIndex(
                name: "ix_etapa_fluxo_instituicao_id",
                table: "etapa_fluxo",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_etapa_fluxo_setor_id",
                table: "etapa_fluxo",
                column: "setor_id");

            migrationBuilder.CreateIndex(
                name: "ix_etapa_fluxo_versao_fluxo_id_ordem",
                table: "etapa_fluxo",
                columns: new[] { "versao_fluxo_id", "ordem" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_fluxo_categoria_id",
                table: "fluxo",
                column: "categoria_id");

            migrationBuilder.CreateIndex(
                name: "ix_fluxo_curso_id",
                table: "fluxo",
                column: "curso_id");

            migrationBuilder.CreateIndex(
                name: "ux_fluxo_abrangencia",
                table: "fluxo",
                columns: new[] { "instituicao_id", "categoria_id", "curso_id", "semestre" },
                unique: true)
                .Annotation("Npgsql:NullsDistinct", false);

            migrationBuilder.CreateIndex(
                name: "ix_versao_fluxo_fluxo_id_numero",
                table: "versao_fluxo",
                columns: new[] { "fluxo_id", "numero" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_versao_fluxo_instituicao_id",
                table: "versao_fluxo",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ux_versao_rascunho",
                table: "versao_fluxo",
                column: "fluxo_id",
                unique: true,
                filter: "publicada_em IS NULL");

            migrationBuilder.AddForeignKey(
                name: "fk_chamado_versoes_fluxo_versao_fluxo_id",
                table: "chamado",
                column: "versao_fluxo_id",
                principalTable: "versao_fluxo",
                principalColumn: "id");

            // door 4: cada regra por categoria vira um fluxo para todos os cursos, com a versão 1 publicada e uma etapa; os chamados antigos ficam fora de fluxo
            migrationBuilder.Sql(@"
                INSERT INTO fluxo (instituicao_id, categoria_id)
                SELECT instituicao_id, categoria_id FROM regra_roteamento;

                INSERT INTO versao_fluxo (instituicao_id, fluxo_id, numero, publicada_em)
                SELECT instituicao_id, id, 1, now() FROM fluxo;

                INSERT INTO etapa_fluxo (instituicao_id, versao_fluxo_id, ordem, destino, setor_id)
                SELECT r.instituicao_id, v.id, 1, r.destino, r.setor_id
                FROM regra_roteamento r
                JOIN fluxo f ON f.instituicao_id = r.instituicao_id AND f.categoria_id = r.categoria_id
                JOIN versao_fluxo v ON v.fluxo_id = f.id;");

            migrationBuilder.DropTable(
                name: "regra_roteamento");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "regra_roteamento",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    categoria_id = table.Column<long>(type: "bigint", nullable: false),
                    destino = table.Column<string>(type: "text", nullable: false),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    setor_id = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_regra_roteamento", x => x.id);
                    table.ForeignKey(
                        name: "fk_regra_roteamento_categoria_categoria_id",
                        column: x => x.categoria_id,
                        principalTable: "categoria",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_regra_roteamento_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_regra_roteamento_setores_setor_id",
                        column: x => x.setor_id,
                        principalTable: "setor",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_regra_roteamento_categoria_id",
                table: "regra_roteamento",
                column: "categoria_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_regra_roteamento_instituicao_id",
                table: "regra_roteamento",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_regra_roteamento_setor_id",
                table: "regra_roteamento",
                column: "setor_id");

            // volta: a versão vigente de cada fluxo para todos os cursos vira a regra da categoria (a primeira etapa)
            migrationBuilder.Sql(@"
                INSERT INTO regra_roteamento (instituicao_id, categoria_id, destino, setor_id)
                SELECT f.instituicao_id, f.categoria_id, e.destino, e.setor_id
                FROM fluxo f
                JOIN versao_fluxo v ON v.fluxo_id = f.id AND v.numero = (SELECT max(numero) FROM versao_fluxo WHERE fluxo_id = f.id AND publicada_em IS NOT NULL)
                JOIN etapa_fluxo e ON e.versao_fluxo_id = v.id AND e.ordem = 1
                WHERE f.curso_id IS NULL AND f.semestre IS NULL;");

            migrationBuilder.DropForeignKey(
                name: "fk_chamado_versoes_fluxo_versao_fluxo_id",
                table: "chamado");

            migrationBuilder.DropTable(
                name: "etapa_fluxo");

            migrationBuilder.DropTable(
                name: "versao_fluxo");

            migrationBuilder.DropTable(
                name: "fluxo");

            migrationBuilder.DropIndex(
                name: "ix_chamado_versao_fluxo_id",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "etapa_desde",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "etapa_ordem",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "versao_fluxo_id",
                table: "chamado");
        }
    }
}
