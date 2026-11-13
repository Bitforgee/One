# Ajudante das provas de checks.md (refatoracao-back-limpa). Uso: pwsh -NoProfile -File provas.ps1 <modo> [parametros]
# Sai 0 quando a afirmacao do modo vale e 1 quando nao vale. Roda na raiz do repositorio (D:\one-system).
param(
    [Parameter(Mandatory, Position = 0)][string]$Modo,
    [string]$Padrao, [string]$Caminho, [string]$Excluir,
    [int]$Esperado = -1, [int]$Min = 0, [int]$Max = 0,
    [string]$Base = '97524d1', [string]$Rev = '.', [string]$Regra, [string[]]$Nomes,
    [string]$Justificativa, [string]$Tipo = 'static class', [string]$Arquivo = 'One.Api.Tests/ArquiteturaTests.cs',
    [switch]$Seco
)
$ErrorActionPreference = 'Stop'
$Nomes = @($Nomes | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
Set-Location (git rev-parse --show-toplevel)
$checks = '.specs/features/refatoracao-back-limpa/checks.md'

function Falha($msg) { Write-Host "FALHA: $msg"; exit 1 }
function Ok($msg) { Write-Host "OK: $msg"; exit 0 }

function Fontes($caminho) {
    foreach ($c in ($caminho -split ',')) {
        if (Test-Path $c -PathType Container) {
            Get-ChildItem $c -Recurse -Filter *.cs | Where-Object { $_.FullName -notmatch '\\(bin|obj|Migracoes|wwwroot)\\' }
        } elseif (Test-Path $c) { Get-Item $c }
    }
}

function TextoDoArquivo($rev, $arquivo) {
    if ($rev -eq '.') { return Get-Content $arquivo -Raw -Encoding utf8 }
    return (git show "${rev}:${arquivo}") -join "`n"
}

function CampoDaLista($texto, $regra) {
    $m = [regex]::Match($texto, "(?s)static readonly string\[\]\s+Excecoes_$regra\s*=\s*\[(.*?)\]\s*;")
    if (-not $m.Success) { return $null }
    return $m
}

function ItensDaLista($m) {
    [regex]::Matches($m.Groups[1].Value, '"((?:[^"\\]|\\.)*)"') | ForEach-Object { $_.Groups[1].Value }
}

switch ($Modo) {
    'nomes' {
        $filtros = [regex]::Matches((Get-Content $checks -Raw -Encoding utf8), 'FullyQualifiedName[~=]([A-Za-z0-9_.]+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
        $lista = dotnet test One.Api.Tests --no-build --list-tests 2>&1 | Where-Object { $_ -match '^\s+One\.Api\.Tests\.' }
        $faltam = $filtros | Where-Object { $f = $_; -not ($lista | Where-Object { $_ -like "*$f*" }) }
        Write-Host "$($filtros.Count) nomes em checks.md, $($lista.Count) testes listados"
        if ($faltam) { $faltam | ForEach-Object { Write-Host "  sem teste: $_" }; Falha "$(@($faltam).Count) nome(s) sem teste (filtro vazio sairia 0 e nao provaria nada)" }
        Ok 'todo filtro de checks.md lista ao menos um teste'
    }
    'contagem' {
        $n = @(dotnet test One.Api.Tests --no-build --list-tests 2>&1 | Where-Object { $_ -match '^\s+One\.Api\.Tests\.' }).Count
        if ($n -lt $Min) { Falha "$n casos de teste, minimo $Min" }
        Ok "$n casos de teste (minimo $Min)"
    }
    'sem-skip' {
        $n = @(git diff $Base -- One.Api.Tests | Where-Object { $_ -match '^\+' -and $_ -notmatch '^\+\+\+' -and $_ -match 'Skip\s*=|\[Ignore|Explicit\s*=|Skip\(' }).Count
        if ($n -ne 0) { Falha "$n linha(s) adicionada(s) com Skip/Ignore/Explicit desde $Base" }
        Ok "nenhum Skip/Ignore/Explicit adicionado desde $Base"
    }
    'migracoes' {
        git diff --exit-code --quiet $Base -- One.Api/Dados/Migracoes
        if ($LASTEXITCODE -ne 0) { Falha "One.Api/Dados/Migracoes difere de $Base" }
        $novos = @(git ls-files -o --exclude-standard One.Api/Dados/Migracoes)
        if ($novos.Count -ne 0) { Falha "arquivo novo em Migracoes: $($novos -join ', ')" }
        Ok "Migracoes e OneDbModelSnapshot.cs identicos a $Base, nenhum arquivo novo"
    }
    'modelo' {
        dotnet ef migrations has-pending-model-changes --project One.Api
        if ($LASTEXITCODE -ne 0) { Falha 'ha mudanca de modelo sem migration' }
        Ok 'modelo sem mudanca pendente'
    }
    'retratos' {
        $cinco = 'rotas','erros','sucessos','gravacoes','importacao' | ForEach-Object { "One.Api.Tests/Retratos/$_.txt" }
        git diff --exit-code --quiet $Base -- @cinco
        if ($LASTEXITCODE -ne 0) { Falha "um dos 5 retratos originais difere de $Base" }
        $n = @(Get-Content One.Api.Tests/Retratos/rotas.txt).Count
        if ($n -ne 93) { Falha "rotas.txt tem $n linhas, esperado 93" }
        Ok '5 retratos originais identicos ao base, rotas.txt com 93 linhas'
    }
    'grep' {
        $excluir = $Excluir
        $n = 0
        foreach ($f in (Fontes $Caminho)) {
            if ($excluir -and $f.FullName -match $excluir) { continue }
            $n += @(Select-String -Path $f.FullName -Pattern $Padrao).Count
        }
        if ($Esperado -ge 0 -and $n -ne $Esperado) { Falha "$n ocorrencias de /$Padrao/ em $Caminho, esperado $Esperado" }
        if ($Max -gt 0 -and $n -gt $Max) { Falha "$n ocorrencias de /$Padrao/ em $Caminho, maximo $Max" }
        if ($Min -gt 0 -and $n -lt $Min) { Falha "$n ocorrencias de /$Padrao/ em $Caminho, minimo $Min" }
        Ok "$n ocorrencias de /$Padrao/ em $Caminho"
    }
    'linhas' {
        $ruins = foreach ($c in ($Caminho -split ',')) {
            $achados = @(Get-ChildItem $c -File -ErrorAction SilentlyContinue)
            if ($achados.Count -eq 0) { "$c (nao existe)"; continue }
            foreach ($a in $achados) { $n = @(Get-Content $a.FullName).Count; if ($n -gt $Max) { "$($a.Name) ($n linhas)" } }
        }
        if ($ruins) { Falha "acima de $Max linhas ou ausente: $($ruins -join '; ')" }
        Ok "todos com no maximo $Max linhas: $Caminho"
    }
    'existe' {
        $presentes = @(($Caminho -split ',') | Where-Object { Test-Path $_ })
        $total = ($Caminho -split ',').Count
        if ($Esperado -eq 0 -and $presentes.Count -ne 0) { Falha "ainda existe: $($presentes -join ', ')" }
        if ($Esperado -ne 0 -and $presentes.Count -ne $total) { Falha "faltam arquivos; presentes $($presentes.Count) de $total" }
        Ok "$($presentes.Count) de $total presentes"
    }
    'definido-uma-vez' {
        $erros = foreach ($nome in $Nomes) {
            $achados = foreach ($f in (Fontes 'One.Api')) {
                if ($Excluir -and $f.FullName -match $Excluir) { continue }
                if (Select-String -Path $f.FullName -Pattern "$Tipo\s+$nome\b" -Quiet) { $f.FullName }
            }
            if (@($achados).Count -ne 1) { "$nome definido em $(@($achados).Count) arquivo(s)" }
        }
        if ($erros) { Falha ($erros -join '; ') }
        Ok "$(@($Nomes).Count) nomes definidos exatamente uma vez fora de /$Excluir/"
    }
    'lista' {
        $m = CampoDaLista (TextoDoArquivo $Rev $Arquivo) $Regra
        if (-not $m) { Falha "Excecoes_$Regra nao existe em $Arquivo@$Rev" }
        $itens = @(ItensDaLista $m)
        if ($Justificativa) {
            $texto = Get-Content $Justificativa -Raw -Encoding utf8
            $sem = $itens | Where-Object { $texto -notmatch [regex]::Escape($_) }
            if ($sem) { Falha "Excecoes_$Regra tem $($itens.Count) item(ns); sem justificativa em ${Justificativa}: $($sem -join ', ')" }
            Ok "Excecoes_$Regra tem $($itens.Count) item(ns), todos justificados"
        }
        if ($Esperado -ge 0 -and $itens.Count -ne $Esperado) { Falha "Excecoes_$Regra tem $($itens.Count) item(ns), esperado $Esperado" }
        if ($Max -gt 0 -and $itens.Count -gt $Max) { Falha "Excecoes_$Regra tem $($itens.Count) item(ns), maximo $Max" }
        Ok "Excecoes_$Regra tem $($itens.Count) item(ns)"
    }
    'lista-contem' {
        $itens = @(ItensDaLista (CampoDaLista (TextoDoArquivo $Rev $Arquivo) $Regra))
        $faltam = $Nomes | Where-Object { $n = $_; -not ($itens | Where-Object { $_ -eq $n -or $_ -like "*.$n" }) }
        if ($faltam) { Falha "Excecoes_$Regra sem: $($faltam -join ', ')" }
        Ok "Excecoes_$Regra contem os $(@($Nomes).Count) nomes"
    }
    'lista-sem' {
        $itens = @(ItensDaLista (CampoDaLista (TextoDoArquivo $Rev $Arquivo) $Regra))
        $tem = $Nomes | Where-Object { $n = $_; $itens | Where-Object { $_ -eq $n -or $_ -like "*.$n" } }
        if ($tem) { Falha "Excecoes_$Regra ainda lista: $($tem -join ', ')" }
        Ok "Excecoes_$Regra nao lista nenhum dos $(@($Nomes).Count) nomes"
    }
    'listas-encolhem' {
        $antes = TextoDoArquivo $Base $Arquivo
        $agora = TextoDoArquivo '.' $Arquivo
        $campos = [regex]::Matches($antes, 'static readonly string\[\]\s+Excecoes_(\w+)') | ForEach-Object { $_.Groups[1].Value }
        if (@($campos).Count -lt 11) { Falha "$Base tem $(@($campos).Count) listas Excecoes_*, esperado ao menos 11" }
        $erros = foreach ($r in $campos) {
            $b = @(ItensDaLista (CampoDaLista $antes $r))
            $mAgora = CampoDaLista $agora $r
            if (-not $mAgora) { "Excecoes_$r sumiu"; continue }
            $novos = @(ItensDaLista $mAgora) | Where-Object { $b -notcontains $_ }
            if ($novos) { "Excecoes_$r ganhou: $($novos -join ', ')" }
        }
        if ($erros) { Falha ($erros -join '; ') }
        Ok "$(@($campos).Count) listas Excecoes_* so perderam linhas desde $Base"
    }
    'ratchet-falha' {
        $texto = TextoDoArquivo '.' $Arquivo
        $m = CampoDaLista $texto $Regra
        if (-not $m) { Falha "Excecoes_$Regra nao existe" }
        $corpo = $m.Groups[1].Value
        $itens = [regex]::Matches($corpo, '"((?:[^"\\]|\\.)*)"')
        $mutacoes = @{}
        $mutacoes['acrescenta-falso'] = if ($corpo.Trim()) { '"__falso__", ' + $corpo.TrimStart() } else { '"__falso__"' }
        if ($itens.Count -gt 0) {
            $semPrimeiro = $corpo.Remove($itens[0].Index, $itens[0].Length) -replace '^\s*,\s*', ''
            $mutacoes['remove-o-primeiro'] = $semPrimeiro
        }
        foreach ($nome in $mutacoes.Keys) {
            $novo = $texto.Substring(0, $m.Groups[1].Index) + $mutacoes[$nome] + $texto.Substring($m.Groups[1].Index + $m.Groups[1].Length)
            if ($Seco) { Write-Host "[$nome] Excecoes_$Regra = [$($mutacoes[$nome].Trim())]"; continue }
            $wt = Join-Path $env:TEMP ("wt-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
            git worktree add --detach $wt HEAD | Out-Null
            try {
                Set-Content (Join-Path $wt $Arquivo) $novo -Encoding utf8 -NoNewline
                $saida = dotnet test (Join-Path $wt 'One.Api.Tests') --filter "FullyQualifiedName~ArquiteturaTests.$Regra" 2>&1
                $codigo = $LASTEXITCODE
                if ($codigo -eq 0 -or -not ($saida | Select-String 'Com falha|Failed')) { Falha "mutacao '$nome' em Excecoes_$Regra sobreviveu (exit $codigo)" }
                Write-Host "mutacao '$nome' pega: exit $codigo"
            } finally { git worktree remove --force $wt | Out-Null }
        }
        Ok "regra $Regra pega as mutacoes"
    }
    'asserts-intactos' {
        $ruins = foreach ($c in ($Caminho -split ',')) {
            $removidas = @(git diff $Base -- $c | Where-Object { $_ -match '^-' -and $_ -notmatch '^---' -and $_ -match 'Assert\.' })
            if ($removidas.Count -gt 0) { "$c ($($removidas.Count) linha(s) de Assert alterada(s) ou removida(s))" }
        }
        if ($ruins) { Falha ($ruins -join '; ') }
        Ok "nenhuma linha de Assert removida ou alterada desde $Base em $Caminho"
    }
    { $_ -in 'pares', 'pares-ausentes', 'pares-presentes', 'pares-novos' } {
        function Pares($texto) {
            $m = [regex]::Match($texto, '(?s)ReferenciasEntreFatias\s*=\s*\[(.*?)\]\s*;')
            [regex]::Matches($m.Groups[1].Value, '\("(\w+)",\s*"(\w+)"\)') | ForEach-Object { "$($_.Groups[1].Value)>$($_.Groups[2].Value)" } | Sort-Object -Unique
        }
        $agora = @(Pares (TextoDoArquivo '.' $Arquivo))
        if ($Modo -eq 'pares') {
            if ($Max -gt 0 -and $agora.Count -gt $Max) { Falha "$($agora.Count) pares, maximo $Max" }
            if ($Esperado -ge 0 -and $agora.Count -ne $Esperado) { Falha "$($agora.Count) pares, esperado $Esperado" }
            if ($Tipo -eq 'inversos') {
                $inv = $agora | Where-Object { $a, $b = $_ -split '>'; $agora -contains "$b>$a" }
                if ($inv) { Falha "pares com inverso listado: $($inv -join ', ')" }
            }
            Ok "$($agora.Count) pares"
        }
        if ($Modo -eq 'pares-ausentes') { $tem = $Nomes | Where-Object { $agora -contains $_ }; if ($tem) { Falha "pares ainda listados: $($tem -join ', ')" }; Ok 'pares ausentes' }
        if ($Modo -eq 'pares-presentes') { $faltam = $Nomes | Where-Object { $agora -notcontains $_ }; if ($faltam) { Falha "pares faltando: $($faltam -join ', ')" }; Ok 'pares presentes' }
        $antes = @(Pares (TextoDoArquivo $Base $Arquivo))
        $novos = @($agora | Where-Object { $antes -notcontains $_ })
        $esperados = @($Nomes)
        if ((($novos | Sort-Object) -join ",") -ne (($esperados | Sort-Object) -join ",")) { Falha "pares novos desde ${Base}: [$($novos -join ', ')], esperado [$($esperados -join ', ')]" }
        Ok "pares novos desde ${Base}: [$($novos -join ', ')]"
    }
    'todos-com' {
        $ruins = foreach ($f in (Fontes $Caminho)) {
            if (-not (Select-String -Path $f.FullName -Pattern $Padrao -Quiet)) { continue }
            if (-not (Select-String -Path $f.FullName -Pattern $Tipo -Quiet)) { $f.Name }
        }
        if ($ruins) { Falha "arquivos com /$Padrao/ sem /$Tipo/: $($ruins -join ', ')" }
        Ok "todo arquivo com /$Padrao/ tem /$Tipo/"
    }
    'logs-agendador' {
        function Modelos($texto) { [regex]::Matches($texto, 'log\.Log(?:Information|Warning|Error)\((?:\w+,\s*)?"((?:[^"\\]|\\.)*)"') | ForEach-Object { $_.Groups[1].Value } | Sort-Object }
        $doBase = @(Modelos ((git show "${Base}:One.Api/Agendador.cs") -join "`n"))
        $arquivos = @(Fontes 'One.Api' | Where-Object { $_.Name -eq 'Agendador.cs' -or (Select-String -Path $_.FullName -Pattern 'ITarefaAgendada' -Quiet) })
        $agora = @($arquivos | ForEach-Object { Modelos (Get-Content $_.FullName -Raw -Encoding utf8) } | Sort-Object)
        Write-Host "base: $($doBase.Count) modelos; agora: $($agora.Count) em $($arquivos.Count) arquivo(s)"
        if ($doBase.Count -ne 11) { Falha "esperava 11 modelos de log no Agendador.cs de $Base, achei $($doBase.Count)" }
        if ((($doBase | Sort-Object) -join "|") -ne (($agora | Sort-Object) -join "|")) { Falha 'os modelos de log diferem do base' }
        Ok '11 modelos de log identicos ao base'
    }
    default { Falha "modo desconhecido: $Modo" }
}
