#!/usr/bin/env python3
import yaml
import json
import urllib.request
import urllib.parse
import os
import sys

def translate_text(text, src='fr', dest='en'):
    if not text or not isinstance(text, str):
        return text
    # Avoid translating contact information, links, or specific technical terms
    if '@' in text or 'linkedin.com' in text or 'github.com' in text or text.isdigit():
        return text
    try:
        # Call the Google Translate free endpoint
        url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" + src + "&tl=" + dest + "&dt=t&q=" + urllib.parse.quote(text)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            result = json.loads(response.read().decode('utf-8'))
            translated_sentences = [sentence[0] for sentence in result[0] if sentence[0]]
            translated = "".join(translated_sentences)
            return translated
    except Exception as e:
        print(f"Warning: Failed to translate '{text[:30]}...': {e}", file=sys.stderr)
        return text  # Fallback to original French text

# Define the string keys that require translation
TRANSLATE_KEYS = {
    'title', 'summary', 'category', 'role', 'period', 'location', 
    'degree', 'school', 'name', 'level'
}

def process_node(node):
    if isinstance(node, dict):
        new_node = {}
        for k, v in node.items():
            if k in TRANSLATE_KEYS and isinstance(v, str):
                print(f"Translating key '{k}': {v[:40]}...")
                new_node[k] = {
                    'fr': v,
                    'en': translate_text(v)
                }
            elif k == 'subtitles' and isinstance(v, list):
                print(f"Translating list 'subtitles': {v}...")
                new_node[k] = {
                    'fr': v,
                    'en': [translate_text(item) for item in v]
                }
            elif k == 'bullets' and isinstance(v, list):
                print(f"Translating experience bullets ({len(v)} items)...")
                new_node[k] = [
                    {'fr': item, 'en': translate_text(item)} if isinstance(item, str) else process_node(item)
                    for item in v
                ]
            elif k == 'items' and isinstance(v, list):
                # Translate skill items if they contain French terms like "(quotidien)" -> "(daily)"
                print(f"Translating skill items list...")
                new_node[k] = [
                    {'fr': item, 'en': translate_text(item)} if isinstance(item, str) else process_node(item)
                    for item in v
                ]
            else:
                new_node[k] = process_node(v)
        return new_node
    elif isinstance(node, list):
        return [process_node(item) for item in node]
    else:
        return node

def main():
    yaml_path = 'cv/cv.yaml'
    output_path = 'cv/cv_bilingual.json'
    
    if not os.path.exists(yaml_path):
        print(f"Error: {yaml_path} not found.", file=sys.stderr)
        sys.exit(1)
        
    print(f"Reading French source file from {yaml_path}...")
    try:
        with open(yaml_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
    except Exception as e:
        print(f"Error reading YAML: {e}", file=sys.stderr)
        sys.exit(1)
        
    print("Beginning automated translation (French -> English)...")
    bilingual_data = process_node(data)
    
    print(f"Writing bilingual output database to {output_path}...")
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(bilingual_data, f, ensure_ascii=False, indent=2)
        print("Success: Bilingual CV generated.")
    except Exception as e:
        print(f"Error writing output JSON: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
