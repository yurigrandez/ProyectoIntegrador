<#
.SINOPSIS
  Crea el sitio y el grupo de aplicaciones en IIS y guarda la cadena de conexión y la clave del token
  como VARIABLES DE ENTORNO del grupo de aplicaciones.

.DESCRIPCION
  - Crea el grupo de aplicaciones (sin código administrado, siempre activo) y el sitio.
  - Pide por teclado la clave del usuario de SQL Server (no se muestra ni queda en el historial).
  - Guarda en el grupo de aplicaciones (applicationHost.config, solo legible por administradores):
        ASPNETCORE_ENVIRONMENT        = Production
        ConnectionStrings__GestionContratos = Server=...;User Id=...;Password=...;
        Jwt__Key                      = clave aleatoria de 64 caracteres (se conserva al volver a ejecutar)
  - Da permisos de lectura sobre la carpeta de la aplicación y de escritura sobre logs\.
  - Inicia el sitio y comprueba /api/salud.
  Los secretos NO se escriben en web.config ni en ningún archivo de la aplicación.

.REQUISITOS
  Ejecutar en PowerShell COMO ADMINISTRADOR, con IIS y el "ASP.NET Core Hosting Bundle" (.NET 10) ya instalados,
  y los archivos publicados con publicar.ps1. El usuario SQL debe existir (CrearUsuarioSql.sql).

.EJEMPLO
  .\configurar-iis.ps1 -Destino C:\inetpub\GestionContratos -Puerto 8080 -Servidor localhost -BaseDatos dbALQUILERES -UsuarioSql gc_app
  .\configurar-iis.ps1 -Puerto 8080 -RotarClaveJwt        # vuelve a generar la clave del token (cierra todas las sesiones)
#>
#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [string]$Destino = 'C:\inetpub\GestionContratos',
    [string]$Sitio = 'GestionContratos',
    [int]$Puerto = 8080,
    [string]$Servidor = 'localhost',
    [string]$BaseDatos = 'dbALQUILERES',
    [string]$UsuarioSql = 'gc_app',
    [System.Security.SecureString]$Clave,
    [switch]$RotarClaveJwt,
    [switch]$AbrirFirewall
)

$ErrorActionPreference = 'Stop'
$ruta = 'MACHINE/WEBROOT/APPHOST'

# ---------------------------------------------------------------- comprobaciones previas
if (-not (Test-Path (Join-Path $Destino 'web.config'))) {
    throw "No hay una aplicación publicada en '$Destino' (falta web.config). Ejecute primero publicar.ps1."
}
if (-not (Test-Path "$env:windir\System32\inetsrv\aspnetcorev2.dll")) {
    throw "Falta el módulo de ASP.NET Core para IIS. Instale el '.NET 10 Hosting Bundle' (después de instalar IIS) y vuelva a intentar."
}
Import-Module WebAdministration

if (-not $Clave) { $Clave = Read-Host -Prompt "Clave de $UsuarioSql en SQL Server" -AsSecureString }
$claveTexto = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Clave))
if ($claveTexto.Contains("'") -or $claveTexto.Contains(';')) {
    throw "La clave no puede contener comillas simples ni punto y coma (rompen la cadena de conexión). Use otra clave."
}

# La conexión se prueba ANTES de tocar IIS: si falla, no se cambia nada.
$cadena = "Server=$Servidor;Database=$BaseDatos;User Id=$UsuarioSql;Password=$claveTexto;Encrypt=True;TrustServerCertificate=True;"
Write-Host 'Probando la conexión con SQL Server...' -ForegroundColor Cyan
$prueba = New-Object System.Data.SqlClient.SqlConnection($cadena)
try { $prueba.Open() } catch { throw "No se pudo conectar a SQL Server con ese usuario: $($_.Exception.Message)" } finally { $prueba.Dispose() }
Write-Host '  conexión correcta.' -ForegroundColor Green

# ---------------------------------------------------------------- variables de entorno del grupo de aplicaciones
function Obtener-VariablePool([string]$pool, [string]$nombre) {
    $filtro = "system.applicationHost/applicationPools/add[@name='$pool']/environmentVariables/add[@name='$nombre']"
    $elemento = Get-WebConfigurationProperty -PSPath $ruta -Filter $filtro -Name 'value' -ErrorAction SilentlyContinue
    if ($elemento -is [string]) { return $elemento }
    if ($elemento -and $elemento.Value) { return [string]$elemento.Value }
    return $null
}

function Guardar-VariablePool([string]$pool, [string]$nombre, [string]$valor) {
    $coleccion = "system.applicationHost/applicationPools/add[@name='$pool']/environmentVariables"
    if ($null -ne (Obtener-VariablePool $pool $nombre)) {
        Clear-WebConfiguration -PSPath $ruta -Filter "$coleccion/add[@name='$nombre']"
    }
    Add-WebConfigurationProperty -PSPath $ruta -Filter $coleccion -Name '.' -Value @{ name = $nombre; value = $valor }
}

# ---------------------------------------------------------------- grupo de aplicaciones
Write-Host "Configurando el grupo de aplicaciones '$Sitio'..." -ForegroundColor Cyan
if (-not (Test-Path "IIS:\AppPools\$Sitio")) { New-WebAppPool -Name $Sitio | Out-Null }
$pool = "IIS:\AppPools\$Sitio"
Set-ItemProperty $pool -Name managedRuntimeVersion -Value ''                      # sin código administrado: ASP.NET Core se hospeda solo
Set-ItemProperty $pool -Name processModel.identityType -Value 'ApplicationPoolIdentity'
Set-ItemProperty $pool -Name startMode -Value 'AlwaysRunning'                      # la tarea de vencimientos necesita que la aplicación siga viva
Set-ItemProperty $pool -Name processModel.idleTimeout -Value ([TimeSpan]::Zero)    # sin apagado por inactividad

Guardar-VariablePool $Sitio 'ASPNETCORE_ENVIRONMENT' 'Production'
Guardar-VariablePool $Sitio 'ConnectionStrings__GestionContratos' $cadena

$claveJwt = Obtener-VariablePool $Sitio 'Jwt__Key'
if ($RotarClaveJwt -or [string]::IsNullOrWhiteSpace($claveJwt)) {
    $bytes = New-Object byte[] 48
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $claveJwt = [Convert]::ToBase64String($bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=')
    Guardar-VariablePool $Sitio 'Jwt__Key' $claveJwt
    Write-Host '  clave del token generada (no se muestra).' -ForegroundColor Green
}
else {
    Write-Host '  se conserva la clave del token existente (use -RotarClaveJwt para cambiarla).'
}
$claveTexto = $null; $cadena = $null; $claveJwt = $null

# ---------------------------------------------------------------- sitio
Write-Host "Configurando el sitio '$Sitio' en el puerto $Puerto..." -ForegroundColor Cyan
if (-not (Test-Path "IIS:\Sites\$Sitio")) {
    New-Website -Name $Sitio -PhysicalPath $Destino -ApplicationPool $Sitio -Port $Puerto | Out-Null
}
else {
    Set-ItemProperty "IIS:\Sites\$Sitio" -Name physicalPath -Value $Destino
    Set-ItemProperty "IIS:\Sites\$Sitio" -Name applicationPool -Value $Sitio
}

# ---------------------------------------------------------------- permisos
$logs = Join-Path $Destino 'logs'
if (-not (Test-Path $logs)) { New-Item -ItemType Directory -Path $logs | Out-Null }
$cuenta = "IIS AppPool\$Sitio"
& icacls $Destino /grant "${cuenta}:(OI)(CI)RX" /T /Q | Out-Null
& icacls $logs /grant "${cuenta}:(OI)(CI)M" /Q | Out-Null

if ($AbrirFirewall) {
    $regla = "GestionContratos puerto $Puerto"
    if (-not (Get-NetFirewallRule -DisplayName $regla -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $regla -Direction Inbound -Protocol TCP -LocalPort $Puerto -Action Allow | Out-Null
    }
}

# ---------------------------------------------------------------- inicio y comprobación
if ((Get-WebAppPoolState $Sitio).Value -ne 'Started') { Start-WebAppPool $Sitio }
if ((Get-WebsiteState $Sitio).Value -ne 'Started') { Start-Website $Sitio }
Start-Sleep -Seconds 3

Write-Host ''
try {
    $respuesta = Invoke-RestMethod -Uri "http://localhost:$Puerto/api/salud" -TimeoutSec 60
    Write-Host "  /api/salud: estado=$($respuesta.estado), baseDatos=$($respuesta.baseDatos)" -ForegroundColor Green
    Write-Host "  Abra http://localhost:$Puerto en el navegador." -ForegroundColor Green
}
catch {
    Write-Host "  /api/salud no respondió: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host '  Revise el Visor de eventos (Windows > Aplicación) o active stdout en web.config (ver 02_Instalacion_IIS.md, sección Problemas).'
}

Write-Host ''
Write-Host 'Variables guardadas en el grupo de aplicaciones (solo nombres):'
Get-WebConfiguration -PSPath $ruta -Filter "system.applicationHost/applicationPools/add[@name='$Sitio']/environmentVariables/add" |
    ForEach-Object { Write-Host ("  - " + $_.name) }
