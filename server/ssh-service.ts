import { Client, SFTPWrapper } from "ssh2";

export interface SSHConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  path: string;
}

/**
 * SSH Service - Handles SSH connections and file operations
 * Uses a single persistent connection for all operations within a session.
 */
export class SSHService {
  private config: SSHConnectionConfig;

  constructor(config: SSHConnectionConfig) {
    this.config = config;
  }

  /**
   * Create a connected SSH client and SFTP session
   */
  private async connect(): Promise<{ conn: Client; sftp: SFTPWrapper }> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const timeout = setTimeout(() => {
        conn.end();
        reject(new Error("Connection timeout - server took too long to respond"));
      }, 30000);

      conn.on("ready", () => {
        conn.sftp((err, sftp) => {
          if (err) {
            clearTimeout(timeout);
            conn.end();
            reject(new Error(`SFTP error: ${err.message}`));
            return;
          }
          clearTimeout(timeout);
          resolve({ conn, sftp });
        });
      });

      conn.on("error", (err) => {
        clearTimeout(timeout);
        reject(new Error(`Connection error: ${err.message}`));
      });

      conn.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        readyTimeout: 30000,
        keepaliveInterval: 10000,
      });
    });
  }

  /**
   * Read a directory listing via SFTP
   */
  private readDir(sftp: SFTPWrapper, path: string): Promise<Array<{ filename: string }>> {
    return new Promise((resolve, reject) => {
      sftp.readdir(path, (err, list) => {
        if (err) reject(err);
        else resolve(list);
      });
    });
  }

  /**
   * Read a file via SFTP
   */
  private readFile(sftp: SFTPWrapper, filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`File read timeout: ${filePath}`));
      }, 15000);

      sftp.readFile(filePath, (err, data) => {
        clearTimeout(timeout);
        if (err) reject(err);
        else resolve(data.toString("utf8"));
      });
    });
  }

  /**
   * Test SSH connection — reports the number of MP3 files found (not combined mp3+txt)
   */
  async testConnection(): Promise<{ success: boolean; message: string; fileCount?: number }> {
    let conn: Client | null = null;
    try {
      const result = await this.connect();
      conn = result.conn;
      const sftp = result.sftp;

      const files = await this.readDir(sftp, this.config.path);
      const mp3Count = files.filter((f) => f.filename.endsWith(".mp3")).length;
      const txtCount = files.filter((f) => f.filename.endsWith(".txt")).length;

      conn.end();
      return {
        success: true,
        message: `Connection successful! Found ${mp3Count} songs (${txtCount} with metadata).`,
        fileCount: mp3Count,
      };
    } catch (error) {
      if (conn) conn.end();
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * List all music files and match MP3s with their TXT metadata files.
   * Uses bidirectional name matching to handle both exact and prefix matches.
   */
  async listMusicFiles(): Promise<{
    success: boolean;
    files: Array<{ mp3: string; txt?: string }>;
    message: string;
  }> {
    let conn: Client | null = null;
    try {
      const result = await this.connect();
      conn = result.conn;
      const sftp = result.sftp;

      const files = await this.readDir(sftp, this.config.path);

      const mp3Files = files
        .filter((f) => f.filename.endsWith(".mp3"))
        .map((f) => f.filename);
      const txtFiles = files
        .filter((f) => f.filename.endsWith(".txt"))
        .map((f) => f.filename);

      const musicFiles = mp3Files.map((mp3) => {
        const txtFile = matchTxtForMp3(mp3, txtFiles);
        return { mp3, txt: txtFile };
      });

      conn.end();
      return {
        success: true,
        files: musicFiles,
        message: `Found ${musicFiles.length} music files`,
      };
    } catch (error) {
      if (conn) conn.end();
      return {
        success: false,
        files: [],
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Sync library — list files AND read all metadata in a SINGLE connection.
   * FIX: adds source: "ssh" to every song so use-songs.ts can find them.
   * FIX: improved txt matching (bidirectional prefix), lyrics parsing, duration, cover art.
   */
  async syncLibraryFull(): Promise<{
    success: boolean;
    songs: Array<{
      id: string;
      title: string;
      artist: string;
      year?: number;
      genre: string;
      duration: number;
      lyrics: string;
      coverArtUrl?: string;
      fileName: string;
      source: "ssh";
      isCached: boolean;
    }>;
    message: string;
  }> {
    let conn: Client | null = null;
    try {
      const result = await this.connect();
      conn = result.conn;
      const sftp = result.sftp;

      console.log(`[SSH] Connected, reading directory: ${this.config.path}`);

      // Step 1: List all files
      const files = await this.readDir(sftp, this.config.path);
      console.log(`[SSH] Found ${files.length} total files`);

      const mp3Files = files
        .filter((f) => f.filename.endsWith(".mp3"))
        .map((f) => f.filename);
      const txtFiles = files
        .filter((f) => f.filename.endsWith(".txt"))
        .map((f) => f.filename);

      console.log(`[SSH] Found ${mp3Files.length} MP3 files and ${txtFiles.length} TXT files`);

      // Step 2: Match MP3s with TXT files using improved bidirectional matching
      const musicFiles = mp3Files.map((mp3) => {
        const txtFile = matchTxtForMp3(mp3, txtFiles);
        return { mp3, txt: txtFile };
      });

      const matchedCount = musicFiles.filter((f) => f.txt).length;
      console.log(`[SSH] Matched ${matchedCount}/${mp3Files.length} MP3s with TXT metadata`);

      // Step 3: Read metadata from TXT files using the SAME connection
      const songs: Array<{
        id: string;
        title: string;
        artist: string;
        year?: number;
        genre: string;
        duration: number;
        lyrics: string;
        coverArtUrl?: string;
        fileName: string;
        source: "ssh";
        isCached: boolean;
      }> = [];

      // Process files in batches of 5 to avoid overwhelming the connection
      const BATCH_SIZE = 5;
      const filesWithTxt = musicFiles.filter((f) => f.txt);

      for (let i = 0; i < filesWithTxt.length; i += BATCH_SIZE) {
        const batch = filesWithTxt.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.allSettled(
          batch.map(async (file) => {
            try {
              const filePath = `${this.config.path}/${file.txt}`;
              const content = await this.readFile(sftp, filePath);
              return { file, content };
            } catch (error) {
              console.error(`[SSH] Error reading ${file.txt}:`, error);
              return null;
            }
          })
        );

        for (const result of batchResults) {
          if (result.status === "fulfilled" && result.value) {
            const { file, content } = result.value;
            try {
              const metadata = parseMetadataContent(content);
              const genre = inferGenreFromContent(
                metadata.lyrics || "",
                metadata.title || file.mp3
              );

              songs.push({
                id: `ssh-${file.mp3}`,
                title: metadata.title || cleanFileName(file.mp3),
                artist: metadata.artist || "Unknown Artist",
                year: metadata.year,
                genre,
                duration: metadata.duration || 0,
                lyrics: metadata.lyrics || "",
                coverArtUrl: metadata.coverArtUrl,
                fileName: file.mp3,
                // ✅ FIX: always set source so use-songs.ts can find these songs
                source: "ssh",
                isCached: false,
              });
            } catch (error) {
              console.error(`[SSH] Error parsing metadata for ${file.txt}:`, error);
            }
          }
        }

        console.log(`[SSH] Processed ${Math.min(i + BATCH_SIZE, filesWithTxt.length)}/${filesWithTxt.length} files`);
      }

      // Also add MP3s without a matching TXT file
      for (const file of musicFiles) {
        if (!file.txt) {
          songs.push({
            id: `ssh-${file.mp3}`,
            title: cleanFileName(file.mp3),
            artist: "Unknown Artist",
            genre: "Uncategorized",
            duration: 0,
            lyrics: "",
            fileName: file.mp3,
            // ✅ FIX: source field required
            source: "ssh",
            isCached: false,
          });
        }
      }

      conn.end();
      console.log(`[SSH] Sync complete: ${songs.length} songs`);

      return {
        success: true,
        songs,
        message: `Synced ${songs.length} songs from SSH server`,
      };
    } catch (error) {
      if (conn) conn.end();
      console.error("[SSH] Sync error:", error);
      return {
        success: false,
        songs: [],
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Read metadata file content (opens its own connection)
   */
  async readMetadataFile(filename: string): Promise<string> {
    let conn: Client | null = null;
    try {
      const result = await this.connect();
      conn = result.conn;
      const sftp = result.sftp;

      const filePath = `${this.config.path}/${filename}`;
      const content = await this.readFile(sftp, filePath);

      conn.end();
      return content;
    } catch (error) {
      if (conn) conn.end();
      throw error;
    }
  }

  /**
   * Get MP3 file stream URL (for streaming)
   */
  getMp3StreamUrl(filename: string): string {
    return `/api/ssh/stream/${encodeURIComponent(filename)}`;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Match a TXT metadata file to an MP3 file using bidirectional prefix matching.
 * Handles cases where:
 *   - txt and mp3 share the exact same base name (most common)
 *   - txt name is shorter than mp3 name (e.g. "Song Title.txt" for "Song Title D03152025.mp3")
 *   - txt name is longer than mp3 name (e.g. "Song Title [Tag].txt" for "Song Title.mp3")
 */
function matchTxtForMp3(mp3: string, txtFiles: string[]): string | undefined {
  const baseName = mp3.replace(/\.mp3$/i, "");
  const baseNameLower = baseName.toLowerCase();

  // 1. Exact match (most reliable)
  const exact = txtFiles.find(
    (txt) => txt.replace(/\.txt$/i, "").toLowerCase() === baseNameLower
  );
  if (exact) return exact;

  // 2. txt starts with mp3 base name (txt has extra suffix)
  const txtHasSuffix = txtFiles.find((txt) =>
    txt.toLowerCase().startsWith(baseNameLower + " ") ||
    txt.toLowerCase().startsWith(baseNameLower + ".")
  );
  if (txtHasSuffix) return txtHasSuffix;

  // 3. mp3 base name starts with txt base name (mp3 has extra suffix like date stamp)
  const mp3HasSuffix = txtFiles.find((txt) => {
    const txtBase = txt.replace(/\.txt$/i, "").toLowerCase();
    return baseNameLower.startsWith(txtBase + " ") || baseNameLower.startsWith(txtBase + ".");
  });
  if (mp3HasSuffix) return mp3HasSuffix;

  return undefined;
}

/**
 * Clean a filename into a human-readable title by removing date stamps and version tags.
 */
function cleanFileName(mp3: string): string {
  return mp3
    .replace(/\.mp3$/i, "")
    .replace(/\s*D\d{8}\s*T\d{4}[AP]M\s*/gi, "")
    .replace(/\s*V\d+\s*$/i, "")
    .trim();
}

/**
 * Parse metadata from Suno AI format TXT file content.
 *
 * FIX: Handles the actual Suno AI format:
 *   - Lyrics section is "--- Lyrics ---" (not "Lyrics:")
 *   - Duration comes from the Raw API JSON block (metadata.duration)
 *   - Cover art prefers image_large_url over image_url
 *   - Artist comes from display_name in the JSON block
 */
function parseMetadataContent(content: string): {
  title?: string;
  artist?: string;
  year?: number;
  duration?: number;
  lyrics?: string;
  coverArtUrl?: string;
} {
  let title: string | undefined;
  let artist: string | undefined;
  let year: number | undefined;
  let duration: number | undefined;
  let lyrics = "";
  let coverArtUrl: string | undefined;

  // ── 1. Try to parse the embedded Raw API JSON block first (most reliable) ──
  const jsonMatch = content.match(/---\s*Raw API Response\s*---\s*(\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      const raw = JSON.parse(jsonMatch[1]);

      title = title || raw.title;
      artist = artist || raw.display_name || raw.handle;
      coverArtUrl = raw.image_large_url || raw.image_url;

      if (raw.created_at) {
        year = new Date(raw.created_at).getFullYear();
      }

      const meta = raw.metadata || {};
      // Duration is nested inside metadata in Suno's format
      if (typeof meta.duration === "number") {
        duration = meta.duration;
      }
      // Lyrics / prompt from metadata
      if (meta.prompt && !lyrics) {
        lyrics = meta.prompt;
      }
    } catch {
      // fall through to manual parsing
    }
  }

  // ── 2. Manual line-by-line parsing for header fields ──
  const lines = content.split("\n");
  let inLyrics = false;
  let manualLyrics = "";

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (inLyrics) manualLyrics += "\n";
      continue;
    }

    // Stop manual parsing when we hit the Raw API block
    if (trimmed.startsWith("--- Raw API Response")) break;

    if (/^[Tt]itle:\s*/.test(trimmed)) {
      if (!title) title = trimmed.replace(/^[Tt]itle:\s*/, "").trim();
    } else if (/^[Aa]rtist:\s*/.test(trimmed)) {
      if (!artist) artist = trimmed.replace(/^[Aa]rtist:\s*/, "").trim();
    } else if (/^[Yy]ear:\s*/.test(trimmed)) {
      if (!year) {
        const y = parseInt(trimmed.replace(/^[Yy]ear:\s*/, "").trim());
        if (!isNaN(y)) year = y;
      }
    } else if (/^[Dd]uration:\s*/.test(trimmed)) {
      if (!duration) {
        const d = parseFloat(trimmed.replace(/^[Dd]uration:\s*/, "").trim());
        if (!isNaN(d)) duration = d;
      }
    } else if (/^Cover Art URL:\s*/i.test(trimmed)) {
      if (!coverArtUrl) {
        const urlMatch = trimmed.match(/https?:\/\/[^\s"',]+/);
        if (urlMatch) coverArtUrl = urlMatch[0];
      }
    } else if (/^---\s*Lyrics\s*---$/i.test(trimmed)) {
      // ✅ FIX: the actual section header is "--- Lyrics ---"
      inLyrics = true;
    } else if (inLyrics && /^---/.test(trimmed)) {
      inLyrics = false;
    } else if (inLyrics) {
      manualLyrics += trimmed + "\n";
    }
  }

  // Use manual lyrics if JSON didn't provide them
  if (!lyrics && manualLyrics.trim()) {
    lyrics = manualLyrics.trim();
  }

  return {
    title,
    artist,
    year,
    duration,
    lyrics: lyrics.trim() || undefined,
    coverArtUrl,
  };
}

/**
 * Infer genre from lyrics and title using keyword matching.
 */
function inferGenreFromContent(lyrics: string, title: string): string {
  const text = `${title} ${lyrics}`.toLowerCase();
  const genreKeywords: [string, string[]][] = [
    ["Hip-Hop", ["rap", "hip hop", "hip-hop", "bars", "flow", "spit", "rhyme", "beat", "hood", "street", "hustle", "grind", "mic"]],
    ["R&B", ["r&b", "rnb", "soul", "smooth", "groove", "hold me", "love me"]],
    ["Rock", ["rock", "guitar", "drums", "loud", "scream", "metal", "punk", "electric", "emo"]],
    ["Pop", ["pop", "catchy", "hook", "dance", "party", "tonight", "summer", "upbeat"]],
    ["Country", ["country", "truck", "beer", "cowboy", "southern", "farm", "dirt road"]],
    ["Jazz", ["jazz", "swing", "blues", "saxophone", "trumpet", "improvise"]],
    ["Electronic", ["electronic", "edm", "synth", "bass drop", "techno", "house", "rave"]],
    ["Reggae", ["reggae", "rasta", "jamaica", "dub", "riddim"]],
    ["Latin", ["latin", "salsa", "reggaeton", "bachata", "cumbia"]],
    ["Gospel", ["gospel", "praise", "worship", "lord", "jesus", "faith", "blessed", "hallelujah"]],
    ["Classical", ["classical", "orchestra", "symphony", "piano", "violin"]],
    ["Acoustic", ["acoustic", "folk", "singer-songwriter", "ballad", "unplugged"]],
    ["Indie", ["indie", "alternative", "lo-fi"]],
  ];

  for (const [genre, keywords] of genreKeywords) {
    for (const kw of keywords) {
      if (text.includes(kw)) return genre;
    }
  }
  return "Other";
}

/**
 * Create SSH service from environment variables
 */
export function createSSHService(): SSHService {
  const host = process.env.SSH_HOST;
  const port = parseInt(process.env.SSH_PORT || "22");
  const username = process.env.SSH_USER;
  const password = process.env.SSH_PASS;
  const path = process.env.SSH_PATH || "/music";

  if (!host || !username || !password) {
    throw new Error("Missing SSH configuration in environment variables");
  }

  return new SSHService({ host, port, username, password, path });
}
