#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SP4 Memory Repair Tool - POPIČI Edition
Opraví rozbitý memory.json súbor
"""

import json
import re

def repair_memory():
    """Načíta a opraví memory.json"""
    
    print("🔧 SP4 MEMORY REPAIR TOOL")
    print("=" * 50)
    
    # Načítaj raw content
    with open('data/memory.json', 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"📦 Veľkosť súboru: {len(content)} bytes")
    
    # Find last valid closing bracket
    # Memory structure should end with: ] (array close) then } (object close)
    
    # Strategy: Find the last valid '}' before garbage
    # Look for pattern: }  ] } and everything after that is garbage
    
    # Find last occurrence of proper ending pattern
    pattern = r'\}\s*\]\s*\}$'
    
    # Remove everything after last proper closing
    # Find position of last valid structure
    lines = content.split('\n')
    
    # Find where garbage starts (look for duplicate closing or text fragments)
    valid_lines = []
    found_first_close = False
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # If we found the first proper closing and see another, stop
        if stripped == '}' and found_first_close:
            print(f"⚠️ Našiel duplicitné ukončenie na riadku {i+1}")
            break
        
        # If this is the main closing bracket
        if stripped == '}' and i == len(lines) - 1:
            found_first_close = True
        
        valid_lines.append(line)
    
    # Rebuild content
    repaired_content = '\n'.join(valid_lines)
    
    # Try to parse
    try:
        data = json.loads(repaired_content)
        print("✅ JSON je validný!")
        
        # Save repaired version
        with open('data/memory.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print("💾 Opravený súbor uložený")
        
        # Stats
        if 'onboarding' in data and isinstance(data['onboarding'], list):
            print(f"📊 Onboarding entries: {len(data['onboarding'])}")
        
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ Stále chyba: {e}")
        print(f"Pozícia: riadok {e.lineno}, stĺpec {e.colno}")
        
        # Show context around error
        error_line = e.lineno - 1
        start = max(0, error_line - 3)
        end = min(len(lines), error_line + 3)
        
        print("\nKontext chyby:")
        for i in range(start, end):
            marker = ">>> " if i == error_line else "    "
            print(f"{marker}{i+1}: {lines[i]}")
        
        return False

if __name__ == "__main__":
    success = repair_memory()
    
    if success:
        print("\n🔥 Memory opravená! Skús znova analyzer. 🔥")
    else:
        print("\n💀 Repair zlyhal. Manuálna oprava potrebná.")
