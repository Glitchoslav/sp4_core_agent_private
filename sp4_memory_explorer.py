#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔥 SP4 Memory Explorer - Interactive CLI Tool
Created by: Full Autonomy v2.0 (manual fallback edition)
Features: Browse, Search, Export, Delete duplicates, Stats dashboard
"""

import json
import os
import sys
from datetime import datetime
from collections import Counter

try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.prompt import Prompt, Confirm
    from rich import print as rprint
except ImportError:
    print("❌ Missing 'rich' library!")
    print("Install: pip install rich")
    sys.exit(1)

console = Console()

MEMORY_FILE = "data/memory.json"
IDENTITY_FILE = "data/identity.json"


def load_json(filepath):
    """Load JSON file"""
    if not os.path.exists(filepath):
        return None
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        console.print(f"[red]❌ Error loading {filepath}: {e}[/red]")
        return None


def save_json(filepath, data):
    """Save JSON file"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        console.print(f"[red]❌ Error saving {filepath}: {e}[/red]")
        return False


def browse_seeds():
    """Browse all seeds"""
    memory = load_json(MEMORY_FILE)
    if not memory:
        console.print("[yellow]⚠️  No memory file found[/yellow]")
        return
    
    seeds = memory.get('seeds', [])
    
    if not seeds:
        console.print("[yellow]📭 No seeds found[/yellow]")
        return
    
    table = Table(title="🌱 SP4 Memory Seeds", show_header=True, header_style="bold magenta")
    table.add_column("ID", style="dim", width=20)
    table.add_column("Text", style="cyan", width=50)
    table.add_column("Timestamp", style="green")
    table.add_column("Tags", style="yellow")
    
    for seed in seeds:
        seed_id = seed.get('id', 'N/A')
        text = seed.get('text', 'N/A')[:47] + "..." if len(seed.get('text', '')) > 50 else seed.get('text', 'N/A')
        timestamp = seed.get('timestamp', 'N/A')[:16] if seed.get('timestamp') else 'N/A'
        tags = ', '.join(seed.get('tags', []))
        
        table.add_row(seed_id, text, timestamp, tags)
    
    console.print(table)
    console.print(f"\n[bold]Total seeds: {len(seeds)}[/bold]")


def search_full_text():
    """Full-text search across all memory"""
    query = Prompt.ask("\n🔍 Enter search query")
    
    if not query:
        console.print("[yellow]Empty query[/yellow]")
        return
    
    memory = load_json(MEMORY_FILE)
    identity = load_json(IDENTITY_FILE)
    
    results = []
    
    # Search in memory
    if memory:
        seeds = memory.get('seeds', [])
        for seed in seeds:
            text = seed.get('text', '')
            if query.lower() in text.lower():
                results.append(('seed', seed))
        
        raw_log = memory.get('raw_log', [])
        for entry in raw_log:
            content = entry.get('content', '')
            if query.lower() in content.lower():
                results.append(('raw_log', entry))
    
    # Search in identity
    if identity:
        audit_log = identity.get('auditLog', [])
        for entry in audit_log:
            event = str(entry.get('event', ''))
            if query.lower() in event.lower():
                results.append(('audit', entry))
    
    if not results:
        console.print(f"[yellow]❌ No results for '{query}'[/yellow]")
        return
    
    table = Table(title=f"🔍 Search Results for '{query}'", show_header=True, header_style="bold cyan")
    table.add_column("Source", style="magenta", width=12)
    table.add_column("Content", style="white", width=60)
    table.add_column("Timestamp", style="green")
    
    for source, item in results[:20]:  # Limit to 20 results
        content = str(item.get('text', item.get('content', item.get('event', 'N/A'))))[:57] + "..." if len(str(item.get('text', item.get('content', item.get('event', ''))))) > 60 else str(item.get('text', item.get('content', item.get('event', 'N/A'))))
        timestamp = item.get('timestamp', 'N/A')[:16] if item.get('timestamp') else 'N/A'
        
        table.add_row(source, content, timestamp)
    
    console.print(table)
    console.print(f"\n[bold]Total results: {len(results)} (showing first 20)[/bold]")


def export_data():
    """Export memory to JSON/CSV"""
    format_choice = Prompt.ask("\n📦 Export format", choices=["json", "csv"], default="json")
    
    memory = load_json(MEMORY_FILE)
    identity = load_json(IDENTITY_FILE)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if format_choice == "json":
        export_data = {
            "exportedAt": datetime.now().isoformat(),
            "memory": memory,
            "identity": {
                "activeMode": identity.get('activeMode') if identity else None,
                "driftHistory": identity.get('driftHistory', [])[-10:] if identity else [],  # Last 10
                "auditLog": identity.get('auditLog', [])[-50:] if identity else []  # Last 50
            }
        }
        
        export_path = f"data/export_{timestamp}.json"
        
        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
        
        console.print(f"[green]✅ Exported to {export_path}[/green]")
    
    else:  # CSV
        import csv
        
        export_path = f"data/export_{timestamp}.csv"
        
        seeds = memory.get('seeds', []) if memory else []
        
        with open(export_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['id', 'text', 'timestamp', 'tags', 'importance'])
            writer.writeheader()
            
            for seed in seeds:
                writer.writerow({
                    'id': seed.get('id', ''),
                    'text': seed.get('text', ''),
                    'timestamp': seed.get('timestamp', ''),
                    'tags': ','.join(seed.get('tags', [])),
                    'importance': seed.get('importance', 5)
                })
        
        console.print(f"[green]✅ Exported {len(seeds)} seeds to {export_path}[/green]")


def delete_duplicates():
    """Delete duplicate seeds"""
    memory = load_json(MEMORY_FILE)
    
    if not memory:
        console.print("[yellow]⚠️  No memory file[/yellow]")
        return
    
    seeds = memory.get('seeds', [])
    
    if not seeds:
        console.print("[yellow]📭 No seeds to check[/yellow]")
        return
    
    # Find duplicates by text content
    seen = {}
    duplicates = []
    
    for i, seed in enumerate(seeds):
        text = seed.get('text', '')
        if text in seen:
            duplicates.append(i)
        else:
            seen[text] = i
    
    if not duplicates:
        console.print("[green]✅ No duplicates found[/green]")
        return
    
    console.print(f"[yellow]⚠️  Found {len(duplicates)} duplicate seeds[/yellow]")
    
    if Confirm.ask("Delete duplicates?"):
        # Remove duplicates (keep first occurrence)
        new_seeds = [seed for i, seed in enumerate(seeds) if i not in duplicates]
        
        memory['seeds'] = new_seeds
        
        if save_json(MEMORY_FILE, memory):
            console.print(f"[green]✅ Deleted {len(duplicates)} duplicates[/green]")
            console.print(f"[bold]Remaining seeds: {len(new_seeds)}[/bold]")
        else:
            console.print("[red]❌ Failed to save[/red]")
    else:
        console.print("[yellow]Cancelled[/yellow]")


def show_stats():
    """Show statistics dashboard"""
    memory = load_json(MEMORY_FILE)
    identity = load_json(IDENTITY_FILE)
    
    # File sizes
    memory_size = os.path.getsize(MEMORY_FILE) / 1024 if os.path.exists(MEMORY_FILE) else 0
    identity_size = os.path.getsize(IDENTITY_FILE) / 1024 if os.path.exists(IDENTITY_FILE) else 0
    
    stats_table = Table(title="📊 SP4 Memory Statistics", show_header=False, box=None)
    stats_table.add_column("Metric", style="cyan", width=30)
    stats_table.add_column("Value", style="bold yellow")
    
    # File stats
    stats_table.add_row("📦 Memory file size", f"{memory_size:.2f} KB")
    stats_table.add_row("📦 Identity file size", f"{identity_size:.2f} KB")
    
    # Memory stats
    if memory:
        seeds_count = len(memory.get('seeds', []))
        raw_log_count = len(memory.get('raw_log', []))
        chapters_count = len(memory.get('chapters', []))
        
        stats_table.add_row("", "")
        stats_table.add_row("🌱 Seeds", str(seeds_count))
        stats_table.add_row("📝 Raw log entries", str(raw_log_count))
        stats_table.add_row("📖 Chapters", str(chapters_count))
        
        # Seed tags distribution
        if seeds_count > 0:
            all_tags = []
            for seed in memory.get('seeds', []):
                all_tags.extend(seed.get('tags', []))
            
            if all_tags:
                tag_counts = Counter(all_tags)
                top_tags = tag_counts.most_common(5)
                
                stats_table.add_row("", "")
                stats_table.add_row("🏷️  Top tags", "")
                for tag, count in top_tags:
                    stats_table.add_row(f"   {tag}", str(count))
    
    # Identity stats
    if identity:
        active_mode = identity.get('activeMode', 'N/A')
        drift_count = len(identity.get('driftHistory', []))
        audit_count = len(identity.get('auditLog', []))
        
        stats_table.add_row("", "")
        stats_table.add_row("🎭 Active mode", active_mode)
        stats_table.add_row("📈 Drift history", str(drift_count))
        stats_table.add_row("📋 Audit log", str(audit_count))
    
    console.print(stats_table)


def main_menu():
    """Main interactive menu"""
    console.clear()
    
    panel = Panel.fit(
        "[bold cyan]🔥 SP4 MEMORY EXPLORER 🔥[/bold cyan]\n"
        "[dim]Interactive CLI Tool for SP4 Memory Management[/dim]",
        border_style="bright_blue"
    )
    console.print(panel)
    
    while True:
        console.print("\n[bold yellow]📋 Main Menu:[/bold yellow]")
        console.print("  [cyan]1[/cyan] → Browse seeds")
        console.print("  [cyan]2[/cyan] → Search full-text")
        console.print("  [cyan]3[/cyan] → Export to JSON/CSV")
        console.print("  [cyan]4[/cyan] → Delete duplicates")
        console.print("  [cyan]5[/cyan] → Stats dashboard")
        console.print("  [cyan]0[/cyan] → Exit")
        
        choice = Prompt.ask("\n👉 Choose option", choices=["0", "1", "2", "3", "4", "5"], default="5")
        
        if choice == "1":
            browse_seeds()
        elif choice == "2":
            search_full_text()
        elif choice == "3":
            export_data()
        elif choice == "4":
            delete_duplicates()
        elif choice == "5":
            show_stats()
        elif choice == "0":
            console.print("\n[bold green]👋 Dovidenia! SP4 je zvyk, nie appka. 🔥[/bold green]\n")
            break


if __name__ == "__main__":
    try:
        main_menu()
    except KeyboardInterrupt:
        console.print("\n\n[yellow]⚠️  Interrupted by user[/yellow]")
        sys.exit(0)
    except Exception as e:
        console.print(f"\n[red]❌ Fatal error: {e}[/red]")
        sys.exit(1)
