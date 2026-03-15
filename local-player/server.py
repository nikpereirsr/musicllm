#!/usr/bin/env python3
"""
server.py — MusicLLM Local Server
Serves the music player HTML page and streams audio files from the music folder.
Runs on http://localhost:8888
"""

import json
import os
import sys
import mimetypes
import urllib.parse
import webbrowser
import threading
import time
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

# ── Config ────────────────────────────────────────────────────────────────────

BASE_DIR    = Path(__file__).parent
CONFIG_FILE = BASE_DIR / "config.json"
SONGS_FILE  = BASE_DIR / "songs.json"
PLAYER_FILE = BASE_DIR / "player.html"
PORT        = 8888

def load_config() -> dict:
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}

# ── Request handler ───────────────────────────────────────────────────────────

class MusicHandler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        # Suppress default noisy access log; only show errors
        if args and str(args[1]) not in ("200", "206", "304"):
            print(f"  [{args[1]}] {args[0]}")

    def send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Range")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path   = urllib.parse.unquote(parsed.path)

        # ── Routes ────────────────────────────────────────────────────────────

        # Root → player
        if path in ("/", "/index.html", "/player.html"):
            self.serve_file(PLAYER_FILE, "text/html; charset=utf-8")

        # Songs JSON API
        elif path == "/api/songs":
            self.serve_json(SONGS_FILE)

        # Audio streaming
        elif path.startswith("/audio/"):
            filename = path[len("/audio/"):]
            cfg = load_config()
            music_folder = Path(cfg.get("MUSIC_FOLDER", ""))
            if not music_folder.exists():
                self.send_error(503, "Music folder not configured. Run start.bat first.")
                return
            audio_file = music_folder / filename
            self.serve_audio(audio_file)

        # 404
        else:
            self.send_error(404, f"Not found: {path}")

    # ── Helpers ───────────────────────────────────────────────────────────────

    def serve_file(self, file_path: Path, content_type: str):
        if not file_path.exists():
            self.send_error(404, f"File not found: {file_path.name}")
            return
        data = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_cors()
        self.end_headers()
        self.wfile.write(data)

    def serve_json(self, file_path: Path):
        if not file_path.exists():
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors()
            self.end_headers()
            self.wfile.write(b"[]")
            return
        data = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_cors()
        self.end_headers()
        self.wfile.write(data)

    def serve_audio(self, file_path: Path):
        if not file_path.exists():
            self.send_error(404, f"Audio file not found: {file_path.name}")
            return

        file_size = file_path.stat().st_size
        mime_type = mimetypes.guess_type(str(file_path))[0] or "audio/mpeg"

        # Support Range requests for seeking
        range_header = self.headers.get("Range")
        if range_header:
            try:
                range_val = range_header.strip().replace("bytes=", "")
                start_str, end_str = range_val.split("-")
                start = int(start_str) if start_str else 0
                end   = int(end_str)   if end_str   else file_size - 1
                end   = min(end, file_size - 1)
                length = end - start + 1

                self.send_response(206)
                self.send_header("Content-Type", mime_type)
                self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
                self.send_header("Content-Length", str(length))
                self.send_header("Accept-Ranges", "bytes")
                self.send_cors()
                self.end_headers()

                with open(file_path, "rb") as f:
                    f.seek(start)
                    remaining = length
                    while remaining > 0:
                        chunk = f.read(min(65536, remaining))
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        remaining -= len(chunk)
            except Exception as e:
                self.send_error(500, str(e))
        else:
            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(file_size))
            self.send_header("Accept-Ranges", "bytes")
            self.send_cors()
            self.end_headers()

            with open(file_path, "rb") as f:
                while True:
                    chunk = f.read(65536)
                    if not chunk:
                        break
                    self.wfile.write(chunk)

# ── Main ──────────────────────────────────────────────────────────────────────

def open_browser():
    time.sleep(1.2)
    webbrowser.open(f"http://localhost:{PORT}")

def main():
    cfg = load_config()
    music_folder = cfg.get("MUSIC_FOLDER", "")

    if not music_folder:
        print("WARNING: No music folder configured. Run start.bat to set it up.")
    else:
        print(f"Music folder : {music_folder}")

    if not SONGS_FILE.exists():
        print("WARNING: songs.json not found. Run start.bat to scan your library.")
    else:
        with open(SONGS_FILE, encoding="utf-8") as f:
            songs = json.load(f)
        print(f"Library      : {len(songs)} songs")

    print(f"Player URL   : http://localhost:{PORT}")
    print("Opening browser…\n")

    threading.Thread(target=open_browser, daemon=True).start()

    try:
        httpd = HTTPServer(("localhost", PORT), MusicHandler)
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except OSError as e:
        if "Address already in use" in str(e) or "10048" in str(e):
            print(f"\nERROR: Port {PORT} is already in use.")
            print("Close any other MusicLLM window and try again, or change PORT in server.py")
        else:
            raise

if __name__ == "__main__":
    main()
