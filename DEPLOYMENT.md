# הוראות פריסה לשרת מקוון (Deployment Guide)

מדריך זה מסביר כיצד לפרוס את האפליקציה לשרת מקוון.

## הגדרות סביבת ייצור (Production Environment Variables)

### 1. משתני סביבה לבסיס הנתונים

```bash
# Windows PowerShell
$env:DB_HOST="your-database-host.com"
$env:DB_PORT="3306"
$env:DB_NAME="xmile_db"
$env:DB_USER="your_db_user"
$env:DB_PASSWORD="your_secure_password"
$env:DB_USE_SSL="true"  # השתמש ב-true בייצור

# Linux/Mac
export DB_HOST="your-database-host.com"
export DB_PORT="3306"
export DB_NAME="xmile_db"
export DB_USER="your_db_user"
export DB_PASSWORD="your_secure_password"
export DB_USE_SSL="true"
```

### 2. משתני סביבה ל-JWT

```bash
# Windows PowerShell
$env:JWT_SECRET="your-very-secure-secret-key-minimum-32-characters-long"
$env:JWT_EXPIRATION_MS="86400000"  # 24 שעות

# Linux/Mac
export JWT_SECRET="your-very-secure-secret-key-minimum-32-characters-long"
export JWT_EXPIRATION_MS="86400000"
```

### 3. משתני סביבה לשרת

```bash
# Windows PowerShell
$env:SERVER_PORT="8080"  # או פורט אחר לפי הצורך
$env:ADMIN_EMAIL="admin@yourdomain.com"
$env:ADMIN_PASSWORD="secure_admin_password"

# Linux/Mac
export SERVER_PORT="8080"
export ADMIN_EMAIL="admin@yourdomain.com"
export ADMIN_PASSWORD="secure_admin_password"
```

## הגדרת כתובת API ב-Frontend

האפליקציה מזהה אוטומטית את כתובת השרת. אם אתה צריך להגדיר כתובת API ספציפית, הוסף תג meta ב-HTML:

```html
<head>
    <meta name="api-base-url" content="https://your-api-domain.com">
    <!-- שאר התגים -->
</head>
```

או הגדר משתנה גלובלי ב-JavaScript לפני טעינת config.js:

```html
<script>
    window.API_BASE_URL = "https://your-api-domain.com";
</script>
<script src="js/config.js"></script>
```

## אפשרויות פריסה

### אפשרות 1: פריסה עם JAR

1. **בנה את הפרויקט:**
```bash
# Windows
.\mvnw.cmd clean package

# Linux/Mac
./mvnw clean package
```

2. **העלה את הקובץ `target/xmile-backend-1.0.0.jar` לשרת**

3. **הפעל את השרת:**
```bash
java -jar xmile-backend-1.0.0.jar
```

### אפשרות 2: פריסה עם Docker

1. **צור Dockerfile:**
```dockerfile
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY target/xmile-backend-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

2. **בנה והפעל:**
```bash
docker build -t xmile-backend .
docker run -p 8080:8080 --env-file .env xmile-backend
```

### אפשרות 3: פריסה עם Systemd (Linux)

1. **צור קובץ שירות `/etc/systemd/system/xmile-backend.service`:**
```ini
[Unit]
Description=XMILE Backend Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/xmile-backend
Environment="DB_HOST=your-db-host"
Environment="DB_USER=your-db-user"
Environment="DB_PASSWORD=your-db-password"
Environment="JWT_SECRET=your-jwt-secret"
ExecStart=/usr/bin/java -jar /path/to/xmile-backend-1.0.0.jar
Restart=always

[Install]
WantedBy=multi-user.target
```

2. **הפעל את השירות:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable xmile-backend
sudo systemctl start xmile-backend
```

### אפשרות 4: פריסה עם Nginx Reverse Proxy

1. **התקן Nginx:**
```bash
sudo apt-get install nginx
```

2. **צור קובץ הגדרה `/etc/nginx/sites-available/xmile-backend`:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. **הפעל את ההגדרה:**
```bash
sudo ln -s /etc/nginx/sites-available/xmile-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## בדיקת הפריסה

1. **בדוק את health endpoint:**
```bash
curl https://your-domain.com/health
```

2. **בדוק התחברות:**
```bash
curl -X POST https://your-domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"your_password"}'
```

## אבטחה בייצור

1. **השתמש ב-HTTPS** - הגדר SSL/TLS certificate
2. **שנה את JWT_SECRET** - אל תשתמש בערך ברירת המחדל
3. **הגבל גישה לבסיס הנתונים** - השתמש ב-firewall rules
4. **השתמש בסיסמאות חזקות** - עבור בסיס הנתונים והמנהל
5. **הגדר CORS** - עדכן את SecurityConfig אם צריך

## פתרון בעיות

### השרת לא מתחבר לבסיס הנתונים
- בדוק שהמשתנים DB_HOST, DB_USER, DB_PASSWORD מוגדרים נכון
- ודא שהשרת יכול לגשת לשרת MySQL
- בדוק את ה-firewall rules

### שגיאת 500 ב-quotes endpoint
- ודא שהשרת הופעל מחדש לאחר העדכונים
- בדוק את לוגי השרת לפרטים נוספים
- ודא שה-JWT token תקין

### CORS errors
- עדכן את SecurityConfig.java עם כתובת ה-frontend הנכונה
- ודא שה-Origin header נשלח נכון

## תמיכה

אם נתקלת בבעיות, בדוק את לוגי השרת:
```bash
# אם משתמשים ב-systemd
sudo journalctl -u xmile-backend -f

# או אם מפעילים ישירות
java -jar xmile-backend-1.0.0.jar 2>&1 | tee server.log
```

