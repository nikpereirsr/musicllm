declare module "smb2" {
  interface SMB2Options {
    host: string;
    port?: number;
    username: string;
    password: string;
    share: string;
  }

  interface SMB2FileStats {
    filename: string;
    isDirectory: boolean;
    size: number;
    mtime: number;
  }

  class SMB2 {
    constructor(options: SMB2Options);
    connect(callback: (err?: Error) => void): void;
    close(callback?: () => void): void;
    readdir(path: string, callback: (err?: Error, files?: SMB2FileStats[]) => void): void;
    readFile(
      path: string,
      encoding: string,
      callback: (err?: Error, data?: string) => void
    ): void;
    stat(path: string, callback: (err?: Error, stats?: any) => void): void;
  }

  export = SMB2;
}
