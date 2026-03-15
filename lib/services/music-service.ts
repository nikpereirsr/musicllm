/**
 * music-service.ts
 * Core service for managing SFTP libraries and song metadata.
 * Provides AsyncStorage-backed persistence for library configs and songs.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SFTPLibrary {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  path: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  year?: number;
  genre: string;
  duration: number;
  lyrics?: string;
  coverArtUrl?: string;
  sfptLibraryId?: string;
  fileName: string;
  source?: "local" | "ssh";
  isCached: boolean;
  tags?: string;
  prompt?: string;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const LIBRARIES_KEY = "sftp_libraries";

// ─── SFTP Library Service ─────────────────────────────────────────────────────

export const sftpLibraryService = {
  /**
   * Load all saved SFTP libraries from AsyncStorage.
   */
  async getLibraries(): Promise<SFTPLibrary[]> {
    try {
      const data = await AsyncStorage.getItem(LIBRARIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  /**
   * Persist the full library list.
   */
  async saveLibraries(libraries: SFTPLibrary[]): Promise<void> {
    await AsyncStorage.setItem(LIBRARIES_KEY, JSON.stringify(libraries));
  },

  /**
   * Add a new SFTP library entry.
   */
  async addLibrary(
    library: Omit<SFTPLibrary, "id" | "createdAt">
  ): Promise<SFTPLibrary> {
    const libraries = await this.getLibraries();
    const newLibrary: SFTPLibrary = {
      ...library,
      id: `lib-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    // If this is the first library, mark it as default
    if (libraries.length === 0) {
      newLibrary.isDefault = true;
    }
    libraries.push(newLibrary);
    await this.saveLibraries(libraries);
    return newLibrary;
  },

  /**
   * Remove a library by ID and clean up its cached songs.
   */
  async deleteLibrary(id: string): Promise<void> {
    const libraries = await this.getLibraries();
    const filtered = libraries.filter((lib) => lib.id !== id);
    // If we deleted the default, promote the first remaining one
    if (filtered.length > 0 && !filtered.some((l) => l.isDefault)) {
      filtered[0].isDefault = true;
    }
    await this.saveLibraries(filtered);
    // Remove cached songs for this library
    await AsyncStorage.removeItem(`library_songs_${id}`);
    // Update global all_songs to remove songs from this library
    try {
      const allSongsRaw = await AsyncStorage.getItem("all_songs");
      if (allSongsRaw) {
        const allSongs: Song[] = JSON.parse(allSongsRaw);
        const remaining = allSongs.filter(
          (s) => s.sfptLibraryId !== id
        );
        await AsyncStorage.setItem("all_songs", JSON.stringify(remaining));
      }
    } catch {
      // ignore
    }
  },

  /**
   * Mark a library as the default.
   */
  async setDefaultLibrary(id: string): Promise<void> {
    const libraries = await this.getLibraries();
    const updated = libraries.map((lib) => ({
      ...lib,
      isDefault: lib.id === id,
    }));
    await this.saveLibraries(updated);
  },

  /**
   * Update an existing library entry.
   */
  async updateLibrary(
    id: string,
    updates: Partial<SFTPLibrary>
  ): Promise<void> {
    const libraries = await this.getLibraries();
    const updated = libraries.map((lib) =>
      lib.id === id ? { ...lib, ...updates } : lib
    );
    await this.saveLibraries(updated);
  },
};

// ─── Metadata Parser ──────────────────────────────────────────────────────────

export const metadataParser = {
  /**
   * Parse a Suno AI .txt metadata file into a partial Song object.
   * Supports both the structured header format and the raw JSON API block.
   */
  parseMetadataFile(content: string): Partial<Song> {
    // Prefer the embedded Raw API Response JSON block — it's the most reliable
    const jsonMatch = content.match(
      /---\s*Raw API Response\s*---\s*(\{[\s\S]*\})/
    );
    if (jsonMatch) {
      try {
        const raw = JSON.parse(jsonMatch[1]);
        const tags: string =
          raw.metadata?.tags || raw.display_tags || "";
        const lyrics: string = raw.metadata?.prompt || "";
        return {
          title: raw.title,
          artist: raw.display_name || raw.handle,
          year: raw.created_at
            ? new Date(raw.created_at).getFullYear()
            : undefined,
          duration: raw.metadata?.duration ?? 0,
          lyrics,
          coverArtUrl: raw.image_large_url || raw.image_url,
          tags,
          prompt: lyrics,
          genre: this.extractGenreFromLyrics(
            lyrics,
            raw.title || ""
          ),
        };
      } catch {
        // fall through to manual parsing
      }
    }

    // Manual / fallback parsing
    const lines = content.split("\n");
    let title = "";
    let artist = "";
    let year: number | undefined;
    let duration = 0;
    let lyrics = "";
    let coverArtUrl = "";
    let prompt = "";
    let inLyrics = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (/^[Tt]itle:\s*/.test(trimmed)) {
        title = trimmed.replace(/^[Tt]itle:\s*/, "").trim();
      } else if (/^[Aa]rtist:\s*/.test(trimmed)) {
        artist = trimmed.replace(/^[Aa]rtist:\s*/, "").trim();
      } else if (/^[Yy]ear:\s*/.test(trimmed)) {
        const y = parseInt(trimmed.replace(/^[Yy]ear:\s*/, "").trim());
        if (!isNaN(y)) year = y;
      } else if (/^[Dd]uration:\s*/.test(trimmed)) {
        const d = parseFloat(
          trimmed.replace(/^[Dd]uration:\s*/, "").trim()
        );
        if (!isNaN(d)) duration = d;
      } else if (/Cover Art URL:/i.test(trimmed)) {
        const urlMatch = trimmed.match(/https?:\/\/[^\s"',]+/);
        if (urlMatch) coverArtUrl = urlMatch[0];
      } else if (/^---\s*Lyrics\s*---/i.test(trimmed)) {
        inLyrics = true;
      } else if (inLyrics && /^---/.test(trimmed)) {
        inLyrics = false;
      } else if (inLyrics) {
        lyrics += trimmed + "\n";
      }
    }

    // If no explicit lyrics block, grab the verse/chorus content
    if (!lyrics) {
      const lyricsMatch = content.match(
        /(\[Verse[\s\S]*?)(?=Cover Art URL:|---\s*Raw API|$)/i
      );
      if (lyricsMatch) lyrics = lyricsMatch[1].trim();
    }

    return {
      title,
      artist,
      year,
      duration,
      lyrics: lyrics.trim(),
      coverArtUrl,
      prompt,
      genre: this.extractGenreFromLyrics(lyrics, title),
    };
  },

  /**
   * Infer a genre from lyrics text and song title using keyword matching.
   */
  extractGenreFromLyrics(lyrics: string, title: string): string {
    const text = `${title} ${lyrics}`.toLowerCase();

    const genreKeywords: [string, string[]][] = [
      ["Rock", ["rock", "guitar", "drums", "loud", "scream", "metal", "punk", "electric", "emo"]],
      ["Hip-Hop", ["rap", "hip hop", "hip-hop", "bars", "flow", "spit", "rhyme", "beat", "hood", "street", "hustle", "grind", "mic"]],
      ["R&B", ["r&b", "rnb", "soul", "smooth", "groove", "hold me", "love me"]],
      ["Pop", ["pop", "catchy", "hook", "dance", "party", "tonight", "summer", "upbeat"]],
      ["Country", ["country", "truck", "beer", "cowboy", "southern", "farm", "dirt road"]],
      ["Jazz", ["jazz", "swing", "blues", "saxophone", "trumpet", "improvise"]],
      ["Electronic", ["electronic", "edm", "synth", "bass drop", "techno", "house", "rave"]],
      ["Reggae", ["reggae", "rasta", "jamaica", "dub", "riddim"]],
      ["Latin", ["latin", "salsa", "reggaeton", "bachata", "cumbia"]],
      ["Gospel", ["gospel", "praise", "worship", "lord", "jesus", "faith", "blessed", "hallelujah"]],
      ["Classical", ["classical", "orchestra", "symphony", "piano", "violin"]],
      ["Indie", ["indie", "alternative", "lo-fi", "acoustic"]],
      ["Acoustic", ["acoustic", "folk", "singer-songwriter", "ballad"]],
    ];

    for (const [genre, keywords] of genreKeywords) {
      for (const kw of keywords) {
        if (text.includes(kw)) return genre;
      }
    }

    return "Unknown";
  },
};
