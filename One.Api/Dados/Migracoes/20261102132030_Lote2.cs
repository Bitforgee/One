using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace One.Api.Dados.Migracoes
{
    /// <inheritdoc />
    public partial class Lote2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_resposta_pronta_setor_id",
                table: "resposta_pronta");

            migrationBuilder.DropIndex(
                name: "ix_curso_instituicao_id",
                table: "curso");

            migrationBuilder.DropIndex(
                name: "ix_categoria_instituicao_id",
                table: "categoria");

            migrationBuilder.AddColumn<string>(
                name: "texto",
                table: "resposta_pronta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "titulo",
                table: "resposta_pronta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "autor_id",
                table: "mensagem_chamado",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "criada_em",
                table: "mensagem_chamado",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "texto",
                table: "mensagem_chamado",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "tipo",
                table: "mensagem_chamado",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "ultimo_numero_chamado",
                table: "instituicao",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<long>(
                name: "ator_id",
                table: "evento_chamado",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "criado_em",
                table: "evento_chamado",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "de",
                table: "evento_chamado",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "detalhe",
                table: "evento_chamado",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "para",
                table: "evento_chamado",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tipo",
                table: "evento_chamado",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "categoria_id",
                table: "chamado",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<long>(
                name: "categoria_original_id",
                table: "chamado",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<DateTime>(
                name: "criado_em",
                table: "chamado",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "encaminhamentos",
                table: "chamado",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "estado",
                table: "chamado",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "fechado_em",
                table: "chamado",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "matricula_id",
                table: "chamado",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "motivo_fechamento",
                table: "chamado",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "origem_categoria",
                table: "chamado",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "reaberturas",
                table: "chamado",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "resolvido_em",
                table: "chamado",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "responsavel_id",
                table: "chamado",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "resumo",
                table: "chamado",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "semestre",
                table: "chamado",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<long>(
                name: "setor_id",
                table: "chamado",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<long>(
                name: "solicitante_id",
                table: "chamado",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "titulo",
                table: "chamado",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "chamado",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.CreateIndex(
                name: "ix_setor_instituicao_id_nome",
                table: "setor",
                columns: new[] { "instituicao_id", "nome" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_resposta_pronta_setor_id_titulo",
                table: "resposta_pronta",
                columns: new[] { "setor_id", "titulo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_mensagem_chamado_autor_id",
                table: "mensagem_chamado",
                column: "autor_id");

            migrationBuilder.CreateIndex(
                name: "ix_evento_chamado_ator_id",
                table: "evento_chamado",
                column: "ator_id");

            migrationBuilder.CreateIndex(
                name: "ix_curso_instituicao_id_nome",
                table: "curso",
                columns: new[] { "instituicao_id", "nome" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_chamado_categoria_id",
                table: "chamado",
                column: "categoria_id");

            migrationBuilder.CreateIndex(
                name: "ix_chamado_categoria_original_id",
                table: "chamado",
                column: "categoria_original_id");

            migrationBuilder.CreateIndex(
                name: "ix_chamado_matricula_id",
                table: "chamado",
                column: "matricula_id");

            migrationBuilder.CreateIndex(
                name: "ix_chamado_responsavel_id",
                table: "chamado",
                column: "responsavel_id");

            migrationBuilder.CreateIndex(
                name: "ix_chamado_setor_id",
                table: "chamado",
                column: "setor_id");

            migrationBuilder.CreateIndex(
                name: "ix_chamado_solicitante_id",
                table: "chamado",
                column: "solicitante_id");

            migrationBuilder.CreateIndex(
                name: "ix_categoria_instituicao_id_nome",
                table: "categoria",
                columns: new[] { "instituicao_id", "nome" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_chamado_categoria_categoria_id",
                table: "chamado",
                column: "categoria_id",
                principalTable: "categoria",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_chamado_categoria_categoria_original_id",
                table: "chamado",
                column: "categoria_original_id",
                principalTable: "categoria",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_chamado_matriculas_matricula_id",
                table: "chamado",
                column: "matricula_id",
                principalTable: "matricula",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_chamado_setores_setor_id",
                table: "chamado",
                column: "setor_id",
                principalTable: "setor",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_chamado_usuarios_responsavel_id",
                table: "chamado",
                column: "responsavel_id",
                principalTable: "usuario",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_chamado_usuarios_solicitante_id",
                table: "chamado",
                column: "solicitante_id",
                principalTable: "usuario",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_evento_chamado_usuarios_ator_id",
                table: "evento_chamado",
                column: "ator_id",
                principalTable: "usuario",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_mensagem_chamado_usuarios_autor_id",
                table: "mensagem_chamado",
                column: "autor_id",
                principalTable: "usuario",
                principalColumn: "id");

            // door 6: histórico do chamado append-only, como mensagem_conversa e versao_artigo
            migrationBuilder.Sql("""
                CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON mensagem_chamado FOR EACH ROW EXECUTE FUNCTION recusa_alteracao();
                CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON evento_chamado FOR EACH ROW EXECUTE FUNCTION recusa_alteracao();
                CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON anexo FOR EACH ROW EXECUTE FUNCTION recusa_alteracao();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TRIGGER append_only ON mensagem_chamado;
                DROP TRIGGER append_only ON evento_chamado;
                DROP TRIGGER append_only ON anexo;
                """);
            migrationBuilder.DropForeignKey(
                name: "fk_chamado_categoria_categoria_id",
                table: "chamado");

            migrationBuilder.DropForeignKey(
                name: "fk_chamado_categoria_categoria_original_id",
                table: "chamado");

            migrationBuilder.DropForeignKey(
                name: "fk_chamado_matriculas_matricula_id",
                table: "chamado");

            migrationBuilder.DropForeignKey(
                name: "fk_chamado_setores_setor_id",
                table: "chamado");

            migrationBuilder.DropForeignKey(
                name: "fk_chamado_usuarios_responsavel_id",
                table: "chamado");

            migrationBuilder.DropForeignKey(
                name: "fk_chamado_usuarios_solicitante_id",
                table: "chamado");

            migrationBuilder.DropForeignKey(
                name: "fk_evento_chamado_usuarios_ator_id",
                table: "evento_chamado");

            migrationBuilder.DropForeignKey(
                name: "fk_mensagem_chamado_usuarios_autor_id",
                table: "mensagem_chamado");

            migrationBuilder.DropIndex(
                name: "ix_setor_instituicao_id_nome",
                table: "setor");

            migrationBuilder.DropIndex(
                name: "ix_resposta_pronta_setor_id_titulo",
                table: "resposta_pronta");

            migrationBuilder.DropIndex(
                name: "ix_mensagem_chamado_autor_id",
                table: "mensagem_chamado");

            migrationBuilder.DropIndex(
                name: "ix_evento_chamado_ator_id",
                table: "evento_chamado");

            migrationBuilder.DropIndex(
                name: "ix_curso_instituicao_id_nome",
                table: "curso");

            migrationBuilder.DropIndex(
                name: "ix_chamado_categoria_id",
                table: "chamado");

            migrationBuilder.DropIndex(
                name: "ix_chamado_categoria_original_id",
                table: "chamado");

            migrationBuilder.DropIndex(
                name: "ix_chamado_matricula_id",
                table: "chamado");

            migrationBuilder.DropIndex(
                name: "ix_chamado_responsavel_id",
                table: "chamado");

            migrationBuilder.DropIndex(
                name: "ix_chamado_setor_id",
                table: "chamado");

            migrationBuilder.DropIndex(
                name: "ix_chamado_solicitante_id",
                table: "chamado");

            migrationBuilder.DropIndex(
                name: "ix_categoria_instituicao_id_nome",
                table: "categoria");

            migrationBuilder.DropColumn(
                name: "texto",
                table: "resposta_pronta");

            migrationBuilder.DropColumn(
                name: "titulo",
                table: "resposta_pronta");

            migrationBuilder.DropColumn(
                name: "autor_id",
                table: "mensagem_chamado");

            migrationBuilder.DropColumn(
                name: "criada_em",
                table: "mensagem_chamado");

            migrationBuilder.DropColumn(
                name: "texto",
                table: "mensagem_chamado");

            migrationBuilder.DropColumn(
                name: "tipo",
                table: "mensagem_chamado");

            migrationBuilder.DropColumn(
                name: "ultimo_numero_chamado",
                table: "instituicao");

            migrationBuilder.DropColumn(
                name: "ator_id",
                table: "evento_chamado");

            migrationBuilder.DropColumn(
                name: "criado_em",
                table: "evento_chamado");

            migrationBuilder.DropColumn(
                name: "de",
                table: "evento_chamado");

            migrationBuilder.DropColumn(
                name: "detalhe",
                table: "evento_chamado");

            migrationBuilder.DropColumn(
                name: "para",
                table: "evento_chamado");

            migrationBuilder.DropColumn(
                name: "tipo",
                table: "evento_chamado");

            migrationBuilder.DropColumn(
                name: "categoria_id",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "categoria_original_id",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "criado_em",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "encaminhamentos",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "estado",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "fechado_em",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "matricula_id",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "motivo_fechamento",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "origem_categoria",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "reaberturas",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "resolvido_em",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "responsavel_id",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "resumo",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "semestre",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "setor_id",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "solicitante_id",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "titulo",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "chamado");

            migrationBuilder.CreateIndex(
                name: "ix_resposta_pronta_setor_id",
                table: "resposta_pronta",
                column: "setor_id");

            migrationBuilder.CreateIndex(
                name: "ix_curso_instituicao_id",
                table: "curso",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_categoria_instituicao_id",
                table: "categoria",
                column: "instituicao_id");
        }
    }
}
