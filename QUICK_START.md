# Quick Start Guide

## Prerequisites
- Java 17+
- Maven 3.6+
- Docker and Docker Compose

## Step-by-Step Setup

### 1. Start MySQL Database

```bash
docker-compose up -d
```

Verify MySQL is running:
```bash
docker-compose ps
```

### 2. Set Environment Variables

**Windows PowerShell:**
```powershell
$env:DB_HOST="localhost"
$env:DB_PORT="3306"
$env:DB_NAME="xmile_db"
$env:DB_USER="root"
$env:DB_PASSWORD="rootpassword"
$env:JWT_SECRET="my-super-secret-jwt-key-change-this-in-production-min-32-chars"
$env:ADMIN_EMAIL="admin@xmile.com"
$env:ADMIN_PASSWORD="admin123"
```

**Linux/Mac:**
```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=xmile_db
export DB_USER=root
export DB_PASSWORD=rootpassword
export JWT_SECRET=my-super-secret-jwt-key-change-this-in-production-min-32-chars
export ADMIN_EMAIL=admin@xmile.com
export ADMIN_PASSWORD=admin123
```

### 3. Build and Run Backend

**Using Maven Wrapper (recommended):**

**Windows:**
```bash
# Build
.\mvnw.cmd clean install

# Run
.\mvnw.cmd spring-boot:run
```

**Linux/Mac:**
```bash
# Build
./mvnw clean install

# Run
./mvnw spring-boot:run
```

**Or using Maven directly (if installed):**
```bash
# Build
mvn clean install

# Run
mvn spring-boot:run
```

The application will start on `http://localhost:8080`

### 4. Test the API

#### Register a User
```bash
curl -X POST http://localhost:8080/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

#### Login
```bash
curl -X POST http://localhost:8080/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

Copy the token from the response.

#### Get Current User
```bash
curl -X GET http://localhost:8080/auth/me -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Login as Admin
```bash
curl -X POST http://localhost:8080/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@xmile.com\",\"password\":\"admin123\"}"
```

#### Admin Ping
```bash
curl -X GET http://localhost:8080/admin/ping -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

## Troubleshooting

### MySQL Connection Issues
- Ensure Docker Compose is running: `docker-compose ps`
- Check MySQL logs: `docker-compose logs mysql`
- Verify port 3306 is not in use by another service

### Application Won't Start
- Check environment variables are set correctly
- Verify MySQL is running and accessible
- Check application logs for specific errors

### Port Already in Use
- Change `SERVER_PORT` environment variable to a different port (e.g., 8081)
- Or stop the service using port 8080

