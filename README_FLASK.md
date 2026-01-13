# Flask Backend - AI Routes

⚠️ **שימי לב:** הפרויקט הראשי הוא Spring Boot (Java), לא Flask.

אם את רוצה להוסיף Flask backend נפרד:

## הגדרה

1. התקיני Flask ו-JWT:
```bash
pip install flask flask-jwt-extended
```

2. הוסיפי את ה-routes ל-Flask app:
```python
from backend.routes.ai_routes import ai_bp
app.register_blueprint(ai_bp)
```

3. ודאי שה-Flask server רץ על פורט שונה מ-Spring Boot (8080)

## Endpoint

- **POST /api/ai/texts**
- Body: `{ "prompt": "טקסט ראשוני..." }`
- Response: `{ "texts": ["אופציה 1", "אופציה 2", "אופציה 3"] }`

## הערה

אם את משתמשת ב-Spring Boot endpoint שכבר קיים (`AiController.java`), אין צורך ב-Flask - הכל עובד כבר! ✅
