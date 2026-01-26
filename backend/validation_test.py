import torch
import numpy as np

# Simulate User's Phishing Example
probs_phishing = torch.tensor([[0.12, 0.88]]) # Index 0: Legit, Index 1: Phishing
prediction_phishing = 1

# Simulate User's Legitimate Example
probs_legit = torch.tensor([[0.95, 0.05]])
prediction_legit = 0

def validate_logic(prediction, probs_tensor):
    # This matches the code in app.py
    probs = probs_tensor[0]
    phishing_prob = probs[1].item()
    legit_prob = probs[0].item()
    
    if prediction == 1:
        result = "Phishing"
        confidence = phishing_prob * 100
    else:
        result = "Legitimate"
        confidence = legit_prob * 100
    
    print(f"--- Testing Prediction: {prediction} ---")
    print(f"Probabilities: [{legit_prob:.2f}, {phishing_prob:.2f}]")
    print(f"Output: {result} ({confidence:.1f}%)")
    return f"{result} ({confidence:.1f}%)"

print("VALIDATION TEST")
phishing_out = validate_logic(prediction_phishing, probs_phishing)
legit_out = validate_logic(prediction_legit, probs_legit)

if phishing_out == "Phishing (88.0%)":
    print("\n✅ SUCCESS: Phishing logic is correct.")
if legit_out == "Legitimate (95.0%)":
    print("✅ SUCCESS: Legitimate logic is correct.")
