<#
.SYNOPSIS
    Stop hook: refuses to end a turn that changed code without a passing verification.

.DESCRIPTION
    This is the mechanism behind the claim that verification defines "done".
    Without it, that claim is a sentence in AGENTS.md and rests entirely on the
    model remembering to act on it.

    It blocks only when all of these hold:
      - the project has a verifier (.claude/scripts/verify.ps1);
      - the source fingerprint changed since the session started;
      - no recorded verification matches the current sources with tests run.

    Exit codes:
      0  allow the turn to end
      2  block; stderr is fed back to Claude as the reason

    Deliberate restraint:

      * It blocks ONCE. When `stop_hook_active` is set, Claude is already
        continuing because of this hook, so it steps aside and lets the agent
        decide. Claude Code independently caps consecutive blocks at 8; relying
        on that cap instead of stopping voluntarily would burn eight turns.

      * It fails OPEN on every error, on a missing verifier, on a missing
        baseline, and on an unchanged fingerprint. A gate that fires on sessions
        which changed nothing gets removed, and a removed gate guarantees
        nothing.

      * A run with -SkipTests does not satisfy it. A partial verification must
        not answer a question that means "the tests pass".
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

function Exit-Allow {
    exit 0
}

function Exit-Block {
    param(
        # AllowEmptyString is required: a mandatory [string[]] rejects empty
        # elements, and these messages use blank lines for readability. Without
        # it the call throws, the outer catch fails open, and the gate silently
        # never fires.
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string[]]$Lines
    )

    [Console]::Error.Write(($Lines -join [Environment]::NewLine))
    exit 2
}

try {
    $raw = [Console]::In.ReadToEnd()

    $projectRoot = $env:CLAUDE_PROJECT_DIR
    $stopHookActive = $false

    if ($raw) {
        $payload = $raw | ConvertFrom-Json

        if ($payload.cwd) {
            $projectRoot = [string]$payload.cwd
        }

        if ($payload.PSObject.Properties["stop_hook_active"]) {
            $stopHookActive = [bool]$payload.stop_hook_active
        }
    }

    # Already nudged once this turn. Saying it again would only repeat itself.
    if ($stopHookActive) {
        Exit-Allow
    }

    if (-not $projectRoot -or -not (Test-Path -LiteralPath $projectRoot)) {
        Exit-Allow
    }

    $scriptsDirectory = Join-Path $projectRoot (Join-Path ".claude" "scripts")
    $verifyScript = Join-Path $scriptsDirectory "verify.ps1"
    $module = Join-Path $scriptsDirectory "VerifyCommon.psm1"

    # No verifier means nothing to enforce. Not this hook's business.
    if (-not (Test-Path -LiteralPath $verifyScript)) {
        Exit-Allow
    }

    if (-not (Test-Path -LiteralPath $module)) {
        Exit-Allow
    }

    Import-Module $module -Force

    $stateDirectory = Join-Path $projectRoot (Join-Path ".claude" "state")
    $baselineFile = Join-Path $stateDirectory "session-baseline.json"

    # Without a baseline there is no way to know whether this session changed
    # anything, and guessing would mean blocking read-only sessions.
    if (-not (Test-Path -LiteralPath $baselineFile)) {
        Exit-Allow
    }

    $baseline = Get-Content -LiteralPath $baselineFile -Raw | ConvertFrom-Json
    $current = Get-SourceFingerprint -ProjectRoot $projectRoot

    # Nothing changed: there is nothing to verify.
    if ($current -eq $baseline.fingerprint) {
        Exit-Allow
    }

    $stateFile = Get-VerificationStateFile -ProjectRoot $projectRoot

    if (Test-Path -LiteralPath $stateFile) {

        $state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json

        if ($state.fingerprint -eq $current) {

            if ($state.testsRan) {
                Exit-Allow
            }

            Exit-Block -Lines @(
                "The code changed in this session and the last verification skipped the tests.",
                "",
                "Run the full verification before finishing:",
                "",
                "  .\.claude\scripts\verify.ps1",
                "",
                "-SkipTests does not satisfy this gate. If the tests cannot run, say so",
                "explicitly rather than reporting the work as complete."
            )
        }

        Exit-Block -Lines @(
            "The code changed since the last passing verification.",
            "",
            "Run it again before finishing:",
            "",
            "  .\.claude\scripts\verify.ps1",
            "",
            "If it fails for reasons outside this task's scope, say so and name the",
            "failures. Do not weaken a test or narrow the verification to make it pass."
        )
    }

    Exit-Block -Lines @(
        "This session changed code, and the verification has not been run.",
        "",
        "Run it before finishing:",
        "",
        "  .\.claude\scripts\verify.ps1",
        "",
        "A task is not complete while its verification is failing or unrun. If you",
        "believe verification does not apply here, say why rather than skipping it",
        "silently."
    )
}
catch {
    # Fail open: never block work because the gate itself broke.
    Exit-Allow
}
