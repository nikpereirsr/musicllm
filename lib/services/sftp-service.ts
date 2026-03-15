import { SFTPLibrary, Song, metadataParser } from "./music-service";

export interface SFTPConnectionResult {
  success: boolean;
  message: string;
  fileCount?: number;
}

export interface SyncResult {
  success: boolean;
  message: string;
  addedSongs: number;
  updatedSongs: number;
  errors: string[];
}

/**
 * SFTP Service - Handles connection testing and library syncing
 * NOTE: In production, this would connect to a backend API that handles SFTP operations
 * since React Native cannot directly access SFTP due to platform limitations.
 */
export const sftpService = {
  /**
   * Test SFTP connection with provided credentials
   * This would call a backend endpoint in production
   */
  async testConnection(library: Omit<SFTPLibrary, "id" | "createdAt">): Promise<SFTPConnectionResult> {
    try {
      // TODO: Call backend API to test SFTP connection
      // POST /api/sftp/test-connection with library credentials
      // For now, simulate a successful connection
      await new Promise((resolve) => setTimeout(resolve, 1500));

      return {
        success: true,
        message: "Connection successful! Found 42 music files.",
        fileCount: 42,
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  /**
   * Sync library - fetch all music files and metadata from SFTP
   * Returns list of songs to be stored locally
   */
  async syncLibrary(library: SFTPLibrary): Promise<SyncResult> {
    try {
      // TODO: Call backend API to list SFTP files and fetch metadata
      // GET /api/sftp/sync?libraryId=xxx
      // Response should include:
      // - List of .mp3 files
      // - Matching .txt metadata files
      // - Parsed metadata (title, artist, lyrics, cover art URL, etc.)

      // Simulate sync operation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock response
      const mockSongs: Song[] = [
        {
          id: "song-1",
          title: "Example Song 1",
          artist: "Artist Name",
          year: 2025,
          genre: "Electronic",
          duration: 240,
          lyrics: "Mock lyrics...",
          coverArtUrl: "https://via.placeholder.com/400x400",
          sfptLibraryId: library.id,
          fileName: "Example Song 1 D03152025T0830AM.mp3",
          isCached: false,
        },
        {
          id: "song-2",
          title: "Another Track",
          artist: "Different Artist",
          year: 2025,
          genre: "Pop",
          duration: 200,
          lyrics: "More mock lyrics...",
          coverArtUrl: "https://via.placeholder.com/400x400",
          sfptLibraryId: library.id,
          fileName: "Another Track D03142025T0915PM.mp3",
          isCached: false,
        },
      ];

      return {
        success: true,
        message: `Synced ${mockSongs.length} songs from ${library.name}`,
        addedSongs: mockSongs.length,
        updatedSongs: 0,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        addedSongs: 0,
        updatedSongs: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  },

  /**
   * Parse Suno AI metadata file format
   * Extracts title, artist, lyrics, cover art URL, etc.
   */
  parseMetadata(content: string): Partial<Song> {
    return metadataParser.parseMetadataFile(content);
  },

  /**
   * Infer genre from lyrics and song title
   */
  inferGenre(lyrics: string, title: string): string {
    return metadataParser.extractGenreFromLyrics(lyrics, title);
  },
};
