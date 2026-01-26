# Chrome Extension - Email Phishing Detector

A Chrome extension that detects phishing emails using machine learning.

## Project Structure

- **extension/**: Chrome extension files
  - `manifest.json`: Extension configuration
  - `background.js`: Background script
  - `content.js`: Content script
  - `popup.html` & `popup.js`: Popup UI

- **backend/**: Python backend server
  - `app.py`: Main Flask/FastAPI application
  - `feature_extractor.py`: Feature extraction for ML models
  - `requirements.txt`: Python dependencies
  - `test_ibomma.py`: Test file
  - `validation_test.py`: Validation tests

- **email_distilbert_model/**: Pre-trained DistilBERT model for email analysis

## Installation

### Prerequisites
- Python 3.7+
- pip
- Google Chrome/Chromium

### Setup

1. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/` folder

3. Run the backend:
   ```bash
   python backend/app.py
   ```

## Usage

The extension will analyze emails in real-time and provide phishing detection scores.

## License

[Add your license here]
