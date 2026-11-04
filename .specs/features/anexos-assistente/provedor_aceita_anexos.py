"""C20: a OpenAI real aceita a forma da porta 3 (image_url + file com data URL) com o modelo de api/appsettings.json.

Uso: python .specs/features/anexos-assistente/provedor_aceita_anexos.py   (na raiz do repositório; faz 1 chamada paga, centavos)
Sai 0 só com HTTP 200 e choices[0].message.content não vazio; sai 1 sem LLM_CHAVE_API no .env. Nunca imprime a chave.
"""
import base64
import json
import pathlib
import struct
import sys
import urllib.error
import urllib.request
import zlib

RAIZ = pathlib.Path(__file__).resolve().parents[3]


def chave():
    for linha in (RAIZ / ".env").read_text(encoding="utf-8").splitlines() if (RAIZ / ".env").exists() else []:
        nome, _, valor = linha.partition("=")
        if nome.strip() == "LLM_CHAVE_API" and valor.strip().strip('"'):
            return valor.strip().strip('"')
    return None


def png(lado=64):
    def bloco(tipo, dados):
        corpo = tipo + dados
        return struct.pack(">I", len(dados)) + corpo + struct.pack(">I", zlib.crc32(corpo))

    linhas = b"".join(b"\x00" + b"\xc8\x32\x32" * lado for _ in range(lado))  # quadrado vermelho RGB
    return b"\x89PNG\r\n\x1a\n" + bloco(b"IHDR", struct.pack(">IIBBBBB", lado, lado, 8, 2, 0, 0, 0)) + bloco(b"IDAT", zlib.compress(linhas)) + bloco(b"IEND", b"")


def pdf():
    objetos = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length 44 >>\nstream\nBT /F1 18 Tf 20 100 Td (Teste de anexo) Tj ET\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    saida, posicoes = b"%PDF-1.4\n", []
    for n, o in enumerate(objetos, 1):
        posicoes.append(len(saida))
        saida += f"{n} 0 obj\n".encode() + o + b"\nendobj\n"
    xref = len(saida)
    saida += f"xref\n0 {len(objetos) + 1}\n0000000000 65535 f \n".encode()
    saida += b"".join(f"{p:010d} 00000 n \n".encode() for p in posicoes)
    return saida + f"trailer\n<< /Size {len(objetos) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()


def main():
    segredo = chave()
    if not segredo:
        print("LLM_CHAVE_API ausente no .env", file=sys.stderr)
        return 1
    modelo = json.loads((RAIZ / "api" / "appsettings.json").read_text(encoding="utf-8"))["Llm"]["Modelo"]
    b64 = lambda b: base64.b64encode(b).decode()
    corpo = {
        "model": modelo,
        "reasoning_effort": "none",
        "response_format": {"type": "json_object"},
        "max_completion_tokens": 200,
        "messages": [
            {"role": "system", "content": "Responda com um objeto JSON {\"resumo\": \"...\"} descrevendo em uma frase os anexos recebidos."},
            {"role": "user", "content": [
                {"type": "text", "text": "Descreva os anexos."},
                {"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64(png())}},
                {"type": "file", "file": {"filename": "anexo-1.pdf", "file_data": "data:application/pdf;base64," + b64(pdf())}},
            ]},
        ],
    }
    req = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=json.dumps(corpo).encode(), method="POST",
                                 headers={"Authorization": "Bearer " + segredo, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            status, texto = r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        # nunca o corpo: um 401 da OpenAI traz um trecho mascarado da chave
        try:
            erro = json.loads(e.read().decode()).get("error") or {}
        except ValueError:
            erro = {}
        print(f"HTTP {e.code} type={erro.get('type')} code={erro.get('code')}", file=sys.stderr)
        return 1
    except urllib.error.URLError as e:
        print(f"falha de rede: {e.reason}", file=sys.stderr)
        return 1
    conteudo = (json.loads(texto)["choices"][0]["message"].get("content") or "").strip()
    print(f"HTTP {status}, modelo {modelo}, conteudo: {conteudo[:200]!r}")
    return 0 if status == 200 and conteudo else 1


if __name__ == "__main__":
    sys.exit(main())
