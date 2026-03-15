#!/usr/bin/env python3
"""
scan_library.py — MusicLLM Local Library Scanner
Scans a folder of mp3 + txt (Suno AI metadata) files and produces songs.json.
Usage: python scan_library.py [music_folder]
       If no folder is given, uses the path in config.json (MUSIC_FOLDER key).
"""

import os
import sys
import json
import re
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

CONFIG_FILE = Path(__file__).parent / "config.json"
OUTPUT_FILE = Path(__file__).parent / "songs.json"

def load_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_config(cfg):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

# ── Metadata parser ───────────────────────────────────────────────────────────

def parse_txt(txt_path: Path) -> dict:
    """Parse a Suno AI .txt metadata file and return a dict of fields."""
    try:
        content = txt_path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return {}

    result = {}

    # --- Raw API JSON block ---
    json_match = re.search(r'---\s*Raw API Response\s*---\s*\n(\{[\s\S]*\})', content)
    raw = {}
    if json_match:
        try:
            raw = json.loads(json_match.group(1))
        except Exception:
            pass

    meta = raw.get("metadata", {})

    # --- Lyrics ---
    lyrics_match = re.search(r'---\s*Lyrics\s*---\s*\n([\s\S]*?)(?=\nCover Art URL:|\n---|\Z)', content)
    lyrics = ""
    if lyrics_match:
        lyrics = lyrics_match.group(1).strip()
    if not lyrics:
        lyrics = meta.get("prompt", "")

    # --- Display tags ---
    display_tags_raw = raw.get("display_tags", "")
    display_tags = [t.strip() for t in display_tags_raw.split(",") if t.strip()] if isinstance(display_tags_raw, str) else []

    # --- All mood/style tags ---
    all_tags_raw = meta.get("tags", "")
    all_tags = [t.strip() for t in all_tags_raw.split(",") if t.strip()] if isinstance(all_tags_raw, str) else []

    # --- Style sliders ---
    sliders = meta.get("control_sliders", {})

    # --- Derive year from createdAt ---
    created_at = raw.get("created_at", "")
    year = int(created_at[:4]) if created_at and len(created_at) >= 4 else None

    result = {
        "sunoId":              raw.get("id", ""),
        "title":               raw.get("title", txt_path.stem),
        "artist":              raw.get("display_name", ""),
        "handle":              raw.get("handle", ""),
        "avatarUrl":           raw.get("avatar_image_url", ""),
        "year":                year,
        "createdAt":           created_at,
        "coverArtUrl":         raw.get("image_large_url") or raw.get("image_url", ""),
        "coverArtSmallUrl":    raw.get("image_url", ""),
        "duration":            meta.get("duration", 0),
        "genre":               display_tags[0].title() if display_tags else "Other",
        "displayTags":         display_tags,
        "allTags":             all_tags,
        "lyrics":              lyrics,
        "modelName":           raw.get("model_name", ""),
        "modelVersion":        raw.get("major_model_version", ""),
        "usesLatestModel":     meta.get("uses_latest_model", False),
        "isRemix":             meta.get("is_remix", False),
        "canRemix":            meta.get("can_remix", False),
        "makeInstrumental":    meta.get("make_instrumental", False),
        "hasStem":             meta.get("has_stem", False),
        "hasHook":             raw.get("has_hook", False),
        "isExplicit":          raw.get("explicit", False),
        "isPublic":            raw.get("is_public", False),
        "styleWeight":         sliders.get("style_weight"),
        "weirdnessConstraint": sliders.get("weirdness_constraint"),
        "playCount":           raw.get("play_count", 0),
        "upvoteCount":         raw.get("upvote_count", 0),
        "commentCount":        raw.get("comment_count", 0),
        "skipCount":           raw.get("reaction", {}).get("skip_count", 0),
    }
    return result

# ── Scanner ───────────────────────────────────────────────────────────────────

def scan_folder(music_folder: Path) -> list:
    """Scan a folder for mp3 files and pair them with txt metadata files."""
    if not music_folder.exists():
        print(f"ERROR: Music folder not found: {music_folder}")
        sys.exit(1)

    mp3_files = sorted(music_folder.glob("*.mp3"))
    if not mp3_files:
        print(f"WARNING: No .mp3 files found in {music_folder}")
        return []

    songs = []
    matched = 0
    unmatched = 0

    for mp3 in mp3_files:
        base = mp3.stem  # filename without extension

        # Try to find matching txt: exact match first, then prefix match
        txt_exact = mp3.with_suffix(".txt")
        txt_file = None
        if txt_exact.exists():
            txt_file = txt_exact
        else:
            # Look for any txt whose stem starts with the mp3 stem or vice versa
            for txt in music_folder.glob("*.txt"):
                ts = txt.stem
                if ts.startswith(base) or base.startswith(ts):
                    txt_file = txt
                    break

        meta = parse_txt(txt_file) if txt_file else {}

        # Build song ID
        suno_id = meta.get("sunoId") or base
        song_id = f"local-{suno_id}"

        # Audio URL will be served by the local server as /audio/<filename>
        audio_url = "/audio/" + mp3.name

        song = {
            "id":              song_id,
            "fileName":        mp3.name,
            "audioUrl":        audio_url,
            "source":          "local",
            "isCached":        True,
            # Merge parsed metadata (defaults if no txt found)
            "sunoId":          meta.get("sunoId", ""),
            "title":           meta.get("title", base),
            "artist":          meta.get("artist", "Unknown Artist"),
            "handle":          meta.get("handle", ""),
            "avatarUrl":       meta.get("avatarUrl", ""),
            "year":            meta.get("year"),
            "createdAt":       meta.get("createdAt", ""),
            "coverArtUrl":     meta.get("coverArtUrl", ""),
            "coverArtSmallUrl":meta.get("coverArtSmallUrl", ""),
            "duration":        meta.get("duration", 0),
            "genre":           meta.get("genre", "Other"),
            "displayTags":     meta.get("displayTags", []),
            "allTags":         meta.get("allTags", []),
            "lyrics":          meta.get("lyrics", ""),
            "modelName":       meta.get("modelName", ""),
            "modelVersion":    meta.get("modelVersion", ""),
            "usesLatestModel": meta.get("usesLatestModel", False),
            "isRemix":         meta.get("isRemix", False),
            "canRemix":        meta.get("canRemix", False),
            "makeInstrumental":meta.get("makeInstrumental", False),
            "hasStem":         meta.get("hasStem", False),
            "hasHook":         meta.get("hasHook", False),
            "isExplicit":      meta.get("isExplicit", False),
            "isPublic":        meta.get("isPublic", False),
            "styleWeight":     meta.get("styleWeight"),
            "weirdnessConstraint": meta.get("weirdnessConstraint"),
            "playCount":       meta.get("playCount", 0),
            "upvoteCount":     meta.get("upvoteCount", 0),
            "commentCount":    meta.get("commentCount", 0),
            "skipCount":       meta.get("skipCount", 0),
        }
        songs.append(song)

        if txt_file:
            matched += 1
            print(f"  [OK]  {mp3.name[:60]}")
        else:
            unmatched += 1
            print(f"  [--]  {mp3.name[:60]}  (no metadata txt)")

    print(f"\nScanned {len(songs)} songs ({matched} with metadata, {unmatched} without)")
    return songs

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    cfg = load_config()

    # Music folder: CLI arg > config.json > prompt user
    if len(sys.argv) > 1:
        music_folder = Path(sys.argv[1])
        cfg["MUSIC_FOLDER"] = str(music_folder)
        save_config(cfg)
    elif cfg.get("MUSIC_FOLDER"):
        music_folder = Path(cfg["MUSIC_FOLDER"])
    else:
        default = r"C:\Users\nikol\Music\Nefarious\test\myworkspace"
        user_input = input(f"Enter path to your music folder [{default}]: ").strip()
        music_folder = Path(user_input if user_input else default)
        cfg["MUSIC_FOLDER"] = str(music_folder)
        save_config(cfg)

    print(f"\nScanning: {music_folder}\n")
    songs = scan_folder(music_folder)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(songs, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(songs)} songs to {OUTPUT_FILE}")
    return len(songs)

if __name__ == "__main__":
    main()
