#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SP4 Memory Analyzer - POPIČI Edition 💀
Analyzuje SP4 memory.json podľa skutočnej architektúry vrstiev.
Žiadne cloudové sračky, len lokálna analýza.
"""

import json
import os
from collections import Counter
from datetime import datetime

def load_memory(filepath="data/memory.json"):
    """Načíta SP4 memory súbor"""
    if not os.path.exists(filepath):
        print(f"❌ Súbor {filepath} neexistuje, kokot!")
        return None
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Chyba pri čítaní: {e}")
        return None

def analyze_structure(memory):
    """Analyzuje štruktúru memory vrstiev"""
    print("\n🧠 SP4 MEMORY STRUCTURE")
    print("=" * 50)
    
    layers = {
        "raw_log": "Surové záznamy konverzácií",
        "summaries": "AI zhrnutia interakcií",
        "chapters": "Veľké životné periódy",
        "seeds": "Kľúčové momenty (semená)",
        "triggers": "Automatické varovania"
    }
    
    for layer, desc in layers.items():
        if layer in memory:
            if isinstance(memory[layer], list):
                count = len(memory[layer])
                print(f"  {layer:12s} → {count:4d} záznamov ({desc})")
            elif isinstance(memory[layer], dict):
                count = len(memory[layer])
                print(f"  {layer:12s} → {count:4d} kľúčov ({desc})")
        else:
            print(f"  {layer:12s} → CHÝBA ⚠️")

def analyze_raw_log(raw_log):
    """Detailná analýza raw_log vrstvy"""
    if not raw_log:
        print("\n⚠️ Raw log je prázdny!")
        return
    
    print("\n📝 RAW LOG ANALYSIS")
    print("=" * 50)
    
    total = len(raw_log)
    print(f"  Celkový počet: {total}")
    
    # Typy správ
    user_msgs = sum(1 for r in raw_log if r.get('role') == 'user')
    ai_msgs = sum(1 for r in raw_log if r.get('role') == 'assistant')
    
    print(f"  User správy: {user_msgs}")
    print(f"  AI odpovede: {ai_msgs}")
    
    # Časový rozsah
    timestamps = [r.get('timestamp') for r in raw_log if 'timestamp' in r]
    if timestamps:
        first = min(timestamps)
        last = max(timestamps)
        print(f"  Prvý záznam: {first}")
        print(f"  Posledný záznam: {last}")
    
    # Priemerná dĺžka správ
    lengths = [len(r.get('content', '')) for r in raw_log]
    if lengths:
        avg_len = sum(lengths) / len(lengths)
        print(f"  Priemerná dĺžka: {avg_len:.0f} znakov")

def analyze_seeds(seeds):
    """Analýza kľúčových momentov"""
    if not seeds:
        print("\n⚠️ Žiadne seeds!")
        return
    
    print("\n🌱 SEEDS ANALYSIS")
    print("=" * 50)
    
    print(f"  Počet kľúčových momentov: {len(seeds)}")
    
    # Tagy (ak existujú)
    all_tags = []
    for seed in seeds:
        if 'tags' in seed:
            all_tags.extend(seed['tags'])
    
    if all_tags:
        tag_counts = Counter(all_tags)
        print(f"  Najčastejšie tagy:")
        for tag, count in tag_counts.most_common(5):
            print(f"    - {tag}: {count}x")

def analyze_triggers(triggers):
    """Analýza automatických triggerov"""
    if not triggers:
        print("\n⚠️ Žiadne triggers!")
        return
    
    print("\n⚡ TRIGGERS ANALYSIS")
    print("=" * 50)
    
    print(f"  Počet triggerov: {len(triggers)}")
    
    for key, value in triggers.items():
        if isinstance(value, dict):
            count = value.get('count', 0)
            print(f"  {key}: {count}x aktivácií")
        else:
            print(f"  {key}: {value}")

def check_duplicates(data_list):
    """Kontrola duplikátov v zozname"""
    if not isinstance(data_list, list):
        return 0
    
    # Porovnáme obsahy (nie celé objekty)
    contents = [json.dumps(item, sort_keys=True) for item in data_list]
    counter = Counter(contents)
    duplicates = sum(1 for count in counter.values() if count > 1)
    
    return duplicates

def calculate_file_size(filepath="data/memory.json"):
    """Veľkosť súboru"""
    if os.path.exists(filepath):
        size_bytes = os.path.getsize(filepath)
        size_kb = size_bytes / 1024
        size_mb = size_kb / 1024
        
        if size_mb > 1:
            return f"{size_mb:.2f} MB"
        else:
            return f"{size_kb:.2f} KB"
    return "N/A"

def generate_recommendations(memory):
    """Odporúčania pre optimalizáciu"""
    print("\n💡 ODPORÚČANIA")
    print("=" * 50)
    
    raw_count = len(memory.get('raw_log', []))
    seeds_count = len(memory.get('seeds', []))
    chapters_count = len(memory.get('chapters', []))
    
    if raw_count > 1000:
        print("  ⚠️ Raw log má viac ako 1000 záznamov")
        print("     → Zvažte konsolidáciu cez consolidationEngine.js")
    
    if seeds_count < 5:
        print("  ℹ️ Málo seeds (kľúčových momentov)")
        print("     → Pridajte viac /note príkazov pre dôležité udalosti")
    
    if chapters_count == 0:
        print("  ⚠️ Žiadne chapters (životné periódy)")
        print("     → Vytvorte prvý chapter cez memory systém")
    
    # Check duplicates
    duplicates = check_duplicates(memory.get('raw_log', []))
    if duplicates > 0:
        print(f"  ⚠️ Nájdených {duplicates} duplikátov v raw_log")
        print("     → Spustite cleanup pomocou memoryHelpers.js")

def main():
    """Main entry point"""
    print("🔥 SP4 MEMORY ANALYZER - POPIČI EDITION 🔥")
    print("Offline • Privacy First • No Bullshit\n")
    
    # Check both memory files
    memory_path = "data/memory.json"
    identity_path = "data/identity.json"
    
    memory_size = calculate_file_size(memory_path)
    identity_size = calculate_file_size(identity_path)
    
    print(f"📦 Memory súbor: {memory_size}")
    print(f"📦 Identity súbor: {identity_size}")
    
    # Determine which to analyze
    filepath = identity_path if os.path.exists(identity_path) else memory_path
    
    # Load memory
    memory = load_memory(filepath)
    if not memory:
        return
    
    # Analyze structure
    analyze_structure(memory)
    
    # Detailed analysis
    if 'raw_log' in memory:
        analyze_raw_log(memory['raw_log'])
    
    if 'seeds' in memory:
        analyze_seeds(memory['seeds'])
    
    if 'triggers' in memory:
        analyze_triggers(memory['triggers'])
    
    # Recommendations
    generate_recommendations(memory)
    
    # Show which file was analyzed
    analyzed_file = "identity.json" if filepath == identity_path else "memory.json"
    print(f"\n📊 Analyzovaný súbor: data/{analyzed_file}")
    
    print("\n" + "=" * 50)
    print("✅ Analýza dokončená. SP4 je zvyk, nie appka. 🔥")

if __name__ == "__main__":
    main()
