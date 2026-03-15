import { Client } from "ssh2";
import { promisify } from "util";

export interface SFTPFile {
  filename: string;
  longname: string;
  attrs: {
    size: number;
    mtime: number;
  };
}

export interface SFTPConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  path: string;
}

/**
 * SFTP Service - Handles connections and file operations
 */
export class SFTPService {
  private config: SFTPConnectionConfig;

  constructor(config: SFTPConnectionConfig) {
    this.config = config;
  }

  /**
   * Test SFTP connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; fileCount?: number }> {
    return new Promise((resolve) => {
      const conn = new Client();

      conn.on("ready", async () => {
        try {
          conn.sftp(async (err: any, sftp: any) => {
            if (err) {
              conn.end();
              resolve({ success: false, message: `SFTP error: ${err.message}` });
              return;
            }

            try {
              const readdir = promisify(sftp.readdir.bind(sftp));
              const files = (await readdir(this.config.path)) as SFTPFile[];
              const musicFiles = files.filter(
                (f) => f.filename.endsWith(".mp3") || f.filename.endsWith(".txt")
              );

              conn.end();
              resolve({
                success: true,
                message: `Connection successful! Found ${musicFiles.length} music files.`,
                fileCount: musicFiles.length,
              });
            } catch (error: any) {
              conn.end();
              resolve({
                success: false,
                message: `Error reading directory: ${error instanceof Error ? error.message : "Unknown error"}`,
              });
            }
          });
        } catch (error: any) {
          conn.end();
          resolve({
            success: false,
            message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }
      });

      conn.on("error", (err: any) => {
        resolve({ success: false, message: `Connection error: ${err.message}` });
      });

      conn.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        conn.end();
        resolve({ success: false, message: "Connection timeout" });
      }, 10000);
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
      const conn = new Client();

      conn.on("ready", async () => {
        try {
          conn.sftp(async (err: any, sftp: any) => {
            if (err) {
              conn.end();
              resolve({ success: false, files: [], message: `SFTP error: ${err.message}` });
              return;
            }

            try {
              const readdir = promisify(sftp.readdir.bind(sftp));
              const files = (await readdir(this.config.path)) as SFTPFile[];

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

              conn.end();
              resolve({
                success: true,
                files: musicFiles,
                message: `Found ${musicFiles.length} music files`,
              });
            } catch (error: any) {
              conn.end();
              resolve({
                success: false,
                files: [],
                message: `Error reading directory: ${error instanceof Error ? error.message : "Unknown error"}`,
              });
            }
          });
        } catch (error: any) {
          conn.end();
          resolve({
            success: false,
            files: [],
            message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }
      });

      conn.on("error", (err: any) => {
        resolve({ success: false, files: [], message: `Connection error: ${err.message}` });
      });

      conn.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        conn.end();
        resolve({ success: false, files: [], message: "Connection timeout" });
      }, 15000);
    });
  }

  /**
   * Read metadata file content
   */
  async readMetadataFile(filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const conn = new Client();

      conn.on("ready", () => {
        conn.sftp((err: any, sftp: any) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }

          const readFile = promisify(sftp.readFile.bind(sftp));
          readFile(`${this.config.path}/${filename}`)
            .then((data: Buffer) => {
              conn.end();
              resolve(data.toString("utf-8"));
            })
            .catch((error: any) => {
              conn.end();
              reject(error);
            });
        });
      });

      conn.on("error", (err: any) => {
        reject(err);
      });

      conn.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        conn.end();
        reject(new Error("Connection timeout"));
      }, 10000);
    });
  }

  /**
   * Get MP3 file stream URL (for streaming)
   */
  getMp3StreamUrl(filename: string): string {
    // This would be used for streaming from the backend
    // For now, return a placeholder that would be handled by a streaming endpoint
    return `/api/sftp/stream/${encodeURIComponent(filename)}`;
  }
}

/**
 * Create SFTP service from environment variables
 */
export function createSFTPService(): SFTPService {
  const host = process.env.SFTP_HOST;
  const port = parseInt(process.env.SFTP_PORT || "22");
  const username = process.env.SFTP_USER;
  const password = process.env.SFTP_PASS;
  const path = process.env.SFTP_PATH || "/";

  if (!host || !username || !password) {
    throw new Error("Missing SFTP configuration in environment variables");
  }

  return new SFTPService({ host, port, username, password, path });
}
