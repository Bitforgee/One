"""Checks C1-C36 of .specs/features/documento-requisitos-abnt/checks.md.

Run one check: python -m unittest discover -s docs/requisitos -p test_documento.py -k <name>
"""

import contextlib
import io
import re
import subprocess
import unicodedata
import unittest
from pathlib import Path
from unittest import mock
from xml.etree import ElementTree

import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Cm, Pt
from docx.table import Table
from docx.text.paragraph import Paragraph

import gerar

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
DOCX = AQUI / "One_Levantamento_e_Requisitos.docx"
PDF = AQUI / "One_Levantamento_e_Requisitos.pdf"
SPEC = RAIZ / "specs" / "mvp-business-rules" / "requirements.md"
DIAGRAMAS = AQUI / "diagramas"
CONTEUDO = AQUI / "conteudo.md"

TIMES = "Times New Roman"
NATUREZA = (
    "Trabalho apresentado à disciplina de Projeto Extensionista Integrador, do Curso Superior de "
    "Tecnologia em Análise e Desenvolvimento de Sistemas (Análise e Desenvolvimento de Sistemas) do "
    "UNIVAG, como requisito parcial para obtenção de nota semestral."
)
AUTORES = [
    "Alfredo Pinto de Souza Neto",
    "David El Hage de Oliveira",
    "Gustavo Henrique Rondon Melo",
    "Marco Antônio Rodrigues Menezes",
    "João Henrique Queiroz Mitsuyuki",
]
SECOES_N1 = [
    "1 INTRODUÇÃO",
    "2 LEVANTAMENTO DE REQUISITOS",
    "3 VISÃO GERAL DO PRODUTO",
    "4 REQUISITOS DO PRODUTO",
    "5 DOCUMENTAÇÃO DAS FUNCIONALIDADES",
    "6 CONSIDERAÇÕES FINAIS",
    "REFERÊNCIAS",
]
CAMPOS_UC = [
    "Identificador",
    "Atores",
    "Pré-condições",
    "Fluxo principal",
    "Fluxos alternativos",
    "Pós-condições",
    "RFs relacionados",
]


def limpo(texto):
    return re.sub(r"[  ]+", " ", texto).strip()


def sem_acento(texto):
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def texto_xml(elemento):
    """Text of an element in document order, tabs included - field results live in plain runs."""
    partes = []
    for no in elemento.iter(qn("w:t"), qn("w:tab")):
        partes.append("\t" if no.tag == qn("w:tab") else (no.text or ""))
    return limpo("".join(partes))


def texto_tabela(tabela):
    return [[texto_xml(celula._tc) for celula in linha.cells] for linha in tabela.rows]


def fonte_efetiva(documento, estilo):
    """Font a paragraph style renders with: its chain, then the document defaults."""
    # why: Word drops a style's rFonts when it equals docDefaults, so the chain alone can end empty.
    while estilo is not None:
        if estilo.font.name is not None:
            return estilo.font.name
        estilo = estilo.base_style
    padrao = documento.styles.element.find(qn("w:docDefaults")).find(".//" + qn("w:rFonts"))
    return None if padrao is None else padrao.get(qn("w:ascii"))


def alinhamento_efetivo(paragrafo):
    # why: Word drops a paragraph's jc when it equals its style's, so read the style chain too.
    if paragrafo.alignment is not None:
        return paragrafo.alignment
    estilo = paragrafo.style
    while estilo is not None and estilo.paragraph_format.alignment is None:
        estilo = estilo.base_style
    return None if estilo is None else estilo.paragraph_format.alignment


def estilo_titulo(paragrafo):
    nome = paragrafo.style.name if paragrafo.style is not None else ""
    m = re.match(r"Heading (\d)$", nome)
    return int(m.group(1)) if m else None


class Documento(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = docx.Document(str(DOCX))
        cls.blocos = list(cls.doc.iter_inner_content())
        # invariant: a paragraph whose pPr carries a sectPr closes a section; the body's last
        # sectPr closes the final one.
        cls.secao_de = {}
        indice = 0
        for bloco in cls.blocos:
            cls.secao_de[id(bloco)] = indice
            if isinstance(bloco, Paragraph) and bloco._p.find(qn("w:pPr") + "/" + qn("w:sectPr")) is not None:
                indice += 1
        cls.titulos = [
            (estilo_titulo(b), texto_xml(b._p))
            for b in cls.blocos
            if isinstance(b, Paragraph) and estilo_titulo(b)
        ]

    # --- helpers -------------------------------------------------------------------------

    def paragrafos_da_secao(self, indice):
        return [
            texto_xml(b._p)
            for b in self.blocos
            if isinstance(b, Paragraph) and self.secao_de[id(b)] == indice and texto_xml(b._p)
        ]

    def blocos_sob(self, titulo_n1):
        """Blocks after a level-1 heading, up to the next level-1 heading."""
        dentro, saida = False, []
        for b in self.blocos:
            if isinstance(b, Paragraph) and estilo_titulo(b) == 1:
                if dentro:
                    break
                dentro = texto_xml(b._p) == titulo_n1
                continue
            if dentro:
                saida.append(b)
        self.assertTrue(saida, f"section {titulo_n1!r} not found or empty")
        return saida

    def texto_sob(self, titulo_n1):
        partes = []
        for b in self.blocos_sob(titulo_n1):
            if isinstance(b, Paragraph):
                partes.append(texto_xml(b._p))
            else:
                partes.extend(" | ".join(linha) for linha in texto_tabela(b))
        return "\n".join(partes)

    def unidades_sob(self, titulo_n1):
        """Paragraphs and table rows, each as one string."""
        unidades = []
        for b in self.blocos_sob(titulo_n1):
            if isinstance(b, Paragraph):
                unidades.append(texto_xml(b._p))
            else:
                unidades.extend(" | ".join(linha) for linha in texto_tabela(b))
        return unidades

    def subtitulos(self, titulo_n1):
        nomes = []
        for b in self.blocos_sob(titulo_n1):
            if isinstance(b, Paragraph) and estilo_titulo(b) == 2:
                nomes.append(re.sub(r"^\d+\.\d+\s+", "", texto_xml(b._p)).casefold())
        return nomes

    def tabela_por_cabecalho(self, cabecalho):
        for b in self.blocos:
            if isinstance(b, Table) and texto_tabela(b)[0] == cabecalho:
                return texto_tabela(b)
        self.fail(f"no table with header {cabecalho}")

    def tabelas_uc(self):
        tabelas = []
        for b in self.blocos:
            if isinstance(b, Table):
                linhas = texto_tabela(b)
                if linhas and linhas[0] and linhas[0][0] == "Identificador":
                    tabelas.append({linha[0]: linha[-1] for linha in linhas})
        return tabelas

    def texto_completo(self):
        partes = [texto_xml(b._p) if isinstance(b, Paragraph) else
                  " ".join(" ".join(linha) for linha in texto_tabela(b)) for b in self.blocos]
        for secao in self.doc.sections:
            partes.extend(texto_xml(p._p) for p in secao.header.paragraphs)
        return "\n".join(partes)

    def referencias(self):
        return [
            texto_xml(b._p)
            for b in self.blocos_sob("REFERÊNCIAS")
            if isinstance(b, Paragraph) and texto_xml(b._p)
        ]

    # --- S1 ------------------------------------------------------------------------------

    def test_saidas_existem(self):  # C1
        self.assertTrue(DOCX.read_bytes().startswith(b"PK"), "docx missing or not a zip package")
        self.assertTrue(PDF.read_bytes().startswith(b"%PDF"), "pdf missing or not a PDF")

    def _sem_ferramenta(self, node, word, nome, edge=True):  # C2
        antes = (DOCX.read_bytes(), PDF.read_bytes())
        saida = io.StringIO()
        with mock.patch.object(gerar, "node_disponivel", return_value=node), \
                mock.patch.object(gerar, "edge_disponivel", return_value=edge), \
                mock.patch.object(gerar, "word_disponivel", return_value=word), \
                contextlib.redirect_stdout(saida), contextlib.redirect_stderr(saida):
            codigo = gerar.main()
        self.assertEqual(codigo, 1)
        self.assertIn(nome, saida.getvalue())
        self.assertEqual((DOCX.read_bytes(), PDF.read_bytes()), antes)

    def test_sem_node_sai_1(self):  # C2
        self._sem_ferramenta(node=False, word=True, nome="Node.js")

    def test_sem_edge_sai_1(self):  # C2
        self._sem_ferramenta(node=True, word=True, nome="Edge", edge=False)

    def test_sem_word_sai_1(self):  # C2
        self._sem_ferramenta(node=True, word=False, nome="Word")

    def test_falha_no_meio_sai_1(self):  # C2
        antes = (DOCX.read_bytes(), PDF.read_bytes())
        saida = io.StringIO()
        falha = subprocess.CalledProcessError(1, "draw.io")
        with mock.patch.object(gerar, "node_disponivel", return_value=True), \
                mock.patch.object(gerar, "edge_disponivel", return_value=True), \
                mock.patch.object(gerar, "word_disponivel", return_value=True), \
                mock.patch.object(gerar, "obter_drawio", return_value=Path("draw.io.exe")), \
                mock.patch.object(gerar, "renderizar", side_effect=falha), \
                contextlib.redirect_stdout(saida), contextlib.redirect_stderr(saida):
            codigo = gerar.main()
        self.assertEqual(codigo, 1)
        self.assertIn("Falha ao gerar o documento", saida.getvalue())
        self.assertEqual((DOCX.read_bytes(), PDF.read_bytes()), antes)

    def test_logo_na_capa(self):  # C37
        capa = [b for b in self.blocos if isinstance(b, Paragraph) and self.secao_de[id(b)] == 0]
        com_imagem = [i for i, b in enumerate(capa) if b._p.find(".//" + qn("w:drawing")) is not None]
        self.assertEqual(len(com_imagem), 1, "capa must carry exactly one picture")
        instituicao = next(i for i, b in enumerate(capa) if texto_xml(b._p) == "UNIVAG - CENTRO UNIVERSITÁRIO")
        self.assertLess(com_imagem[0], instituicao, "logo must come before the institution name")
        self.assertEqual(alinhamento_efetivo(capa[com_imagem[0]]), WD_ALIGN_PARAGRAPH.CENTER)
        blip = capa[com_imagem[0]]._p.find(".//" + qn("a:blip"))
        imagem = self.doc.part.related_parts[blip.get(qn("r:embed"))].blob
        self.assertEqual(imagem, (AQUI / "logo_univag.png").read_bytes())

    def test_margens_a4(self):  # C3
        tolerancia = Cm(0.01)
        for n, secao in enumerate(self.doc.sections):
            for medida, esperado in (
                (secao.page_width, Cm(21)), (secao.page_height, Cm(29.7)),
                (secao.top_margin, Cm(3)), (secao.left_margin, Cm(3)),
                (secao.bottom_margin, Cm(2)), (secao.right_margin, Cm(2)),
            ):
                self.assertLessEqual(abs(medida - esperado), tolerancia, f"section {n}")

    def test_fonte_times_12(self):  # C4
        normal = self.doc.styles["Normal"]
        self.assertEqual(fonte_efetiva(self.doc, normal), TIMES)
        self.assertEqual(normal.font.size, Pt(12))
        paragrafos = [b for b in self.blocos if isinstance(b, Paragraph)]
        for b in self.blocos:
            if isinstance(b, Table):
                for linha in b.rows:
                    for celula in linha.cells:
                        paragrafos.extend(celula.paragraphs)
        for p in paragrafos:
            self.assertEqual(fonte_efetiva(self.doc, p.style), TIMES, f"style {p.style.name}")
            for run in p.runs:
                self.assertIn(run.font.name, (None, TIMES), f"run in {p.text[:40]!r}")

    def test_espacamento(self):  # C5
        formato = self.doc.styles["Normal"].paragraph_format
        self.assertEqual(formato.line_spacing, 1.5)
        self.assertEqual(formato.space_after, Pt(12))
        for b in self.blocos:
            if isinstance(b, Paragraph) and b.style.name == "Normal" and texto_xml(b._p):
                self.assertIn(b.paragraph_format.line_spacing, (None, 1.5), texto_xml(b._p)[:40])
                self.assertIn(b.paragraph_format.space_after, (None, Pt(12)), texto_xml(b._p)[:40])

    def test_paginacao(self):  # C6
        secoes = self.doc.sections
        self.assertGreaterEqual(len(secoes), 3)

        def tem_page(secao):
            return bool(re.search(r"\bPAGE\b", "".join(p._p.xml for p in secao.header.paragraphs)))

        self.assertFalse(tem_page(secoes[0]), "capa shows a page number")
        self.assertFalse(tem_page(secoes[1]), "pre-textual pages show a page number")
        inicio = secoes[1]._sectPr.find(qn("w:pgNumType"))
        self.assertIsNotNone(inicio)
        self.assertEqual(inicio.get(qn("w:start")), "1")
        self.assertIn("RESUMO", self.paragrafos_da_secao(1))
        self.assertIn("SUMÁRIO", self.paragrafos_da_secao(1))
        self.assertIn(NATUREZA, self.paragrafos_da_secao(1))
        self.assertEqual(self.paragrafos_da_secao(2)[0], "1 INTRODUÇÃO")
        textual = secoes[2]
        self.assertFalse(textual.header.is_linked_to_previous)
        self.assertTrue(tem_page(textual), "textual section has no PAGE field")
        alinhamentos = [p.alignment for p in textual.header.paragraphs if re.search(r"\bPAGE\b", p._p.xml)]
        self.assertEqual(alinhamentos, [WD_ALIGN_PARAGRAPH.RIGHT])
        reinicio = textual._sectPr.find(qn("w:pgNumType"))
        self.assertTrue(reinicio is None or reinicio.get(qn("w:start")) is None)

    def test_capa(self):  # C7
        esperado = [
            "UNIVAG - CENTRO UNIVERSITÁRIO",
            "CURSO SUPERIOR DE TECNOLOGIA EM ANÁLISE E DESENVOLVIMENTO DE SISTEMAS",
            *AUTORES,
            "ONE: ATENDIMENTO ACADÊMICO EM UM SÓ LUGAR",
            "Levantamento e especificação de requisitos",
            "Várzea Grande - MT",
            "2026",
        ]
        capa = [b for b in self.blocos if isinstance(b, Paragraph) and self.secao_de[id(b)] == 0 and texto_xml(b._p)]
        self.assertEqual([texto_xml(b._p) for b in capa], esperado)
        for b in capa:
            self.assertEqual(alinhamento_efetivo(b), WD_ALIGN_PARAGRAPH.CENTER, texto_xml(b._p))

    def test_folha_de_rosto(self):  # C8
        folha = self.paragrafos_da_secao(1)
        self.assertIn(NATUREZA, folha)
        self.assertTrue(any(t.startswith("Orientador") and "Walderson Ryutti Shimokawa" in t for t in folha))

    def test_resumo(self):  # C9
        folha = self.paragrafos_da_secao(1)
        inicio = folha.index("RESUMO") + 1
        fim = next(i for i in range(inicio, len(folha)) if folha[i].startswith("Palavras-chave:"))
        palavras = " ".join(folha[inicio:fim]).split()
        self.assertGreater(len(palavras), 0)
        self.assertLessEqual(len(palavras), 250)
        termos = [t for t in re.split(r"[;.]", folha[fim][len("Palavras-chave:"):]) if t.strip()]
        self.assertGreaterEqual(len(termos), 3)
        self.assertLessEqual(len(termos), 5)

    def test_sumario(self):  # C10
        corpo = self.doc.element.body
        instrucoes = " ".join(i.text or "" for i in corpo.iter(qn("w:instrText")))
        self.assertRegex(instrucoes, r'TOC\s+\\o\s+"1-3"')
        entradas = [t for t in self.paragrafos_da_secao(1) if re.match(r"^1 INTRODUÇÃO\s*\t?\s*\d+$", t)]
        self.assertEqual(len(entradas), 1, "sumário has no 'INTRODUÇÃO <page>' entry")

    def test_titulos_numerados(self):  # C11
        contadores = [0, 0, 0]
        for nivel, texto in self.titulos:
            if texto == "REFERÊNCIAS":
                continue
            m = re.match(r"^(\d+(?:\.\d+)*) (.+)$", texto)
            self.assertIsNotNone(m, f"heading without number: {texto!r}")
            numeros = [int(x) for x in m.group(1).split(".")]
            self.assertEqual(len(numeros), nivel, texto)
            contadores[nivel - 1] += 1
            for i in range(nivel, 3):
                contadores[i] = 0
            self.assertEqual(numeros, contadores[:nivel], texto)
        for b in self.blocos:
            if isinstance(b, Paragraph) and estilo_titulo(b) == 1:
                texto = texto_xml(b._p)
                self.assertEqual(texto, texto.upper(), texto)
                negrito = [r.bold if r.bold is not None else b.style.font.bold for r in b.runs]
                self.assertTrue(negrito and all(negrito), texto)

    def test_dependencia_fixada(self):  # C36
        linhas = (AQUI / "requirements.txt").read_text(encoding="utf-8").split()
        self.assertIn("python-docx==1.2.0", linhas)

    # --- S2 ------------------------------------------------------------------------------

    def test_secoes_primarias(self):  # C12
        self.assertEqual([t for n, t in self.titulos if n == 1], SECOES_N1)

    def test_subsecoes_introducao(self):  # C13
        self.assertEqual(self.subtitulos("1 INTRODUÇÃO"), [s.casefold() for s in (
            "Propósito do documento", "Escopo do produto", "Premissas do projeto",
            "Convenções, termos e abreviações", "Estrutura do documento")])

    def test_subsecoes_visao(self):  # C14
        self.assertEqual(self.subtitulos("3 VISÃO GERAL DO PRODUTO"), [s.casefold() for s in (
            "Descrição do produto", "Usuários da solução", "Abrangência e soluções similares",
            "Suposições e dependências")])

    def test_subsecoes_funcionalidades(self):  # C15
        self.assertEqual(self.subtitulos("5 DOCUMENTAÇÃO DAS FUNCIONALIDADES"), [s.casefold() for s in (
            "Diagrama de casos de uso", "Especificações dos casos de uso", "Diagrama de classes",
            "Modelo conceitual", "Modelo lógico")])

    def test_levantamento(self):  # C16
        texto = self.texto_sob("2 LEVANTAMENTO DE REQUISITOS")
        baixo = texto.casefold()
        for tecnica in ("entrevista", "duas sessões", "pesquisa de mercado", "análise documental"):
            self.assertIn(tecnica, baixo)
        for valor in ("171", "70", "15", "256", "50%", "30%", "5 h", "3 h", "10 min", "30 min", "60 min"):
            self.assertRegex(texto, r"(?<![\d,.])" + re.escape(valor) + r"(?![\d])", valor)

    def test_valores_a_confirmar(self):  # C17
        unidades = self.unidades_sob("2 LEVANTAMENTO DE REQUISITOS")
        horas = [u for u in unidades if re.search(r"(?<!\d)5 h\b", u) and re.search(r"(?<!\d)3 h\b", u)]
        emails = [u for u in unidades if re.search(r"(?<!\d)83 e-mails", u)]
        self.assertTrue(horas, "no unit carries the 5 h / 3 h figure")
        self.assertTrue(emails, "no unit carries the 83 e-mails figure")
        for u in horas + emails:
            self.assertIn("a confirmar", u, u[:80])

    def test_entrevistada_anonima(self):  # C18
        texto = self.texto_completo()
        self.assertIn("coordenadora dos cursos de tecnologia", texto)
        self.assertNotIn("alessandra", texto.casefold())

    def test_quadro_rf(self):  # C19
        linhas = self.tabela_por_cabecalho(["ID", "Requisito", "Origem"])[1:]
        ids = [linha[0] for linha in linhas]
        self.assertTrue(ids)
        for i in ids:
            self.assertRegex(i, r"^RF-\d{2}$")
        self.assertEqual(len(ids), len(set(ids)))

    def test_rastreio_regras(self):  # C20
        spec = SPEC.read_text(encoding="utf-8")
        regras = re.findall(r"^- \*\*(BR-[A-I]\d+)\*\*", spec, re.MULTILINE)
        transicoes = re.findall(r"^\| (F\d) \|", spec, re.MULTILINE)
        self.assertEqual((len(regras), len(transicoes)), (44, 9))
        origens = " ".join(linha[2] for linha in self.tabela_por_cabecalho(["ID", "Requisito", "Origem"])[1:])
        citados = set(re.findall(r"BR-[A-I]\d+", origens)) | set(re.findall(r"(?<![\w-])F\d\b", origens))
        faltando = [i for i in regras + transicoes if i not in citados]
        self.assertEqual(faltando, [], f"spec ids not traced to any RF: {faltando}")

    def test_quadro_rnf(self):  # C21
        linhas = self.tabela_por_cabecalho(["ID", "Categoria", "Requisito", "Fonte"])[1:]
        ids = [linha[0] for linha in linhas]
        self.assertTrue(ids)
        for i in ids:
            self.assertRegex(i, r"^RNF-\d{2}$")
        self.assertEqual(len(ids), len(set(ids)))

    def test_rnf_stack(self):  # C22
        linhas = [" ".join(l) for l in self.tabela_por_cabecalho(["ID", "Categoria", "Requisito", "Fonte"])[1:]]
        self.assertTrue(any(all(t in l for t in ("PWA", "React", "ASP.NET Core", "REST")) for l in linhas))

    def test_rnf_aviso_ia(self):  # C23
        linhas = [" ".join(l) for l in self.tabela_por_cabecalho(["ID", "Categoria", "Requisito", "Fonte"])[1:]]
        self.assertTrue(any(
            "aviso" in l and "provedor externo" in l and re.search(r"anexos[^.]*n(ão|unca)[^.]*enviad", l)
            for l in linhas))

    def test_premissas(self):  # C24
        tabela = self.tabela_por_cabecalho(["Questão", "Tema", "Premissa adotada", "Situação"])
        por_id = {linha[0]: " ".join(linha) for linha in tabela[1:]}
        for n in range(5, 20):
            self.assertIn(f"Q{n}", por_id)
            self.assertIn("a confirmar com a coordenação", por_id[f"Q{n}"], f"Q{n}")

    def test_especificacoes_uc(self):  # C25
        tabelas = self.tabelas_uc()
        self.assertTrue(tabelas)
        for t in tabelas:
            for campo in CAMPOS_UC:
                self.assertIn(campo, t, f"{t.get('Identificador')} lacks {campo}")
                self.assertTrue(t[campo], f"{t.get('Identificador')} has empty {campo}")
            self.assertRegex(t["Identificador"], r"^UC-\d{2}$")

    def test_uc_diagrama_especificacao(self):  # C26
        fonte = (DIAGRAMAS / "casos_de_uso.drawio").read_text(encoding="utf-8")
        no_diagrama = set(re.findall(r"\bUC-\d{2}\b", fonte))
        no_documento = {t["Identificador"] for t in self.tabelas_uc()}
        self.assertTrue(no_diagrama)
        self.assertEqual(sorted(no_diagrama - no_documento), [], "in the diagram without a specification")
        self.assertEqual(sorted(no_documento - no_diagrama), [], "specified but not in the diagram")

    def test_rf_em_casos_de_uso(self):  # C27
        ids = {linha[0] for linha in self.tabela_por_cabecalho(["ID", "Requisito", "Origem"])[1:]}
        citados = set()
        for t in self.tabelas_uc():
            citados |= set(re.findall(r"RF-\d{2}", t["RFs relacionados"]))
        self.assertEqual(sorted(ids - citados), [], "RFs cited by no use case")

    def test_consideracoes_finais(self):  # C28
        texto = self.texto_sob("6 CONSIDERAÇÕES FINAIS")
        self.assertIn("em aberto", texto)
        for data in ("27/10", "30/10", "13/11", "20/11", "27/11"):
            self.assertIn(data, texto)

    # --- S3 ------------------------------------------------------------------------------

    def test_figuras(self):  # C29
        textuais = [b for b in self.blocos if isinstance(b, Paragraph) and self.secao_de[id(b)] >= 2]
        self.assertEqual(sum(len(b._p.findall(".//" + qn("w:drawing"))) for b in textuais), 4)
        temas = ["casos de uso", "classes", "conceitual", "lógico"]
        encontradas = 0
        for i, b in enumerate(self.blocos):
            if self.secao_de[id(b)] < 2:
                continue
            if isinstance(b, Paragraph) and b._p.find(".//" + qn("w:drawing")) is not None:
                encontradas += 1
                legenda = texto_xml(self.blocos[i - 1]._p)
                m = re.match(r"^Figura (\d) – (.+)$", legenda)
                self.assertIsNotNone(m, legenda)
                self.assertEqual(int(m.group(1)), encontradas)
                self.assertIn(temas[encontradas - 1], m.group(2).casefold())
                self.assertEqual(texto_xml(self.blocos[i + 1]._p), "Fonte: elaborado pelos autores (2026).")
        self.assertEqual(encontradas, 4)

    def test_quadros(self):  # C30
        numero = 0
        for i, b in enumerate(self.blocos):
            if isinstance(b, Table):
                numero += 1
                anterior, seguinte = self.blocos[i - 1], self.blocos[i + 1]
                self.assertIsInstance(anterior, Paragraph)
                self.assertRegex(texto_xml(anterior._p), rf"^Quadro {numero} – .+")
                self.assertIsInstance(seguinte, Paragraph)
                self.assertTrue(texto_xml(seguinte._p).startswith("Fonte:"), f"Quadro {numero}")
        self.assertGreater(numero, 0)

    def test_figuras_tem_fonte(self):  # C31
        figuras = re.findall(r"!\[[^\]]*\]\(diagramas/([^)]+)\.png\)", CONTEUDO.read_text(encoding="utf-8"))
        self.assertEqual(len(figuras), 4)
        for nome in figuras:
            fontes = [f for f in (DIAGRAMAS / f"{nome}.mmd", DIAGRAMAS / f"{nome}.drawio") if f.is_file()]
            self.assertEqual(len(fontes), 1, nome)

    def test_modelo_conceitual_logico(self):  # C32
        def normal(nomes):
            return {sem_acento(n).lower().replace("_", "") for n in nomes}

        celulas = ElementTree.parse(DIAGRAMAS / "modelo_conceitual.drawio").getroot().iter("mxCell")
        # invariant: entities are the all-caps vertices; relationships share the casing but are rhombi.
        conceitual = normal(c.get("value") for c in celulas if c.get("vertex") == "1"
                            and re.fullmatch(r"[A-Z_]+", c.get("value") or "")
                            and "rhombus" not in (c.get("style") or ""))
        logico = normal(re.findall(r"^\s*(\w+)\s*\{", (DIAGRAMAS / "modelo_logico.mmd").read_text(encoding="utf-8"),
                                   re.MULTILINE))
        self.assertTrue(conceitual)
        self.assertEqual(sorted(conceitual - logico), [], "conceptual entities with no table")

    def test_citacoes_referencias(self):  # C33
        refs = self.referencias()
        corpo = "\n".join(
            texto_xml(b._p) if isinstance(b, Paragraph) else " ".join(" ".join(l) for l in texto_tabela(b))
            for b in self.blocos if not (isinstance(b, Paragraph) and texto_xml(b._p) in refs))
        citacoes = set(re.findall(r"\(([A-ZÀ-Ý][A-ZÀ-Ý&.\- ]*?),\s*(\d{4})[a-z]?\)", corpo))
        self.assertTrue(citacoes)
        for autor, ano in citacoes:
            self.assertTrue(any(r.upper().startswith(autor) and ano in r for r in refs), f"({autor}, {ano})")
        for r in refs:
            self.assertTrue(any(r.upper().startswith(a) and ano in r for a, ano in citacoes), r[:60])

    def test_referencias_ordem(self):  # C34
        refs = self.referencias()
        chave = [sem_acento(r).casefold() for r in refs]
        self.assertEqual(chave, sorted(chave))


if __name__ == "__main__":
    unittest.main()
