$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$clientRoot = Join-Path $projectRoot "dist\client"
$serverRoot = Join-Path $projectRoot "dist\server"
$outputRoot = Join-Path $projectRoot "dist\pages-deploy"
$serverConfigPath = Join-Path $serverRoot "wrangler.json"

if (-not (Test-Path -LiteralPath $clientRoot) -or -not (Test-Path -LiteralPath (Join-Path $serverRoot "index.js"))) {
  throw "Esegui prima npm run build."
}

# Vinext aggiunge un binding D1 segnaposto per lo sviluppo. Quando il progetto
# possiede già il binding DB reale, Wrangler rifiuta il deploy perché i due
# binding hanno lo stesso nome. Conserviamo sempre quello configurato nel
# wrangler.json del progetto.
if (Test-Path -LiteralPath $serverConfigPath) {
  $serverConfig = Get-Content -LiteralPath $serverConfigPath -Raw -Encoding utf8 | ConvertFrom-Json
  if ($serverConfig.d1_databases) {
    $serverConfig.d1_databases = @(
      $serverConfig.d1_databases |
        Group-Object -Property binding |
        ForEach-Object {
          $_.Group |
            Sort-Object { $_.database_id -eq "00000000-0000-4000-8000-000000000000" } |
            Select-Object -First 1
        }
    )
    $serverConfig | ConvertTo-Json -Depth 100 -Compress |
      Set-Content -LiteralPath $serverConfigPath -Encoding utf8
  }
}

$resolvedDist = [System.IO.Path]::GetFullPath((Join-Path $projectRoot "dist"))
$resolvedOutput = [System.IO.Path]::GetFullPath($outputRoot)
if (-not $resolvedOutput.StartsWith($resolvedDist + [System.IO.Path]::DirectorySeparatorChar)) {
  throw "La cartella di destinazione non è contenuta in dist."
}

if (Test-Path -LiteralPath $resolvedOutput) {
  Remove-Item -LiteralPath $resolvedOutput -Recurse -Force
}
New-Item -ItemType Directory -Path $resolvedOutput | Out-Null

Get-ChildItem -LiteralPath $clientRoot -Force | Copy-Item -Destination $resolvedOutput -Recurse -Force

Get-ChildItem -LiteralPath $serverRoot -Force |
  Where-Object { $_.Name -notin @("index.js", "wrangler.json") } |
  Copy-Item -Destination $resolvedOutput -Recurse -Force

Copy-Item -LiteralPath (Join-Path $serverRoot "index.js") -Destination (Join-Path $resolvedOutput "_worker.js") -Force
Copy-Item -LiteralPath (Join-Path $serverRoot "index.js") -Destination (Join-Path $resolvedOutput "index.js") -Force

$workerExport = "export { worker_entry_default as default };"
$securedExport = @'
const quattro_regni_security_headers = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.mymemory.translated.net; font-src 'self'; manifest-src 'self'; worker-src 'self' blob:"
};
var secured_worker_default = { async fetch(request, env, ctx) {
  const response = await worker_entry_default.fetch(request, env, ctx);
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(quattro_regni_security_headers)) secured.headers.set(name, value);
  return secured;
} };
export { secured_worker_default as default };
'@

foreach ($workerName in @("_worker.js", "index.js")) {
  $workerPath = Join-Path $resolvedOutput $workerName
  $workerContent = Get-Content -LiteralPath $workerPath -Raw -Encoding utf8
  if (-not $workerContent.Contains($workerExport)) {
    throw "Impossibile applicare gli header di sicurezza al Worker."
  }
  $workerContent.Replace($workerExport, $securedExport) | Set-Content -LiteralPath $workerPath -Encoding utf8
}

# Il file di build di Vinext è una configurazione Worker, non Pages. Se resta
# registrato come redirect, `wrangler pages deploy` lo interpreta per errore e
# rifiuta il pacchetto. Il deploy deve usare il wrangler.json Pages alla radice.
if (Test-Path -LiteralPath $serverConfigPath) {
  Remove-Item -LiteralPath $serverConfigPath -Force
}
$deployRedirectPath = Join-Path $projectRoot ".wrangler\deploy\config.json"
if (Test-Path -LiteralPath $deployRedirectPath) {
  Remove-Item -LiteralPath $deployRedirectPath -Force
}
Write-Output $resolvedOutput
