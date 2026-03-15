import SMB2 from "smb2";

export interface SMBFile {
  filename: string;
  isDirectory: boolean;
  size: number;
  mtime: number;
}

export interface SMBConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  share: string;
  path: string;
}

/**
 * SMB Service - Handles SMB connections and file operations
 */
export class SMBService {
  private config: SMBConnectionConfig;
  private smb: SMB2;

  constructor(config: SMBConnectionConfig) {
    this.config = config;
    this.smb = new SMB2({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      share: config.share,
    });
  }

  /**
   * Test SMB connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; fileCount?: number }> {
    return new Promise((resolve) => {
      this.smb.connect((err: any) => {
        if (err) {
          resolve({
            success: false,
            message: `Connection error: ${err.message}`,
          });
          return;
        }

        // Try to read the target directory
        this.smb.readdir(this.config.path, (err: any, files?: any[]) => {
          this.smb.close(() => {});

          if (err || !files) {
            resolve({
              success: false,
              message: `Error reading directory: ${err?.message || "Unknown error"}`,
            });
            return;
          }

          const musicFiles = files.filter(
            (f) => f.filename.endsWith(".mp3") || f.filename.endsWith(".txt")
          );

          resolve({
            success: true,
            message: `Connection successful! Found ${musicFiles.length} music files.`,
            fileCount: musicFiles.length,
          });
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          this.smb.close(() => {});
        }, 10000);
      });
    });
  }

  /**
   * List all music files and their metadata
   */
  async listMusicFiles(): Promise<{
    success: boolean;
    files: Array<{ mp3: string; txt?: string }>;
    message: string;
  }> {
    return new Promise((resolve) => {
      this.smb.connect((err: any) => {
        if (err) {
          resolve({
            success: false,
            files: [],
            message: `Connection error: ${err.message}`,
          });
          return;
        }

        this.smb.readdir(this.config.path, (err: any, files?: any[]) => {
          this.smb.close(() => {});

          if (err || !files) {
            resolve({
              success: false,
              files: [],
              message: `Error reading directory: ${err?.message || "Unknown error"}`,
            });
            return;
          }

          // Separate MP3 and TXT files
          const mp3Files = files
            .filter((f) => f.filename.endsWith(".mp3"))
            .map((f) => f.filename);
          const txtFiles = files
            .filter((f) => f.filename.endsWith(".txt"))
            .map((f) => f.filename);

          // Match MP3s with their TXT metadata files
          const musicFiles = mp3Files.map((mp3) => {
            const baseName = mp3.replace(".mp3", "");
            const txtFile = txtFiles.find((txt) => txt.startsWith(baseName));
            return {
              mp3,
              txt: txtFile,
            };
          });

          resolve({
            success: true,
            files: musicFiles,
            message: `Found ${musicFiles.length} music files`,
          });
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          this.smb.close(() => {});
        }, 30000);
      });
    });
  }

  /**
   * Read metadata file content
   */
  async readMetadataFile(filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.smb.connect((err: any) => {
        if (err) {
          reject(err);
          return;
        }

        const filePath = `${this.config.path}/${filename}`;
        this.smb.readFile(filePath, "utf8", (err: any, data?: string) => {
          this.smb.close(() => {});

          if (err || !data) {
            reject(err || new Error("No data returned"));
            return;
          }

          resolve(data);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          this.smb.close(() => {});
        }, 10000);
      });
    });
  }

  /**
   * Get MP3 file stream URL (for streaming)
   */
  getMp3StreamUrl(filename: string): string {
    // This would be used for streaming from the backend
    return `/api/smb/stream/${encodeURIComponent(filename)}`;
  }
}

/**
 * Create SMB service from environment variables
 */
export function createSMBService(): SMBService {
  const host = process.env.SMB_HOST;
  const port = parseInt(process.env.SMB_PORT || "445");
  const username = process.env.SMB_USER;
  const password = process.env.SMB_PASS;
  const share = process.env.SMB_SHARE || "music";
  const path = process.env.SMB_PATH || "/";

  if (!host || !username || !password) {
    throw new Error("Missing SMB configuration in environment variables");
  }

  return new SMBService({ host, port, username, password, share, path });
}
