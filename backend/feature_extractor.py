import re
import math
from urllib.parse import urlparse

def get_url_length(url):
    return len(url)

def get_domain_length(url):
    try:
        domain = urlparse(url).netloc
        return len(domain)
    except:
        return 0

def get_path_length(url):
    try:
        path = urlparse(url).path
        return len(path)
    except:
        return 0

def count_dots(url):
    return url.count('.')

def count_hyphens(url):
    return url.count('-')

def count_special_chars(url):
    # Counting non-alphanumeric characters excluding standard URL characters like '.', '/', '?', '=', '&'
    special_chars = re.sub(r'[a-zA-Z0-9\/\.\?\=\&\-]', '', url)
    return len(special_chars)

def count_digits(url):
    return sum(c.isdigit() for c in url)

def get_digit_ratio(url):
    if len(url) == 0:
        return 0
    return count_digits(url) / len(url)

def has_ip_address(url):
    # Regex for IPv4
    ip_pattern = r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'
    return 1 if re.search(ip_pattern, url) else 0

def count_subdomains(url):
    try:
        domain = urlparse(url).netloc
        # split by dots and subtract 2 (main domain and TLD)
        parts = domain.split('.')
        if len(parts) > 2:
            return len(parts) - 2
        return 0
    except:
        return 0

def check_https(url):
    return 1 if url.startswith('https') else 0

def check_www(url):
    return 1 if 'www.' in url else 0

from collections import Counter

def calculate_entropy(text):
    if not text:
        return 0
    counts = Counter(text)
    len_text = len(text)
    entropy = - sum([(count/len_text) * math.log(count/len_text, 2) for count in counts.values()])
    return entropy

def extract_features(url):
    parsed = urlparse(url)
    features = {
        'url_length': get_url_length(url),
        'domain_length': get_domain_length(url),
        'path_length': get_path_length(url),
        'num_dots': count_dots(url),
        'num_hyphens': count_hyphens(url),
        'num_special_chars': count_special_chars(url),
        'num_digits': count_digits(url),
        'digit_ratio': get_digit_ratio(url),
        'has_ip': has_ip_address(url),
        'num_subdomains': count_subdomains(url),
        'has_https': check_https(url),
        'has_www': check_www(url),
        'url_entropy': calculate_entropy(url),
        'path_entropy': calculate_entropy(parsed.path)
    }
    return features
