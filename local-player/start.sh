#!/bin/bash
# MusicLLM Local Player — Mac/Linux launcher
set -e
cd "$(dirname "$0")"

echo ""
echo " ================================================"
echo "  MusicLLM Local Player"
echo " ================================================"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
    echo " ERROR: python3 is not installed."
    echo " Install it with: brew install python3  (Mac)"
    echo "              or: sudo apt install python3  (Linux)"
    exit 1
fi

# Default music folder (change this if needed)
MUSIC_FOLDER="${1:-$HOME/Music/Nefarious/test/myworkspace}"

if [ -d "$MUSIC_FOLDER" ]; then
    echo " Music folder: $MUSIC_FOLDER"
else
    echo " WARNING: Music folder not found: $MUSIC_FOLDER"
    read -p " Enter your music folder path: " MUSIC_FOLDER
fi

echo ""
echo " Scanning library..."
python3 scan_library.py "$MUSIC_FOLDER"

echo ""
echo " Starting player server at http://localhost:8888"
echo " Press Ctrl+C to stop."
echo ""

python3 server.py
