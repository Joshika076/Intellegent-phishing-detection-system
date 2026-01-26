from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
import numpy as np
import os
import torch
import time
import logging
import re
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
from feature_extractor import extract_features

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Device configuration
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load URL XGBoost Model
logger.info("Loading URL XGBoost model...")
with open('../url_xgboost_model.pkl', 'rb') as f:
    url_model = pickle.load(f)

with open('../url_feature_names.pkl', 'rb') as f:
    url_feature_names = pickle.load(f)

# Load DistilBERT Email Phishing Model
logger.info("Loading Email DistilBERT model...")
email_model_path = '../email_distilbert_model/email_distilbert_model'
tokenizer = DistilBertTokenizer.from_pretrained(email_model_path)
email_model = DistilBertForSequenceClassification.from_pretrained(email_model_path)
email_model.to(device)
email_model.eval()
logger.info(f"Models loaded successfully on {device}.")

def clean_email(text):
    """Basic email cleaning matching common training patterns."""
    text = text.lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE) # remove urls
    text = re.sub(r'\S+@\S+', '', text) # remove emails
    text = re.sub(r'\d+', '', text) # remove digits
    text = re.sub(r'[^\w\s]', '', text) # remove punctuation
    text = re.sub(r'\s+', ' ', text).strip() # remove extra whitespace
    return text

def predict_email_backend(text):
    if not isinstance(text, str) or len(text.strip()) < 10:
        return {"label": "Legitimate", "confidence": 0.0}

    text = clean_email(text)

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=256
    )

    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = email_model(**inputs)
        probs = torch.softmax(outputs.logits, dim=1)[0]

    # ✅ Logic from User
    phishing_prob = probs[1].item()
    legit_prob = probs[0].item()
    
    # Determine the winner
    if phishing_prob >= 0.80:
        return {"label": "Phishing", "confidence": phishing_prob}
    elif phishing_prob >= 0.50:
        return {"label": "Suspicious", "confidence": phishing_prob}
    else:
        return {"label": "Legitimate", "confidence": legit_prob}

@app.route('/predict_url', methods=['POST'])
def predict_url():
    print("RAW REQUEST JSON:", request.json)
    start_time = time.time()
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    # ✅ NORMALIZATION: Strip trailing slashes to fix the ibomma "imbalance"
    url = url.rstrip('/')
    print("RECEIVED INPUT (Normalized):", url)

    try:
        features_dict = extract_features(url)
        features_df = pd.DataFrame([features_dict])[url_feature_names]
        
        # ✅ INITIAL LOGIC: Revert to simple binary prediction
        prediction = url_model.predict(features_df)[0]
        is_phishing = bool(prediction == 1)
        
        duration = time.time() - start_time
        logger.info(f"URL Prediction for {url} took {duration:.4f}s - Result: {'Phishing' if is_phishing else 'Safe'}")
        
        return jsonify({
            'url': url,
            'is_phishing': is_phishing,
            'message': 'Phishing detected' if is_phishing else 'Safe website'
        })
    except Exception as e:
        logger.error(f"Error predicting URL {url}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/predict_email', methods=['POST'])
@app.route('/predict', methods=['POST'])
def predict_email():
    print("RAW REQUEST JSON:", request.json)
    start_time = time.time()
    data = request.get_json()
    text = data.get('text')
    print("RECEIVED INPUT:", text)
    if not text:
        return jsonify({'error': 'No text provided'}), 400

    try:
        result = predict_email_backend(text)
        
        duration = time.time() - start_time
        logger.info(f"Email Prediction took {duration:.4f}s - Result: {result['label']}")
        
        return jsonify({
            'is_phishing': result['label'] == "Phishing",
            'is_suspicious': result['label'] == "Suspicious",
            'message': result['label']
        })
    except Exception as e:
        logger.error(f"Error predicting email: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=False, threaded=True)
