from feature_extractor import extract_features
import pickle
import pandas as pd

# Load Model
with open('../url_xgboost_model.pkl', 'rb') as f:
    model = pickle.load(f)

with open('../url_feature_names.pkl', 'rb') as f:
    feature_names = pickle.load(f)

urls = ["https://ibommamovie.com/", "https://ibommamovie.com", "http://ibommamovie.com"]
for url in urls:
    features = extract_features(url)
    features_df = pd.DataFrame([features])[feature_names]
    prediction = model.predict(features_df)[0]
    probs = model.predict_proba(features_df)[0]
    print(f"URL: {url}")
    print(f"Prediction: {'Phishing' if prediction == 1 else 'Safe'} ({prediction})")
    print(f"Probabilities: [Safe: {probs[0]:.4f}, Phishing: {probs[1]:.4f}]")
    print("-" * 20)
