import re
import difflib

def is_noise(text):
    text_lower = text.lower().strip()
    
    # Filter short strings (less than 15 chars)
    if len(text_lower) < 15:
        return True
        
    # Check known RBI header/footer phrases and contact details
    noise_keywords = [
        "reserve bank of india",
        "financial markets regulation",
        "www.rbi.org.in",
        "central office building",
        "shahid bhagat singh marg",
        "e-mail-",
        "cgmfmrd@rbi.org.in",
        "regulatory guidelines",
        "all rights reserved",
        "disclaimer",
        "tel: (91-22)",
        "mumbai – 400001",
        "mumbai-400001",
        "hindi is easy",
        "Ǒhन्दȣ आसान है",
        "इसका प्रयोग बढ़ाइए",
        "भारतीय įरज़वर् बैंक"
    ]
    for kw in noise_keywords:
        if kw in text_lower:
            return True
            
    # Check regexes
    if re.match(r'^\d+$', text_lower):
        return True
    if re.match(r'^page\s+\d+', text_lower):
        return True
    if re.match(r'^circular\s+no', text_lower):
        return True
    if re.search(r'dated\s+[a-zA-Z]+\s+\d+,\s+\d{4}', text_lower):
        if len(text_lower) < 30:
            return True
            
    # Check for dots (like ... or . . .), underscores, or lines of dashes
    if re.search(r'\.{3,}', text_lower):
        return True
    if re.search(r'\.\s*\.\s*\.\s*\.', text_lower):
        return True
    if re.search(r'_{3,}', text_lower):
        return True
    if re.search(r'-{4,}', text_lower):
        return True
            
    return False

def normalize_text_for_comparison(text):
    # 1. Lowercase the text to ignore capitalization
    text_normalized = text.lower()
    
    # 2. Remove common bullet patterns at the beginning of the sentence
    # Matches: "1.", "1.1.", "(a)", "a)", "a.", "•", "-", "*", etc.
    text_normalized = re.sub(
        r'^(?:(?:\d+(?:\.\d+)*\b[\.\)]?)|(?:\(?[a-zA-Z0-9][\.\)])|(?:[\(]?\d+\)?)|(?:[•\-\*]))\s*', 
        '', 
        text_normalized
    )
    
    # 3. Keep only alphanumeric characters and spaces (ignores punctuation and special characters)
    text_normalized = re.sub(r'[^a-z0-9\s]', '', text_normalized)
    
    # 4. Collapse multiple spaces/tabs into a single space and strip
    text_normalized = re.sub(r'\s+', ' ', text_normalized).strip()
    
    return text_normalized

def detect_changes(old_text, new_text):
    sentence_endings = re.compile(r'(?<=[.!?])\s+')
    
    # 1. Parse and extract candidate sentences
    raw_old = []
    for s in sentence_endings.split(old_text):
        s_clean = s.strip()
        if s_clean and not is_noise(s_clean):
            norm = normalize_text_for_comparison(s_clean)
            # Ensure normalized version contains at least one letter
            if norm and any(c.isalpha() for c in norm):
                raw_old.append((s_clean, norm))
                
    raw_new = []
    for s in sentence_endings.split(new_text):
        s_clean = s.strip()
        if s_clean and not is_noise(s_clean):
            norm = normalize_text_for_comparison(s_clean)
            # Ensure normalized version contains at least one letter
            if norm and any(c.isalpha() for c in norm):
                raw_new.append((s_clean, norm))
                
    # 2. Filter out duplicate sentences in each document (potential repeating headers/footers)
    from collections import Counter
    old_counts = Counter(item[1] for item in raw_old)
    new_counts = Counter(item[1] for item in raw_new)
    
    old_sentences = []
    for orig, norm in raw_old:
        if old_counts[norm] == 1:
            old_sentences.append({
                "original": orig,
                "normalized": norm
            })
            
    new_sentences = []
    for orig, norm in raw_new:
        if new_counts[norm] == 1:
            new_sentences.append({
                "original": orig,
                "normalized": norm
            })

    old_normalized_list = [s["normalized"] for s in old_sentences]
    new_normalized_list = [s["normalized"] for s in new_sentences]

    diff = difflib.ndiff(old_normalized_list, new_normalized_list)

    added_candidates = []
    removed_candidates = []

    old_idx = 0
    new_idx = 0
    for item in diff:
        if item.startswith("- "):
            removed_candidates.append(old_sentences[old_idx])
            old_idx += 1
        elif item.startswith("+ "):
            added_candidates.append(new_sentences[new_idx])
            new_idx += 1
        elif item.startswith("  "):
            old_idx += 1
            new_idx += 1
        elif item.startswith("? "):
            pass

    added = []
    removed = []
    modified = []

    matched_added = set()
    matched_removed = set()

    # Pair similar added and removed sentences as modified (using normalized text similarity)
    for r_idx, r_sent in enumerate(removed_candidates):
        best_ratio = 0.0
        best_a_idx = -1
        for a_idx, a_sent in enumerate(added_candidates):
            if a_idx in matched_added:
                continue
            ratio = difflib.SequenceMatcher(None, r_sent["normalized"], a_sent["normalized"]).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_a_idx = a_idx
                
        if best_ratio >= 0.50:
            modified.append({
                "old": r_sent["original"],
                "new": added_candidates[best_a_idx]["original"],
                "similarity": best_ratio
            })
            matched_added.add(best_a_idx)
            matched_removed.add(r_idx)

    # Put unmatched ones in added or removed
    for a_idx, a_sent in enumerate(added_candidates):
        if a_idx not in matched_added:
            added.append(a_sent["original"])
            
    for r_idx, r_sent in enumerate(removed_candidates):
        if r_idx not in matched_removed:
            removed.append(r_sent["original"])

    return {
        "added": added,
        "removed": removed,
        "modified": modified
    }