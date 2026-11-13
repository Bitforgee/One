param([string]$Filtro = "", [string]$Extra = "", [string]$Projeto = "One.Api.Tests")

$raiz = (Resolve-Path "$PSScriptRoot\..\..\..").Path
$filtroArg = if ($Filtro) { "--filter `"$Filtro`"" } else { "" }

$comando = @"
set -e
mkdir -p /work
cd /src
tar --exclude=./.git --exclude=bin --exclude=obj --exclude=node_modules --exclude=./web/dist -cf - . | tar -xf - -C /work
cd /work
dotnet test $Projeto --nologo -v q $filtroArg
"@ -replace "`r", ""

docker run --rm --network host -v "${raiz}:/src:ro" -v one-nuget:/root/.nuget mcr.microsoft.com/dotnet/sdk:10.0 bash -c $comando
exit $LASTEXITCODE
