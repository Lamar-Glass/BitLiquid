Set-StrictMode -Version Latest

function Test-BitLiquidCommand {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  return [bool](Get-Command -Name $Name -ErrorAction SilentlyContinue)
}

function Assert-BitLiquidCommand {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$InstallHint
  )

  if (-not (Test-BitLiquidCommand -Name $Name)) {
    throw "Required command '$Name' was not found. $InstallHint"
  }
}

function Invoke-BitLiquid {
  [CmdletBinding()]
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$BitLiquidArgs
  )

  Assert-BitLiquidCommand -Name "bitliquid" -InstallHint "Install with: npm install -g @gitlawb/bitliquid"

  & bitliquid @BitLiquidArgs

  if ($LASTEXITCODE -ne 0) {
    throw "bitliquid failed with exit code $LASTEXITCODE."
  }
}

function Invoke-BitLiquidWithEnvironment {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Environment,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$BitLiquidArgs
  )

  $previousValues = @{}

  foreach ($name in $Environment.Keys) {
    $previousValues[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
    Set-Item -Path "Env:$name" -Value $Environment[$name]
  }

  try {
    Invoke-BitLiquid @BitLiquidArgs
  }
  finally {
    foreach ($name in $Environment.Keys) {
      if ($null -eq $previousValues[$name]) {
        Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue
      }
      else {
        Set-Item -Path "Env:$name" -Value $previousValues[$name]
      }
    }
  }
}

function Get-BitLiquidQuickHelp {
  [CmdletBinding()]
  param()

  @(
    "BitLiquid quick commands:",
    "  oc [args...]              -> launch BitLiquid using the installed CLI",
    "  oc-local [args...]        -> launch BitLiquid with local/Ollama OpenAI-compatible environment hints for this invocation only",
    "  oc-fast [args...]         -> launch BitLiquid with low-latency local defaults for this invocation only",
    "  oc-provider               -> open the provider manager in BitLiquid",
    "  oc-check                  -> show Ollama install/listening/model state",
    "  oc-init                   -> pull/check the local model, then launch local/Ollama mode",
    "  oc-help                   -> show this help"
  ) -join [Environment]::NewLine
}

function oc {
  [CmdletBinding()]
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$BitLiquidArgs
  )

  Invoke-BitLiquid @BitLiquidArgs
}

function oc-local {
  [CmdletBinding()]
  param(
    [string]$Model = "llama3.1:8b",
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$BitLiquidArgs
  )

  Invoke-BitLiquidWithEnvironment `
    -Environment @{
      CLAUDE_CODE_USE_OPENAI = "1"
      OPENAI_BASE_URL        = "http://localhost:11434/v1"
      OPENAI_MODEL           = $Model
    } `
    @BitLiquidArgs
}

function oc-fast {
  [CmdletBinding()]
  param(
    [string]$Model = "llama3.1:8b",
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$BitLiquidArgs
  )

  Invoke-BitLiquidWithEnvironment `
    -Environment @{
      CLAUDE_CODE_USE_OPENAI = "1"
      OPENAI_BASE_URL        = "http://localhost:11434/v1"
      OPENAI_MODEL           = $Model
      BITLIQUID_FAST_MODE   = "1"
    } `
    @BitLiquidArgs
}

function oc-provider {
  [CmdletBinding()]
  param()

  Invoke-BitLiquid "/provider"
}

function oc-check {
  [CmdletBinding()]
  param(
    [string]$Model = "llama3.1:8b"
  )

  Assert-BitLiquidCommand -Name "ollama" -InstallHint "Install Ollama from https://ollama.com/download/windows."

  $version = & ollama --version 2>$null
  $modelNames = (& ollama list 2>$null | Select-Object -Skip 1 | ForEach-Object {
      ($_ -split "\s+")[0]
    }) | Where-Object { $_ }

  $isModelAvailable = $modelNames -contains $Model
  $probeSucceeded = $false

  try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 3
    if ($response.models) {
      $probeSucceeded = $true
    }
  }
  catch {
    $probeSucceeded = $false
  }

  [PSCustomObject]@{
    OllamaInstalled = $true
    OllamaVersion   = $version
    OllamaListening = $probeSucceeded
    Model           = $Model
    ModelAvailable  = $isModelAvailable
  }
}

function oc-init {
  [CmdletBinding()]
  param(
    [string]$Model = "llama3.1:8b",
    [switch]$SkipModelPull
  )

  Assert-BitLiquidCommand -Name "ollama" -InstallHint "Install Ollama from https://ollama.com/download/windows."

  if (-not $SkipModelPull) {
    & ollama pull $Model
    if ($LASTEXITCODE -ne 0) {
      throw "ollama pull $Model failed with exit code $LASTEXITCODE."
    }
  }

  $health = oc-check -Model $Model
  if (-not $health.OllamaListening) {
    Write-Warning "Ollama is installed but API probe to localhost:11434 did not succeed. Start Ollama and retry."
  }

  oc-local -Model $Model
}

function oc-help {
  [CmdletBinding()]
  param()

  Get-BitLiquidQuickHelp
}
