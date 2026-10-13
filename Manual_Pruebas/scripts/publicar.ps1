<#
.SINOPSIS
  Compila la web (Angular) y la API (.NET) y las deja juntas en una carpeta lista para IIS.

.DESCRIPCION
  1. Compila la web de producción.
  2. Publica la API en la carpeta de destino.
  3. Copia la web dentro de la carpeta wwwroot de la API (la API la sirve: un solo sitio, un solo dominio).
  Si el sitio ya estaba instalado, lo detiene unos segundos con app_offline.htm mientras copia los archivos.
  No toca ningún secreto: la cadena de conexión y la clave del token van en variables de entorno (ver configurar-iis.ps1).

.REQUISITOS
  SDK de .NET 10 y Node.js 20.19 o superior (solo en el equipo donde se compila, no hacen falta en el servidor IIS).

.EJEMPLO
  .\publicar.ps1 -Destino C:\inetpub\GestionContratos
  .\publicar.ps1 -Destino C:\inetpub\GestionContratos -SinWeb      # solo la API
#>
[CmdletBinding()]
param(
    [string]$Destino = 'C:\inetpub\GestionContratos',
    [switch]$SinWeb
)

$ErrorActionPreference = 'Stop'
$raiz = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

function Exigir([string]$comando, [string]$ayuda) {
    if (-not (Get-Command $comando -ErrorAction SilentlyContinue)) { throw "No se encontró '$comando'. $ayuda" }
}
function Revisar([string]$paso) {
    if ($LASTEXITCODE -ne 0) { throw "Falló: $paso (código $LASTEXITCODE)." }
}

Exigir 'dotnet' 'Instale el SDK de .NET 10 (https://dot.net).'
if (-not $SinWeb) { Exigir 'npm' 'Instale Node.js 20.19 o superior (https://nodejs.org).' }

# ---------------------------------------------------------------- 1. Web
if (-not $SinWeb) {
    Write-Host '1/3 Compilando la web (Angular)...' -ForegroundColor Cyan
    $carpetaWeb = Join-Path $raiz 'Frontend\gestion-contratos'
    Push-Location $carpetaWeb
    try {
        npm ci; Revisar 'npm ci'
        npm run build; Revisar 'npm run build'
    }
    finally { Pop-Location }
    $salidaWeb = Join-Path $carpetaWeb 'dist\gestion-contratos\browser'
    if (-not (Test-Path (Join-Path $salidaWeb 'index.html'))) { throw "No se generó index.html en $salidaWeb." }
}

# ---------------------------------------------------------------- 2. API
Write-Host '2/3 Publicando la API (.NET)...' -ForegroundColor Cyan
$enLinea = Test-Path (Join-Path $Destino 'web.config')
$avisoMantenimiento = Join-Path $Destino 'app_offline.htm'
if ($enLinea) {
    # IIS reconoce app_offline.htm, detiene la aplicación y libera los archivos.
    Set-Content -Path $avisoMantenimiento -Value '<html><body style="font-family:sans-serif"><h2>Estamos actualizando la aplicación.</h2><p>Vuelva en un momento.</p></body></html>' -Encoding UTF8
    Start-Sleep -Seconds 3
}
try {
    dotnet publish (Join-Path $raiz 'Backend\GestionContratos.API\GestionContratos.API.csproj') -c Release -o $Destino --nologo
    Revisar 'dotnet publish'

    # ------------------------------------------------------------ 3. Web dentro de la API
    if (-not $SinWeb) {
        Write-Host '3/3 Copiando la web a wwwroot...' -ForegroundColor Cyan
        $wwwroot = Join-Path $Destino 'wwwroot'
        if (Test-Path $wwwroot) { Remove-Item (Join-Path $wwwroot '*') -Recurse -Force }
        else { New-Item -ItemType Directory -Path $wwwroot | Out-Null }
        Copy-Item -Path (Join-Path $salidaWeb '*') -Destination $wwwroot -Recurse
    }
}
finally {
    if (Test-Path $avisoMantenimiento) { Remove-Item $avisoMantenimiento -Force }
}

Write-Host ''
Write-Host "Listo. Archivos en: $Destino" -ForegroundColor Green
Write-Host 'Siguiente paso: configurar-iis.ps1 (ver Manual_Pruebas\02_Instalacion_IIS.md).'
