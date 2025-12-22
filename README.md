# XMILE Backend

Spring Boot 3 backend API with authentication, roles, and RBAC.

## Tech Stack

- Java 17
- Spring Boot 3.2.0
- Maven
- MySQL
- JPA (Hibernate)
- Flyway
- Spring Security
- JWT
- Lombok
- Validation

## Features

- User authentication with JWT
- Role-based access control (RBAC)
- Roles: ADMIN, CLIENT
- Admin user seeding on startup
- Database migrations with Flyway

## Prerequisites

- Java 17 or higher
- Maven 3.6+
- MySQL 8.0+
- Environment variables for configuration (see below)

## Setup Instructions

### 1. Start MySQL with Docker Compose

Start MySQL database using Docker Compose:

```bash
docker-compose up -d
```

This will:
- Start MySQL 8.0 on port 3306
- Create database `xmile_db` automatically
- Set root password to `rootpassword`
- Create user `xmile_user` with password `xmile_password`

To stop MySQL:
```bash
docker-compose down
```

To stop and remove volumes (clean slate):
```bash
docker-compose down -v
```

### 2. Environment Variables

Set the following environment variables (or use defaults in `application.yml`):

**Windows (PowerShell):**
```powershell
$env:DB_HOST="localhost"
$env:DB_PORT="3306"
$env:DB_NAME="xmile_db"
$env:DB_USER="root"
$env:DB_PASSWORD="rootpassword"
$env:JWT_SECRET="your-secret-key-change-in-production-min-256-bits-please-use-at-least-32-characters"
$env:JWT_EXPIRATION_MS="86400000"
$env:ADMIN_EMAIL="admin@xmile.com"
$env:ADMIN_PASSWORD="admin123"
$env:SERVER_PORT="8080"
```

**Linux/Mac:**
```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=xmile_db
export DB_USER=root
export DB_PASSWORD=rootpassword
export JWT_SECRET=your-secret-key-change-in-production-min-256-bits-please-use-at-least-32-characters
export JWT_EXPIRATION_MS=86400000
export ADMIN_EMAIL=admin@xmile.com
export ADMIN_PASSWORD=admin123
export SERVER_PORT=8080
```

### 3. Build and Run

**Using Maven Wrapper (recommended - no Maven installation required):**

**Windows:**
```bash
.\mvnw.cmd clean install
.\mvnw.cmd spring-boot:run
```

**Linux/Mac:**
```bash
./mvnw clean install
./mvnw spring-boot:run
```

**Or run the JAR directly:**
```bash
# Windows
.\mvnw.cmd clean package
java -jar target/xmile-backend-1.0.0.jar

# Linux/Mac
./mvnw clean package
java -jar target/xmile-backend-1.0.0.jar
```

**Using Maven directly (if Maven is installed):**
```bash
mvn clean install
mvn spring-boot:run
```

**Note:** Make sure MySQL is running (via Docker Compose) before starting the backend.

## API Endpoints

### Public Endpoints

#### Health Check
```
GET /health
```
Returns: `{"status": "ok"}`

#### Register
```
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```
Returns: `{"token": "jwt_token_here"}`

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```
Returns: `{"token": "jwt_token_here"}`

### Protected Endpoints

All protected endpoints require the JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

#### Get Current User
```
GET /auth/me
POST /auth/me
```
Returns:
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "CLIENT"
}
```

### Admin Endpoints

Requires ADMIN role.

#### Admin Ping
```
GET /admin/ping
```
Returns: `{"message": "admin ok"}`

## Security Rules

- **Public**: `/health`, `/auth/**`
- **Admin Only**: `/admin/**` (requires ADMIN role)
- **Authenticated**: All other endpoints require valid JWT token
- **401 Unauthorized**: Missing or invalid token
- **403 Forbidden**: Valid token but insufficient permissions

## Database Schema

The `users` table is created automatically via Flyway migration:

- `id` - BIGINT PRIMARY KEY AUTO_INCREMENT
- `name` - VARCHAR(120) NOT NULL
- `email` - VARCHAR(190) NOT NULL UNIQUE
- `password_hash` - VARCHAR(255) NOT NULL
- `role` - VARCHAR(30) NOT NULL
- `created_at` - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

## Default Roles

- **ADMIN**: Full system access (company manager)
- **CLIENT**: Default role for new registrations (business client)

## Testing the API

### Example Curl Requests

#### 1. Register a new user
```bash
curl -X POST http://localhost:8080/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"John Doe\",\"email\":\"john@example.com\",\"password\":\"password123\"}"
```

**Linux/Mac:**
```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. Login
```bash
curl -X POST http://localhost:8080/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"john@example.com\",\"password\":\"password123\"}"
```

**Linux/Mac:**
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the token from the response for next requests:**
```powershell
# Windows PowerShell
$token = "YOUR_TOKEN_HERE"
```

```bash
# Linux/Mac
export TOKEN="YOUR_TOKEN_HERE"
```

#### 3. Get current user (use token from login)
```bash
curl -X GET http://localhost:8080/auth/me ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Linux/Mac:**
```bash
curl -X GET http://localhost:8080/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "CLIENT"
}
```

#### 4. Login as Admin (use admin credentials)
```bash
curl -X POST http://localhost:8080/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@xmile.com\",\"password\":\"admin123\"}"
```

**Linux/Mac:**
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@xmile.com","password":"admin123"}'
```

**Save the admin token:**
```powershell
# Windows PowerShell
$adminToken = "YOUR_ADMIN_TOKEN_HERE"
```

```bash
# Linux/Mac
export ADMIN_TOKEN="YOUR_ADMIN_TOKEN_HERE"
```

#### 5. Admin endpoint (requires ADMIN role)
```bash
curl -X GET http://localhost:8080/admin/ping ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

**Linux/Mac:**
```bash
curl -X GET http://localhost:8080/admin/ping \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response:**
```json
{
  "message": "admin ok"
}
```

**Error Response (if not admin):**
```json
{
  "error": "Forbidden"
}
```

## Project Structure

```
src/
├── main/
│   ├── java/com/xmile/api/
│   │   ├── controller/      # REST controllers
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── exception/       # Exception handlers
│   │   ├── model/           # JPA entities and enums
│   │   ├── repository/      # JPA repositories
│   │   ├── security/        # Security configuration and JWT
│   │   ├── service/         # Business logic
│   │   └── XmileBackendApplication.java
│   └── resources/
│       ├── application.yml  # Application configuration
│       └── db/migration/    # Flyway migrations
│           └── V1__init.sql
└── pom.xml                  # Maven dependencies
```

## Notes

- Admin user is automatically created on startup if it doesn't exist (configured via `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars)
- JWT tokens expire after 24 hours by default (configurable via `JWT_EXPIRATION_MS`)
- Passwords are hashed using BCrypt
- All validation errors return detailed field-level error messages
