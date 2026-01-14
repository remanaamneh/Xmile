# Script to create xmile_db database
# This script attempts to create the database using various methods

Write-Host "Attempting to create xmile_db database..." -ForegroundColor Yellow

# Method 1: Try to find MySQL in common locations
$mysqlPaths = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.2\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe",
    "C:\wamp64\bin\mysql\mysql8.0.xx\bin\mysql.exe"
)

$mysqlExe = $null
foreach ($path in $mysqlPaths) {
    if (Test-Path $path) {
        $mysqlExe = $path
        Write-Host "Found MySQL at: $path" -ForegroundColor Green
        break
    }
}

if ($mysqlExe) {
    Write-Host "Creating database using MySQL command line..." -ForegroundColor Yellow
    $password = "Rn@318695681"
    $createDbSql = "CREATE DATABASE IF NOT EXISTS xmile_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    
    try {
        & $mysqlExe -u root -p"$password" -e $createDbSql
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database created successfully!" -ForegroundColor Green
            exit 0
        } else {
            Write-Host "Failed to create database. Trying without password..." -ForegroundColor Yellow
            & $mysqlExe -u root -e $createDbSql
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Database created successfully!" -ForegroundColor Green
                exit 0
            }
        }
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

# Method 2: Try using ODBC/ADO.NET
Write-Host "Attempting to create database using .NET..." -ForegroundColor Yellow
try {
    Add-Type -AssemblyName System.Data
    
    # Try to connect and create database
    $connectionString = "Server=localhost;Port=3306;Uid=root;Pwd=Rn@318695681;"
    $connection = New-Object System.Data.Odbc.OdbcConnection
    
    # For MySQL, we need MySQL .NET connector, which might not be available
    # So we'll provide instructions instead
    Write-Host "MySQL .NET connector not available in PowerShell by default." -ForegroundColor Yellow
    Write-Host "Please create the database manually using one of these methods:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Method 1: Using MySQL Workbench or phpMyAdmin" -ForegroundColor Cyan
    Write-Host "  - Connect to MySQL server" -ForegroundColor White
    Write-Host "  - Run: CREATE DATABASE IF NOT EXISTS xmile_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" -ForegroundColor White
    Write-Host ""
    Write-Host "Method 2: Using MySQL command line (if available)" -ForegroundColor Cyan
    Write-Host "  mysql -u root -p -e \"CREATE DATABASE IF NOT EXISTS xmile_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\"" -ForegroundColor White
    Write-Host ""
    Write-Host "Method 3: The application will try to create it automatically if you have the right permissions" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "Note: If the password 'Rn@318695681' is incorrect for your MySQL root user," -ForegroundColor Yellow
Write-Host "please set the DB_PASSWORD environment variable with the correct password." -ForegroundColor Yellow
