import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { createSMBService, SMBService } from "./smb";
import { metadataParser } from "../lib/services/music-service";

export const smbRouter = router({
  /**
   * Test SMB connection with provided credentials
   */
  testConnection: publicProcedure
    .input(
      z.object({
        host: z.string(),
        port: z.number().default(445),
        username: z.string(),
        password: z.string(),
        share: z.string().default("music"),
        path: z.string().default("/"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const smb = new SMBService(input);
        const result = await smb.testConnection();
        return result;
      } catch (error) {
        return {
          success: false,
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),

  /**
   * List all music files from the configured SMB server
   */
  listMusicFiles: publicProcedure.query(async () => {
    try {
      const smb = createSMBService();
      const result = await smb.listMusicFiles();
      return result;
    } catch (error) {
      return {
        success: false,
        files: [],
        message: `Error: ${error instanceof Error ? error.message : "SMB not configured"}`,
      };
    }
  }),

  /**
   * Sync library - fetch all music files and their metadata
   */
  syncLibrary: publicProcedure.query(async () => {
    try {
      const smb = createSMBService();
      const listResult = await smb.listMusicFiles();

      if (!listResult.success) {
        return {
          success: false,
          songs: [],
          message: listResult.message,
        };
      }

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

      // Process each music file with its metadata
      for (const file of listResult.files) {
        if (!file.txt) {
          // Skip MP3s without matching metadata
          continue;
        }

        try {
          // Read metadata file
          const metadataContent = await smb.readMetadataFile(file.txt);
          const metadata = metadataParser.parseMetadataFile(metadataContent);

          // Infer genre from lyrics
          const genre = metadataParser.extractGenreFromLyrics(
            metadata.lyrics || "",
            metadata.title || file.mp3
          );

          songs.push({
            id: `smb-${file.mp3}`,
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
          console.error(`Error processing metadata for ${file.txt}:`, error);
          // Continue with next file
        }
      }

      return {
        success: true,
        songs,
        message: `Synced ${songs.length} songs from SMB server`,
      };
    } catch (error) {
      return {
        success: false,
        songs: [],
        message: `Error: ${error instanceof Error ? error.message : "SMB not configured"}`,
      };
    }
  }),

  /**
   * Get streaming URL for an MP3 file
   */
  getStreamUrl: publicProcedure
    .input(z.object({ filename: z.string() }))
    .query(({ input }) => {
      try {
        const smb = createSMBService();
        const streamUrl = smb.getMp3StreamUrl(input.filename);
        return { success: true, streamUrl };
      } catch (error) {
        return {
          success: false,
          streamUrl: "",
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),
});
