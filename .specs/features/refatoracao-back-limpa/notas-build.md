# Notas do build para o Verificador

## Lote A (S1 e S2)

Primeiro commit do lote: `PlataformaTests.InstituicaoAtual_so_onde_ja_era_e_na_plataforma` falhava na linha de base (809/810) so no Linux, porque `Directory.EnumerateFiles` nao devolve os arquivos ordenados e a lista esperada e ordenada. Foi acrescentado `.OrderBy(p => p, StringComparer.Ordinal)` na enumeracao do teste; a lista esperada, o conjunto de arquivos e a asserção nao mudaram. Depois disso a suite da base passa 810/810 no container.
