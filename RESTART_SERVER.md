# ⚠️ חשוב: הפעל מחדש את השרת!

## הבעיה
אם אתה רואה שגיאת 500 ב-`/quotes` endpoint, זה כנראה כי השרת לא הופעל מחדש אחרי השינויים בקוד.

## פתרון

### 1. עצור את השרת הנוכחי
- אם השרת רץ בטרמינל: לחץ `Ctrl+C`
- אם השרת רץ כ-service: `sudo systemctl stop xmile-backend`

### 2. בנה מחדש את הפרויקט (אופציונלי אבל מומלץ)
```bash
# Windows
.\mvnw.cmd clean package

# Linux/Mac
./mvnw clean package
```

### 3. הפעל את השרת מחדש

**אם משתמשים ב-Maven:**
```bash
# Windows
.\mvnw.cmd spring-boot:run

# Linux/Mac
./mvnw spring-boot:run
```

**אם משתמשים ב-JAR:**
```bash
java -jar target/xmile-backend-1.0.0.jar
```

**אם משתמשים ב-Systemd:**
```bash
sudo systemctl start xmile-backend
sudo systemctl status xmile-backend
```

## בדיקה שהשרת רץ

לאחר הפעלה מחדש, בדוק:
```bash
curl http://localhost:8080/health
```

אמור להחזיר:
```json
{"status":"ok"}
```

## אם הבעיה נמשכת

1. **בדוק את לוגי השרת:**
   - בטרמינל שבו השרת רץ
   - או: `sudo journalctl -u xmile-backend -f` (אם משתמשים ב-systemd)

2. **ודא שהקוד עודכן:**
   - בדוק שהקובץ `QuoteController.java` משתמש ב-`Authentication` ולא ב-`@RequestHeader("Authorization")`

3. **בדוק את ה-JWT token:**
   - ודא שהטוקן תקין ולא פג תוקף
   - נסה להתחבר מחדש

## שינויים שנעשו

השינויים העיקריים:
- ✅ `QuoteController` עכשיו משתמש ב-`Authentication` object במקום לפרסר ידנית את ה-Authorization header
- ✅ `MessageController` עודכן גם כן
- ✅ כל קבצי ה-JavaScript משתמשים כעת ב-`config.js` לזיהוי אוטומטי של כתובת השרת

לאחר הפעלה מחדש, הכל אמור לעבוד! 🚀

