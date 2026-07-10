#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SP4 COMPLETE ANALYZER - POPIČI Edition 💀
Analyzuje CELÚ SP4 pamäť: identity.json + memory.json
Pozná skutočnú architektúru oboch súborov.
"""

import json
import os
from collections import Counter
from datetime import datetime

def load_json(filepath):
    """Načíta JSON súbor"""
    if not os.path.exists(filepath):
        return None
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Chyba pri čítaní {filepath}: {e}")
        return None

def analyze_identity(identity):
    """Analyzuje identity.json (baseline, current, drift)"""
    if not identity:
        return
    
    print("\n🎭 IDENTITY ANALYSIS (Persona System)")
    print("=" * 50)
    
    # Active mode
    active_mode = identity.get('activeMode', 'N/A')
    print(f"  Aktívny mód: {active_mode}")
    
    # Mode profiles
    mode_profiles = identity.get('modeProfiles', {})
    print(f"  Dostupné módy: {len(mode_profiles)}")
    for mode, profile in mode_profiles.items():
        usage = profile.get('usageCount', 0)
        print(f"    - {mode}: {usage}x použitý")
    
    # Drift history
    drift_history = identity.get('driftHistory', [])
    print(f"  Drift história: {len(drift_history)} záznamov")
    
    if drift_history:
        # Last drift
        last_drift = drift_history[-1]
        score = last_drift.get('similarity', 0)
        timestamp = last_drift.get('timestamp', 'N/A')
        print(f"  Posledný drift: {score:.1%} similarity ({timestamp})")
    
    # Audit log
    audit_log = identity.get('auditLog', [])
    print(f"  Audit log: {len(audit_log)} záznamov")
    
    # Baseline vs current
    baseline = identity.get('baseline', {})
    current = identity.get('current', {})
    
    if baseline and current:
        print(f"\n  Baseline interakcie: {baseline.get('totalInteractions', 0)}")
        print(f"  Current interakcie: {current.get('totalInteractions', 0)}")

def analyze_memory(memory):
    """Analyzuje memory.json (raw_log, seeds, chapters)"""
    if not memory:
        return
    
    print("\n🧠 MEMORY ANALYSIS (Conversation System)")
    print("=" * 50)
    
    # Check for onboarding (sometimes memory.json only has this)
    if 'onboarding' in memory and not any(k in memory for k in ['raw_log', 'seeds', 'chapters']):
        print("  ⚠️ Memory obsahuje len ONBOARDING data")
        onboarding = memory.get('onboarding', [])
        print(f"  Onboarding entries: {len(onboarding)}")
        return
    
    # Standard memory structure
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
            print(f"  {layer:12s} → CHÝBA")
    
    # Detailed raw_log analysis
    if 'raw_log' in memory and memory['raw_log']:
        raw_log = memory['raw_log']
        user_msgs = sum(1 for r in raw_log if r.get('role') == 'user')
        ai_msgs = sum(1 for r in raw_log if r.get('role') == 'assistant')
        print(f"\n  Raw log detail:")
        print(f"    User správy: {user_msgs}")
        print(f"    AI odpovede: {ai_msgs}")

def calculate_file_size(filepath):
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

def generate_recommendations(identity, memory):
    """Odporúčania pre optimalizáciu"""
    print("\n💡 ODPORÚČANIA")
    print("=" * 50)
    
    # Check identity
    if identity:
        drift_history = identity.get('driftHistory', [])
        if len(drift_history) > 100:
            print("  ⚠️ Drift história má viac ako 100 záznamov")
            print("     → Zvažte cleanup starých driftov")
        
        audit_log = identity.get('auditLog', [])
        if len(audit_log) > 500:
            print("  ⚠️ Audit log má viac ako 500 záznamov")
            print("     → Archivujte staré záznamy")
    
    # Check memory
    if memory:
        if 'onboarding' in memory and not any(k in memory for k in ['raw_log', 'seeds']):
            print("  ℹ️ Memory je v onboarding režime")
            print("     → Spustite agenta a začnite konverzáciu")
        
        raw_count = len(memory.get('raw_log', []))
        if raw_count > 1000:
            print("  ⚠️ Raw log má viac ako 1000 záznamov")
            print("     → Spustite konsolidáciu cez consolidationEngine.js")
        
        seeds_count = len(memory.get('seeds', []))
        if seeds_count < 5 and raw_count > 50:
            print("  ℹ️ Málo seeds oproti raw_log")
            print("     → Pridajte viac /note príkazov pre dôležité udalosti")

def main():
    """Main entry point"""
    print("🔥 SP4 COMPLETE ANALYZER - POPIČI EDITION 🔥")
    print("Offline • Privacy First • No Bullshit\n")
    
    # Paths
    identity_path = "data/identity.json"
    memory_path = "data/memory.json"
    
    # Load both
    identity = load_json(identity_path)
    memory = load_json(memory_path)
    
    # File sizes
    identity_size = calculate_file_size(identity_path)
    memory_size = calculate_file_size(memory_path)
    
    print(f"📦 identity.json: {identity_size}")
    print(f"📦 memory.json: {memory_size}")
    
    # Analyze both
    analyze_identity(identity)
    analyze_memory(memory)
    
    # Recommendations
    generate_recommendations(identity, memory)
    
    print("\n" + "=" * 50)
    print("✅ Kompletná analýza dokončená. SP4 je zvyk, nie appka. 🔥")

if __name__ == "__main__":
    main()
