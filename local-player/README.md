# MusicLLM — Local Player

A fully self-contained music player that reads your Suno AI music library from a local folder and plays it in your browser. No internet required after setup.

---

## Requirements

- **Python 3.8+** — that's it. No Node.js, no npm, no other dependencies.
  - Download from [python.org](https://www.python.org/downloads/)
  - On Windows: check **"Add Python to PATH"** during installation

---

## Setup

1. **Clone or download the repo** into `C:\Users\nikol\Documents\app`

   ```
   git clone https://github.com/nikpereirsr/musicllm C:\Users\nikol\Documents\app
   ```

2. **Open the `local-player` folder**

   ```
   cd C:\Users\nikol\Documents\app\local-player
   ```

3. **Double-click `start.bat`** (Windows) or run `./start.sh` (Mac/Linux)

That's it. The script will:
- Scan your music folder at `C:\Users\nikol\Music\Nefarious\test\myworkspace`
- Parse all `.mp3` + `.txt` metadata files
- Build `songs.json`
- Start a local server on port 8888
- Open `http://localhost:8888` in your browser automatically

---

## File Structure

```
local-player/
├── start.bat          ← Double-click this on Windows
├── start.sh           ← Run this on Mac/Linux
├── server.py          ← Local HTTP server (Python, no install needed)
├── scan_library.py    ← Scans your music folder → songs.json
├── player.html        ← The music player UI
├── config.json        ← Auto-created: stores your music folder path
└── songs.json         ← Auto-created: your scanned library
```

---

## Changing Your Music Folder

**Option 1:** Edit `config.json` and change the `MUSIC_FOLDER` path:
```json
{
  "MUSIC_FOLDER": "C:\\Users\\nikol\\Music\\Nefarious\\test\\myworkspace"
}
```

**Option 2:** Pass the path as an argument to the start script:
```bat
start.bat "D:\MyMusic\AnotherFolder"
```

**Option 3:** Run the scanner directly:
```
python scan_library.py "C:\path\to\your\music"
```

---

## What Gets Displayed

For each song with a `.txt` metadata file (Suno AI format), the player shows:

| Section | Data |
|---|---|
| Now Playing | Cover art, title, artist, @handle, avatar, genre tags, model version, Remix badge |
| Track Details | Duration, creation date, year, Suno ID, public/private, explicit, can remix, has stem |
| Generation Details | Model name + version, type (Remix/Original), instrumental, has hook |
| Style Sliders | Style Weight and Weirdness as visual bars |
| Engagement | Play count, skip count, upvotes, comments |
| Mood & Style Tags | All prompt tags (acoustic, pain, chilling, emo…) |
| Lyrics | Full formatted lyrics |

Songs without a `.txt` file are still playable — they just show the filename as the title.

---

## Stopping the Server

Press `Ctrl+C` in the terminal window, or just close the terminal.

---

## Troubleshooting

**"Port 8888 is already in use"**
Another instance is already running. Close the other terminal window, or change `PORT = 8888` in `server.py`.

**Songs don't appear**
Run `start.bat` again — it re-scans the folder each time. Check that your music folder path is correct in `config.json`.

**Cover art doesn't load for one song**
Some Suno CDN images block external requests. The player falls back to a 🎵 emoji automatically.

**Python not found on Windows**
Download from [python.org](https://www.python.org/downloads/) and check "Add Python to PATH" during install. Then restart your terminal.
