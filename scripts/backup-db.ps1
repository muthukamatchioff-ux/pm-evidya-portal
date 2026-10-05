param (
    [string]$DbUrl = $env:DATABASE_URL
)

# Extract connection details or just rely on pg_dump parsing the URL
if (-not $DbUrl) {
    # Try to load from .env
    if (Test-Path ".env") {
        $envContent = Get-Content .env
        foreach ($line in $envContent) {
            if ($line -match "^DATABASE_URL=(.*)") {
                $DbUrl = $matches[1]
                break
            }
        }
    }
}

if (-not $DbUrl) {
    Write-Host "DATABASE_URL not found in environment or .env file." -ForegroundColor Red
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$backupFile = "$backupDir\pm_evidya_db_$timestamp.sql"

Write-Host "Starting database backup to $backupFile..." -ForegroundColor Cyan

# Requires pg_dump to be in PATH
pg_dump $DbUrl -f $backupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Backup failed. Make sure PostgreSQL tools (pg_dump) are installed and in your PATH." -ForegroundColor Red
}
