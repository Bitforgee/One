using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace One.Api.Dados.Migracoes
{
    /// <inheritdoc />
    public partial class Lote4 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "aguardando_desde",
                table: "chamado",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "lembrete_em",
                table: "chamado",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "numero_original",
                table: "chamado",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "visivel_ate",
                table: "artigo",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "visivel_de",
                table: "artigo",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "conteudo",
                table: "anexo",
                type: "bytea",
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<string>(
                name: "nome",
                table: "anexo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "tamanho",
                table: "anexo",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "tipo",
                table: "anexo",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "aguardando_desde",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "lembrete_em",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "numero_original",
                table: "chamado");

            migrationBuilder.DropColumn(
                name: "visivel_ate",
                table: "artigo");

            migrationBuilder.DropColumn(
                name: "visivel_de",
                table: "artigo");

            migrationBuilder.DropColumn(
                name: "conteudo",
                table: "anexo");

            migrationBuilder.DropColumn(
                name: "nome",
                table: "anexo");

            migrationBuilder.DropColumn(
                name: "tamanho",
                table: "anexo");

            migrationBuilder.DropColumn(
                name: "tipo",
                table: "anexo");
        }
    }
}
