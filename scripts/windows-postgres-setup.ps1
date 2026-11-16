<#
.SYNOPSIS
  Repairs a local PostgreSQL installation on Windows so InnerVerse AI can use it.

.DESCRIPTION
  You do NOT need this for "npm run demo", which uses an embedded database.
  Use it only if you want the app to run on your installed PostgreSQL server and
  either the server is on the wrong port or you no longer know the "postgres" password.

  What it does:
    1. Sets the server port (default 5432) in postgresql.conf.
    2. Temporarily allows password-less logins from this computer only (pg_hba.conf),
       sets the "postgres" password to SQL_PASSWORD from .env, and creates the
       database named in SQL_DB_NAME if it does not exist.
    3. Puts pg_hba.conf back exactly as it was and restarts the server.

  Both files are copied to <name>.innerverse-backup before the first change.

.EXAMPLE
  Open PowerShell as Administrator, go to the project folder, then run:
    powershell -ExecutionPolicy Bypass -File scripts\windows-postgres-setup.ps1
#>
param(
  [int]$Port = 5432,
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

# Byte-for-byte safe for config files whatever their encoding, and never adds a BOM.
$Latin1 = [System.Text.Encoding]::GetEncoding(28591)

function Read-EnvFile([string]$Path) {
  $values = @{}
  foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
      $values[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
    }
  }
  return $values
}

# Returns the postgresql.conf text with its port setting replaced (or added).
function Set-PortInConfig([string]$Text, [int]$NewPort) {
  $pattern = '(?m)^[ \t]*#?[ \t]*port[ \t]*=[ \t]*\d+'
  if ($Text -match $pattern) {
    return ([regex]$pattern).Replace($Text, "port = $NewPort", 1)
  }
  return $Text.TrimEnd() + "`r`nport = $NewPort`r`n"
}

# First matching line wins in pg_hba.conf, so these two lines at the top are enough.
function Add-LocalTrust([string]$Text) {
  $trust = "# Temporary lines added by windows-postgres-setup.ps1`r`n" +
           "host all all 127.0.0.1/32 trust`r`n" +
           "host all all ::1/128 trust`r`n"
  return $trust + $Text
}

function Backup-Once([string]$Path) {
  $backup = "$Path.innerverse-backup"
  if (-not (Test-Path $backup)) { Copy-Item $Path $backup }
  return $backup
}

function Wait-ForServer([string]$Bin, [int]$OnPort) {
  for ($i = 0; $i -lt 30; $i++) {
    & "$Bin\pg_isready.exe" -h 127.0.0.1 -p $OnPort | Out-Null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Seconds 1
  }
  throw "PostgreSQL did not start listening on port $OnPort within 30 seconds."
}

function Invoke-Sql([string]$Bin, [int]$OnPort, [string]$Database, [string]$Sql) {
  $output = & "$Bin\psql.exe" -h 127.0.0.1 -p $OnPort -U postgres -d $Database -v ON_ERROR_STOP=1 -tAc $Sql
  if ($LASTEXITCODE -ne 0) { throw "psql failed while running: $Sql" }
  return $output
}

# Dot-sourcing the file (". .\windows-postgres-setup.ps1") only loads the functions above.
if ($MyInvocation.InvocationName -eq ".") { return }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  throw "Run this from an Administrator PowerShell (Start menu > type PowerShell > Run as administrator)."
}
if (-not (Test-Path $EnvFile)) {
  throw "No $EnvFile here. Run this from the project folder (the one that contains package.json)."
}

$envValues = Read-EnvFile $EnvFile
$password = $envValues["SQL_PASSWORD"]
$database = $envValues["SQL_DB_NAME"]
if (-not $password -or -not $database) { throw "$EnvFile must contain SQL_PASSWORD and SQL_DB_NAME." }
if ($database -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') { throw "SQL_DB_NAME may only contain letters, digits and underscores." }
if ($envValues["SQL_USER"] -and $envValues["SQL_USER"] -ne "postgres") {
  Write-Warning "SQL_USER in $EnvFile is '$($envValues["SQL_USER"])'. This script sets the password of the 'postgres' user; set SQL_USER=postgres to use it."
}

$service = Get-CimInstance Win32_Service -Filter "Name LIKE 'postgresql%'" | Select-Object -First 1
if (-not $service) { throw "No PostgreSQL Windows service found. Is PostgreSQL installed?" }
if ($service.PathName -notmatch '-D\s+"([^"]+)"') { throw "Could not read the data folder from the service: $($service.PathName)" }
$dataDir = $Matches[1]
if ($service.PathName -notmatch '^"([^"]+)\\pg_ctl\.exe"') { throw "Could not read the PostgreSQL bin folder from the service: $($service.PathName)" }
$bin = $Matches[1]
Write-Host "Service : $($service.Name)"
Write-Host "Data    : $dataDir"
Write-Host "Bin     : $bin"

$confPath = Join-Path $dataDir "postgresql.conf"
$hbaPath = Join-Path $dataDir "pg_hba.conf"
Backup-Once $confPath | Out-Null
$hbaBackup = Backup-Once $hbaPath
$originalHba = [System.IO.File]::ReadAllText($hbaPath, $Latin1)

try {
  Write-Host "`n[1/4] Setting the port to $Port and allowing a temporary local login..."
  $conf = [System.IO.File]::ReadAllText($confPath, $Latin1)
  [System.IO.File]::WriteAllText($confPath, (Set-PortInConfig $conf $Port), $Latin1)
  [System.IO.File]::WriteAllText($hbaPath, (Add-LocalTrust $originalHba), $Latin1)
  Restart-Service $service.Name -Force
  Wait-ForServer $bin $Port

  Write-Host "[2/4] Setting the postgres password to the SQL_PASSWORD in $EnvFile..."
  $escaped = $password.Replace("'", "''")
  Invoke-Sql $bin $Port "postgres" "ALTER USER postgres PASSWORD '$escaped'" | Out-Null

  Write-Host "[3/4] Making sure the database '$database' exists..."
  $exists = Invoke-Sql $bin $Port "postgres" "SELECT 1 FROM pg_database WHERE datname = '$database'"
  if ("$exists".Trim() -ne "1") { Invoke-Sql $bin $Port "postgres" "CREATE DATABASE $database" | Out-Null }
}
finally {
  Write-Host "[4/4] Restoring the original login rules and restarting PostgreSQL..."
  [System.IO.File]::WriteAllText($hbaPath, $originalHba, $Latin1)
  Restart-Service $service.Name -Force
}
Wait-ForServer $bin $Port

$env:PGPASSWORD = $password
try {
  Invoke-Sql $bin $Port $database "SELECT 1" | Out-Null
  Write-Host "`nDone. PostgreSQL is on port $Port and accepts the password from $EnvFile." -ForegroundColor Green
  Write-Host "Next, in this folder:  npm run db:push   then   npm run dev   (or set DEMO_DB=postgres in .env and run: npm run demo)"
}
catch {
  Write-Warning "The server restarted, but logging in with the new password failed. Your original files are saved as:`n  $confPath.innerverse-backup`n  $hbaBackup"
  throw
}
finally {
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
