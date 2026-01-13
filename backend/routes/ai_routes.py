from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

ai_bp = Blueprint('ai_bp', __name__)

# נשאיר את הישן כדי שלא ישבור משהו
@ai_bp.route('/ai', methods=['GET'])
def generate_ai_response():
    return jsonify({
        "text": "💆‍♀️ מבצע עיסוי לחג במיוחד בשבילך!",
        "posters": ["poster1.png", "poster2.png", "poster3.png", "poster4.png", "poster5.png"]
    })

# ✅ זה ה-endpoint שה-Frontend שלך קורא אליו
@ai_bp.route('/api/ai/texts', methods=['POST'])
@jwt_required()  # אם לא בא לך חסימה, אפשר למחוק את השורה הזו
def generate_ai_texts():
    data = request.get_json(silent=True) or {}
    prompt = (data.get("prompt") or "").strip()

    if not prompt:
        return jsonify({"texts": ["", "", ""]}), 400

    # בינתיים: 3 אופציות שונות (אחר כך מחברים ל-OpenAI)
    texts = [
        f"{prompt} 😊 נשמח לראות אותך! לפרטים נוספים השיבי להודעה.",
        f"{prompt} ✨ תזכורת קצרה — מחכים לך, יש שאלות? אנחנו כאן.",
        f"{prompt} 🙌 אל תפספס/י! שמרי מקום והצטרפי אלינו."
    ]

    return jsonify({"texts": texts}), 200
