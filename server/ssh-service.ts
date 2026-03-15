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
   * Test SSH connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; fileCount?: number }> {
    let conn: Client | null = null;
    try {
      const result = await this.connect();
      conn = result.conn;
      const sftp = result.sftp;

      const files = await this.readDir(sftp, this.config.path);
      const musicFiles = files.filter(
        (f) => f.filename.endsWith(".mp3") || f.filename.endsWith(".txt")
      );

      conn.end();
      return {
        success: true,
        message: `Connection successful! Found ${musicFiles.length} music files.`,
        fileCount: musicFiles.length,
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
   * List all music files and match MP3s with their TXT metadata files
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
        const baseName = mp3.replace(".mp3", "");
        const txtFile = txtFiles.find((txt) => txt.startsWith(baseName));
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
   * Sync library - list files AND read all metadata in a SINGLE connection
   * This avoids opening hundreds of separate SSH connections.
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

      // Step 2: Match MP3s with TXT files
      const musicFiles = mp3Files.map((mp3) => {
        const baseName = mp3.replace(".mp3", "");
        const txtFile = txtFiles.find((txt) => txt.startsWith(baseName));
        return { mp3, txt: txtFile };
      });

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
                title: metadata.title || file.mp3.replace(".mp3", ""),
                artist: metadata.artist || "Unknown Artist",
                year: metadata.year,
                genre,
                duration: metadata.duration || 0,
                lyrics: metadata.lyrics || "",
                coverArtUrl: metadata.coverArtUrl,
                fileName: file.mp3,
                isCached: false,
              });
            } catch (error) {
              console.error(`[SSH] Error parsing metadata for ${file.txt}:`, error);
            }
          }
        }

        console.log(`[SSH] Processed ${Math.min(i + BATCH_SIZE, filesWithTxt.length)}/${filesWithTxt.length} files`);
      }

      // Also add MP3s without metadata
      for (const file of musicFiles) {
        if (!file.txt) {
          const cleanName = file.mp3
            .replace(".mp3", "")
            .replace(/D\d{8}\s*T\d{4}[AP]M/g, "")
            .replace(/\s*V\d+\s*$/, "")
            .trim();

          songs.push({
            id: `ssh-${file.mp3}`,
            title: cleanName || file.mp3.replace(".mp3", ""),
            artist: "Unknown Artist",
            genre: "Uncategorized",
            duration: 0,
            lyrics: "",
            fileName: file.mp3,
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

/**
 * Parse metadata from Suno AI format TXT file content
 */
function parseMetadataContent(content: string): {
  title?: string;
  artist?: string;
  year?: number;
  duration?: number;
  lyrics?: string;
  coverArtUrl?: string;
} {
  const lines = content.split("\n");
  let title: string | undefined;
  let artist: string | undefined;
  let year: number | undefined;
  let duration: number | undefined;
  let lyrics = "";
  let coverArtUrl: string | undefined;
  let inLyrics = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Title extraction
    if (trimmed.startsWith("Title:") || trimmed.startsWith("title:")) {
      title = trimmed.replace(/^[Tt]itle:\s*/, "").trim();
    }
    // Artist extraction
    else if (trimmed.startsWith("Artist:") || trimmed.startsWith("artist:")) {
      artist = trimmed.replace(/^[Aa]rtist:\s*/, "").trim();
    }
    // Year extraction
    else if (trimmed.startsWith("Year:") || trimmed.startsWith("year:")) {
      const yearStr = trimmed.replace(/^[Yy]ear:\s*/, "").trim();
      const parsed = parseInt(yearStr);
      if (!isNaN(parsed)) year = parsed;
    }
    // Duration extraction
    else if (trimmed.startsWith("Duration:") || trimmed.startsWith("duration:")) {
      const durStr = trimmed.replace(/^[Dd]uration:\s*/, "").trim();
      const parsed = parseFloat(durStr);
      if (!isNaN(parsed)) duration = parsed;
    }
    // Cover art URL
    else if (trimmed.includes("image_url") || trimmed.includes("image_large_url")) {
      const urlMatch = trimmed.match(/https?:\/\/[^\s"',]+/);
      if (urlMatch) coverArtUrl = urlMatch[0];
    }
    // Lyrics section
    else if (trimmed === "Lyrics:" || trimmed === "[Lyrics]" || trimmed.startsWith("Lyrics:")) {
      inLyrics = true;
      const afterLabel = trimmed.replace(/^Lyrics:\s*/, "").trim();
      if (afterLabel) lyrics += afterLabel + "\n";
    }
    // End of lyrics section
    else if (inLyrics && (trimmed.startsWith("---") || trimmed.startsWith("==="))) {
      inLyrics = false;
    }
    // Collect lyrics lines
    else if (inLyrics && trimmed) {
      lyrics += trimmed + "\n";
    }
  }

  // If no explicit lyrics section, try to find lyrics between markers
  if (!lyrics) {
    const lyricsMatch = content.match(/\[Verse[^\]]*\][\s\S]*?(?=\n\n\n|\n---|\n===|$)/i);
    if (lyricsMatch) {
      lyrics = lyricsMatch[0].trim();
    }
  }

  return { title, artist, year, duration, lyrics: lyrics.trim(), coverArtUrl };
}

/**
 * Infer genre from lyrics and title
 */
function inferGenreFromContent(lyrics: string, title: string): string {
  const text = `${title} ${lyrics}`.toLowerCase();

  const genreKeywords: Record<string, string[]> = {
    "Hip Hop": ["rap", "hip hop", "bars", "flow", "spit", "rhyme", "beat", "hood", "street", "hustle", "grind"],
    "R&B": ["r&b", "rnb", "soul", "smooth", "groove", "baby", "love me", "hold me"],
    "Pop": ["pop", "catchy", "hook", "dance", "party", "tonight", "summer"],
    "Rock": ["rock", "guitar", "drums", "loud", "scream", "metal", "punk", "electric"],
    "Country": ["country", "truck", "beer", "cowboy", "southern", "farm", "dirt road"],
    "Jazz": ["jazz", "swing", "blues", "saxophone", "trumpet", "improvise"],
    "Electronic": ["electronic", "edm", "synth", "bass drop", "techno", "house", "rave"],
    "Reggae": ["reggae", "rasta", "jamaica", "dub", "riddim"],
    "Latin": ["latin", "salsa", "reggaeton", "bachata", "cumbia"],
    "Gospel": ["gospel", "praise", "worship", "lord", "jesus", "faith", "blessed", "hallelujah"],
    "Classical": ["classical", "orchestra", "symphony", "piano", "violin"],
    "Indie": ["indie", "alternative", "lo-fi", "acoustic"],
  };

  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return genre;
      }
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
