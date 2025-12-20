# מדריך להעברת השרת ממיקומי למקוון

## שלב 1: הגדרת משתני סביבה לייצור

### Windows PowerShell:
```powershell
# הגדרת בסיס הנתונים (החלף עם הפרטים שלך)
$env:DB_HOST="your-database-host.com"
$env:DB_PORT="3306"
$env:DB_NAME="xmile_db"
$env:DB_USER="your_db_username"
$env:DB_PASSWORD="your_secure_password"
$env:DB_USE_SSL="true"

# הגדרת JWT (חשוב מאוד - שנה את זה!)
$env:JWT_SECRET="your-very-secure-secret-key-minimum-32-characters-long-change-this"
$env:JWT_EXPIRATION_MS="86400000"

# הגדרת מנהל מערכת
$env:ADMIN_EMAIL="admin@yourdomain.com"
$env:ADMIN_PASSWORD="secure_admin_password"

# פורט השרת (אופציונלי)
$env:SERVER_PORT="8080"
```

### Linux/Mac:
```bash
export DB_HOST="your-database-host.com"
export DB_PORT="3306"
export DB_NAME="xmile_db"
export DB_USER="your_db_username"
export DB_PASSWORD="your_secure_password"
export DB_USE_SSL="true"

export JWT_SECRET="your-very-secure-secret-key-minimum-32-characters-long-change-this"
export JWT_EXPIRATION_MS="86400000"

export ADMIN_EMAIL="admin@yourdomain.com"
export ADMIN_PASSWORD="secure_admin_password"

export SERVER_PORT="8080"
```

## שלב 2: בניית הפרויקט לייצור

```bash
# Windows
.\mvnw.cmd clean package

# Linux/Mac
./mvnw clean package
```

זה יוצר קובץ JAR ב-`target/xmile-backend-1.0.0.jar`

## שלב 3: העלאת השרת לשרת מקוון

### אפשרות A: שרת VPS/Cloud (AWS, DigitalOcean, וכו')

1. העלה את קובץ ה-JAR לשרת:
```bash
scp target/xmile-backend-1.0.0.jar user@your-server.com:/path/to/app/
```

2. התחבר לשרת והפעל:
```bash
ssh user@your-server.com
cd /path/to/app
java -jar xmile-backend-1.0.0.jar
```

### אפשרות B: Docker

צור `Dockerfile`:
```dockerfile
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY target/xmile-backend-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

בנה והפעל:
```bash
docker build -t xmile-backend .
docker run -p 8080:8080 --env-file .env xmile-backend
```

## שלב 4: בדיקה עם Postman

### 1. בדיקת Health Endpoint

**Request:**
- Method: `GET`
- URL: `https://your-domain.com/health`
- Headers: (אין צורך)

**Expected Response:**
```json
{
  "status": "ok"
}
```

### 2. בדיקת Server Info

**Request:**
- Method: `GET`
- URL: `https://your-domain.com/api/info`
- Headers: (אין צורך)

**Expected Response:**
```json
{
  "serverPort": 8080,
  "databaseHost": "your-database-host.com",
  "isLocal": false,
  "environment": "production",
  "serverUrl": "https://your-domain.com"
}
```

### 3. הרשמה (Register)

**Request:**
- Method: `POST`
- URL: `https://your-domain.com/auth/register`
- Headers:
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "CLIENT"
}
```

### 4. התחברות (Login)

**Request:**
- Method: `POST`
- URL: `https://your-domain.com/auth/login`
- Headers:
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "CLIENT"
}
```

### 5. קבלת משתמש נוכחי (Get Current User)

**Request:**
- Method: `GET`
- URL: `https://your-domain.com/auth/me`
- Headers:
  - `Authorization: Bearer YOUR_TOKEN_HERE`
  - (החלף `YOUR_TOKEN_HERE` עם הטוקן שקיבלת מהתחברות)

**Expected Response:**
```json
{
  "id": 1,
  "name": "Test User",
  "email": "test@example.com",
  "role": "CLIENT"
}
```

### 6. יצירת הצעת מחיר (Create Quote)

**Request:**
- Method: `POST`
- URL: `https://your-domain.com/quotes`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_TOKEN_HERE`
- Body (raw JSON):
```json
{
  "eventName": "אירוע בדיקה",
  "participantCount": 100,
  "location": "תל אביב",
  "eventDate": "2024-12-25",
  "startTime": "10:00:00",
  "notes": "הערות לבדיקה"
}
```

**Expected Response:**
```json
{
  "id": 1,
  "eventId": 1,
  "eventName": "אירוע בדיקה",
  "participantCount": 100,
  "location": "תל אביב",
  "eventDate": "2024-12-25",
  "startTime": "10:00:00",
  "price": 8000.00,
  "totalPrice": 8800.00,
  "currency": "ILS",
  "status": "ESTIMATE",
  ...
}
```

## שלב 5: הגדרת Postman Environment

1. פתח Postman
2. לחץ על "Environments" בצד שמאל
3. לחץ על "+" ליצירת Environment חדש
4. הגדר משתנים:
   - `base_url`: `https://your-domain.com`
   - `token`: (תישאר ריק, יתעדכן אחרי התחברות)
5. שמור את ה-Environment

### שימוש ב-Variables ב-Postman:

בכל Request, השתמש ב-`{{base_url}}` במקום כתובת מלאה:
- `{{base_url}}/health`
- `{{base_url}}/auth/login`
- `{{base_url}}/quotes`

## שלב 6: בדיקת Frontend

לאחר שהשרת רץ במקוון, עדכן את ה-Frontend:

### אפשרות 1: תג Meta ב-HTML
הוסף לכל דף HTML:
```html
<head>
    <meta name="api-base-url" content="https://your-domain.com">
    ...
</head>
```

### אפשרות 2: משתנה גלובלי
הוסף לפני `config.js`:
```html
<script>
    window.API_BASE_URL = "https://your-domain.com";
</script>
<script src="js/config.js"></script>
```

## פתרון בעיות

### שגיאת CORS
אם אתה מקבל שגיאת CORS ב-Postman או בדפדפן, ודא ש-SecurityConfig מאפשר את ה-Origin שלך.

### שגיאת 401 Unauthorized
- ודא שהטוקן תקין ולא פג תוקף
- ודא שאתה שולח את ה-Header: `Authorization: Bearer TOKEN`

### שגיאת 500 Internal Server Error
- בדוק את לוגי השרת
- ודא שבסיס הנתונים נגיש
- ודא שכל משתני הסביבה מוגדרים נכון

## אבטחה בייצור

1. ✅ השתמש ב-HTTPS (לא HTTP)
2. ✅ שנה את JWT_SECRET לערך ייחודי וחזק
3. ✅ השתמש בסיסמאות חזקות לבסיס הנתונים
4. ✅ הגבל גישה לבסיס הנתונים עם Firewall
5. ✅ השתמש ב-DB_USE_SSL="true" בייצור

## בדיקה מהירה

לאחר ההעברה, בדוק:
1. ✅ `https://your-domain.com/health` → `{"status":"ok"}`
2. ✅ `https://your-domain.com/api/info` → `"isLocal": false`
3. ✅ התחברות דרך Postman עובדת
4. ✅ יצירת quote דרך Postman עובדת

