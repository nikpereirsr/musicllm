import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { createSSHService, SSHService } from "./ssh-service";

export const sshRouter = router({
  /**
   * Test SSH connection with provided credentials
   */
  testConnection: publicProcedure
    .input(
      z.object({
        host: z.string(),
        port: z.number().default(22),
        username: z.string(),
        password: z.string(),
        path: z.string().default("/music"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const ssh = new SSHService(input);
        const result = await ssh.testConnection();
        return result;
      } catch (error) {
        return {
          success: false,
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),

  /**
   * Sync library - uses a SINGLE SSH connection to list files and read all metadata
   */
  syncLibrary: publicProcedure
    .input(
      z.object({
        host: z.string(),
        port: z.number().default(22),
        username: z.string(),
        password: z.string(),
        path: z.string().default("/music"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const ssh = new SSHService(input);
        const result = await ssh.syncLibraryFull();
        return result;
      } catch (error) {
        return {
          success: false,
          songs: [],
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),
});
