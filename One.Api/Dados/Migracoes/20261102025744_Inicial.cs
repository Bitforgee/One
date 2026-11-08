using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace One.Api.Dados.Migracoes
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "instituicao",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    slug = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    nome = table.Column<string>(type: "text", nullable: false),
                    fuso = table.Column<string>(type: "text", nullable: false),
                    ativa = table.Column<bool>(type: "boolean", nullable: false),
                    criada_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_instituicao", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "categoria",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    nome = table.Column<string>(type: "text", nullable: false),
                    ativa = table.Column<bool>(type: "boolean", nullable: false),
                    padrao = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_categoria", x => x.id);
                    table.ForeignKey(
                        name: "fk_categoria_instituicoes_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "email_saida",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    destinatario = table.Column<string>(type: "text", nullable: false),
                    assunto = table.Column<string>(type: "text", nullable: false),
                    corpo = table.Column<string>(type: "text", nullable: false),
                    tentativas = table.Column<int>(type: "integer", nullable: false),
                    proxima_tentativa = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    enviado_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_email_saida", x => x.id);
                    table.ForeignKey(
                        name: "fk_email_saida_instituicoes_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "setor",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    nome = table.Column<string>(type: "text", nullable: false),
                    triagem = table.Column<bool>(type: "boolean", nullable: false),
                    ativo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_setor", x => x.id);
                    table.ForeignKey(
                        name: "fk_setor_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "usuario",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    cpf = table.Column<string>(type: "char(11)", nullable: false),
                    nome = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    senha_hash = table.Column<string>(type: "text", nullable: true),
                    deve_trocar_senha = table.Column<bool>(type: "boolean", nullable: false),
                    ativo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_usuario", x => x.id);
                    table.ForeignKey(
                        name: "fk_usuario_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "artigo",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    categoria_id = table.Column<long>(type: "bigint", nullable: false),
                    estado = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_artigo", x => x.id);
                    table.ForeignKey(
                        name: "fk_artigo_categorias_categoria_id",
                        column: x => x.categoria_id,
                        principalTable: "categoria",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_artigo_instituicoes_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "curso",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    nome = table.Column<string>(type: "text", nullable: false),
                    setor_coordenacao_id = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_curso", x => x.id);
                    table.ForeignKey(
                        name: "fk_curso_instituicoes_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_curso_setores_setor_coordenacao_id",
                        column: x => x.setor_coordenacao_id,
                        principalTable: "setor",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "regra_roteamento",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    categoria_id = table.Column<long>(type: "bigint", nullable: false),
                    destino = table.Column<string>(type: "text", nullable: false),
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

            migrationBuilder.CreateTable(
                name: "resposta_pronta",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    setor_id = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_resposta_pronta", x => x.id);
                    table.ForeignKey(
                        name: "fk_resposta_pronta_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_resposta_pronta_setores_setor_id",
                        column: x => x.setor_id,
                        principalTable: "setor",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "atendente_setor",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    usuario_id = table.Column<long>(type: "bigint", nullable: false),
                    setor_id = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_atendente_setor", x => x.id);
                    table.ForeignKey(
                        name: "fk_atendente_setor_instituicoes_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_atendente_setor_setores_setor_id",
                        column: x => x.setor_id,
                        principalTable: "setor",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_atendente_setor_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuario",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "conversa",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    aluno_id = table.Column<long>(type: "bigint", nullable: false),
                    criada_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ultima_mensagem_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    desfecho = table.Column<string>(type: "text", nullable: true),
                    desfecho_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_conversa", x => x.id);
                    table.ForeignKey(
                        name: "fk_conversa_instituicoes_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_conversa_usuarios_aluno_id",
                        column: x => x.aluno_id,
                        principalTable: "usuario",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "token_acesso",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    usuario_id = table.Column<long>(type: "bigint", nullable: false),
                    hash = table.Column<string>(type: "char(64)", nullable: false),
                    criado_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expira_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    usado_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_token_acesso", x => x.id);
                    table.ForeignKey(
                        name: "fk_token_acesso_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_token_acesso_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuario",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "usuario_papel",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    usuario_id = table.Column<long>(type: "bigint", nullable: false),
                    papel = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_usuario_papel", x => x.id);
                    table.ForeignKey(
                        name: "fk_usuario_papel_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_usuario_papel_usuario_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuario",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "versao_artigo",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    artigo_id = table.Column<long>(type: "bigint", nullable: false),
                    numero = table.Column<int>(type: "integer", nullable: false),
                    titulo = table.Column<string>(type: "text", nullable: false),
                    perguntas = table.Column<List<string>>(type: "text[]", nullable: false),
                    resposta = table.Column<string>(type: "text", nullable: false),
                    links = table.Column<List<string>>(type: "text[]", nullable: false),
                    criada_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_versao_artigo", x => x.id);
                    table.ForeignKey(
                        name: "fk_versao_artigo_artigo_artigo_id",
                        column: x => x.artigo_id,
                        principalTable: "artigo",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_versao_artigo_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "matricula",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    usuario_id = table.Column<long>(type: "bigint", nullable: false),
                    curso_id = table.Column<long>(type: "bigint", nullable: false),
                    numero = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    semestre = table.Column<int>(type: "integer", nullable: false),
                    situacao = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_matricula", x => x.id);
                    table.ForeignKey(
                        name: "fk_matricula_curso_curso_id",
                        column: x => x.curso_id,
                        principalTable: "curso",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_matricula_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_matricula_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuario",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "chamado",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    numero = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    conversa_id = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_chamado", x => x.id);
                    table.ForeignKey(
                        name: "fk_chamado_conversas_conversa_id",
                        column: x => x.conversa_id,
                        principalTable: "conversa",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_chamado_instituicoes_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "mensagem_conversa",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    conversa_id = table.Column<long>(type: "bigint", nullable: false),
                    autor = table.Column<string>(type: "text", nullable: false),
                    texto = table.Column<string>(type: "text", nullable: false),
                    tipo_devolvido = table.Column<string>(type: "text", nullable: true),
                    tipo_final = table.Column<string>(type: "text", nullable: true),
                    modelo = table.Column<string>(type: "text", nullable: true),
                    categoria_id_sugerida = table.Column<long>(type: "bigint", nullable: true),
                    resumo = table.Column<string>(type: "text", nullable: true),
                    criada_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_mensagem_conversa", x => x.id);
                    table.ForeignKey(
                        name: "fk_mensagem_conversa_conversa_conversa_id",
                        column: x => x.conversa_id,
                        principalTable: "conversa",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_mensagem_conversa_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "evento_chamado",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    chamado_id = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_evento_chamado", x => x.id);
                    table.ForeignKey(
                        name: "fk_evento_chamado_chamado_chamado_id",
                        column: x => x.chamado_id,
                        principalTable: "chamado",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_evento_chamado_instituicoes_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "mensagem_chamado",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    chamado_id = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_mensagem_chamado", x => x.id);
                    table.ForeignKey(
                        name: "fk_mensagem_chamado_chamado_chamado_id",
                        column: x => x.chamado_id,
                        principalTable: "chamado",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_mensagem_chamado_instituicao_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "citacao_artigo",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    mensagem_conversa_id = table.Column<long>(type: "bigint", nullable: false),
                    versao_artigo_id = table.Column<long>(type: "bigint", nullable: false),
                    trechos = table.Column<List<string>>(type: "text[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_citacao_artigo", x => x.id);
                    table.ForeignKey(
                        name: "fk_citacao_artigo_instituicoes_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_citacao_artigo_mensagens_conversa_mensagem_conversa_id",
                        column: x => x.mensagem_conversa_id,
                        principalTable: "mensagem_conversa",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_citacao_artigo_versoes_artigo_versao_artigo_id",
                        column: x => x.versao_artigo_id,
                        principalTable: "versao_artigo",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "anexo",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    instituicao_id = table.Column<long>(type: "bigint", nullable: false),
                    mensagem_chamado_id = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_anexo", x => x.id);
                    table.ForeignKey(
                        name: "fk_anexo_instituicoes_instituicao_id",
                        column: x => x.instituicao_id,
                        principalTable: "instituicao",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_anexo_mensagens_chamado_mensagem_chamado_id",
                        column: x => x.mensagem_chamado_id,
                        principalTable: "mensagem_chamado",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_anexo_instituicao_id",
                table: "anexo",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_anexo_mensagem_chamado_id",
                table: "anexo",
                column: "mensagem_chamado_id");

            migrationBuilder.CreateIndex(
                name: "ix_artigo_categoria_id",
                table: "artigo",
                column: "categoria_id");

            migrationBuilder.CreateIndex(
                name: "ix_artigo_instituicao_id",
                table: "artigo",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_atendente_setor_instituicao_id",
                table: "atendente_setor",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_atendente_setor_setor_id",
                table: "atendente_setor",
                column: "setor_id");

            migrationBuilder.CreateIndex(
                name: "ix_atendente_setor_usuario_id",
                table: "atendente_setor",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "ix_categoria_instituicao_id",
                table: "categoria",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_chamado_conversa_id",
                table: "chamado",
                column: "conversa_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_chamado_instituicao_id_numero",
                table: "chamado",
                columns: new[] { "instituicao_id", "numero" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_citacao_artigo_instituicao_id",
                table: "citacao_artigo",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_citacao_artigo_mensagem_conversa_id",
                table: "citacao_artigo",
                column: "mensagem_conversa_id");

            migrationBuilder.CreateIndex(
                name: "ix_citacao_artigo_versao_artigo_id",
                table: "citacao_artigo",
                column: "versao_artigo_id");

            migrationBuilder.CreateIndex(
                name: "ix_conversa_aluno_id",
                table: "conversa",
                column: "aluno_id");

            migrationBuilder.CreateIndex(
                name: "ix_conversa_instituicao_id",
                table: "conversa",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_curso_instituicao_id",
                table: "curso",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_curso_setor_coordenacao_id",
                table: "curso",
                column: "setor_coordenacao_id");

            migrationBuilder.CreateIndex(
                name: "ix_email_saida_instituicao_id",
                table: "email_saida",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_evento_chamado_chamado_id",
                table: "evento_chamado",
                column: "chamado_id");

            migrationBuilder.CreateIndex(
                name: "ix_evento_chamado_instituicao_id",
                table: "evento_chamado",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_instituicao_slug",
                table: "instituicao",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_matricula_curso_id",
                table: "matricula",
                column: "curso_id");

            migrationBuilder.CreateIndex(
                name: "ix_matricula_instituicao_id_numero",
                table: "matricula",
                columns: new[] { "instituicao_id", "numero" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_matricula_usuario_id",
                table: "matricula",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "ix_mensagem_chamado_chamado_id",
                table: "mensagem_chamado",
                column: "chamado_id");

            migrationBuilder.CreateIndex(
                name: "ix_mensagem_chamado_instituicao_id",
                table: "mensagem_chamado",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_mensagem_conversa_conversa_id",
                table: "mensagem_conversa",
                column: "conversa_id");

            migrationBuilder.CreateIndex(
                name: "ix_mensagem_conversa_instituicao_id",
                table: "mensagem_conversa",
                column: "instituicao_id");

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

            migrationBuilder.CreateIndex(
                name: "ix_resposta_pronta_instituicao_id",
                table: "resposta_pronta",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_resposta_pronta_setor_id",
                table: "resposta_pronta",
                column: "setor_id");

            migrationBuilder.CreateIndex(
                name: "ux_setor_triagem",
                table: "setor",
                column: "instituicao_id",
                unique: true,
                filter: "triagem");

            migrationBuilder.CreateIndex(
                name: "ix_token_acesso_hash",
                table: "token_acesso",
                column: "hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_token_acesso_instituicao_id",
                table: "token_acesso",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_token_acesso_usuario_id",
                table: "token_acesso",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "ix_usuario_instituicao_id_cpf",
                table: "usuario",
                columns: new[] { "instituicao_id", "cpf" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_usuario_instituicao_id_email",
                table: "usuario",
                columns: new[] { "instituicao_id", "email" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_usuario_papel_instituicao_id",
                table: "usuario_papel",
                column: "instituicao_id");

            migrationBuilder.CreateIndex(
                name: "ix_usuario_papel_usuario_id_papel",
                table: "usuario_papel",
                columns: new[] { "usuario_id", "papel" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_versao_artigo_artigo_id_numero",
                table: "versao_artigo",
                columns: new[] { "artigo_id", "numero" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_versao_artigo_instituicao_id",
                table: "versao_artigo",
                column: "instituicao_id");

            // Door 6: histórico append-only. Door 17: slug imutável.
            migrationBuilder.Sql("""
                CREATE FUNCTION recusa_alteracao() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN RAISE EXCEPTION 'tabela % é append-only', TG_TABLE_NAME; END $$;
                CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON mensagem_conversa FOR EACH ROW EXECUTE FUNCTION recusa_alteracao();
                CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON citacao_artigo FOR EACH ROW EXECUTE FUNCTION recusa_alteracao();
                CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON versao_artigo FOR EACH ROW EXECUTE FUNCTION recusa_alteracao();
                CREATE FUNCTION recusa_troca_de_slug() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN IF NEW.slug <> OLD.slug THEN RAISE EXCEPTION 'instituicao.slug é imutável'; END IF; RETURN NEW; END $$;
                CREATE TRIGGER slug_imutavel BEFORE UPDATE ON instituicao FOR EACH ROW EXECUTE FUNCTION recusa_troca_de_slug();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP FUNCTION recusa_alteracao CASCADE; DROP FUNCTION recusa_troca_de_slug CASCADE;");
            migrationBuilder.DropTable(
                name: "anexo");

            migrationBuilder.DropTable(
                name: "atendente_setor");

            migrationBuilder.DropTable(
                name: "citacao_artigo");

            migrationBuilder.DropTable(
                name: "email_saida");

            migrationBuilder.DropTable(
                name: "evento_chamado");

            migrationBuilder.DropTable(
                name: "matricula");

            migrationBuilder.DropTable(
                name: "regra_roteamento");

            migrationBuilder.DropTable(
                name: "resposta_pronta");

            migrationBuilder.DropTable(
                name: "token_acesso");

            migrationBuilder.DropTable(
                name: "usuario_papel");

            migrationBuilder.DropTable(
                name: "mensagem_chamado");

            migrationBuilder.DropTable(
                name: "mensagem_conversa");

            migrationBuilder.DropTable(
                name: "versao_artigo");

            migrationBuilder.DropTable(
                name: "curso");

            migrationBuilder.DropTable(
                name: "chamado");

            migrationBuilder.DropTable(
                name: "artigo");

            migrationBuilder.DropTable(
                name: "setor");

            migrationBuilder.DropTable(
                name: "conversa");

            migrationBuilder.DropTable(
                name: "categoria");

            migrationBuilder.DropTable(
                name: "usuario");

            migrationBuilder.DropTable(
                name: "instituicao");
        }
    }
}
