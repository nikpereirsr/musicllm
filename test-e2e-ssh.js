const { Client } = require("ssh2");

const config = {
  host: "71.117.153.94",
  port: 3456,
  username: "root",
  password: "admin",
  path: "/mnt/comics/music",
};

async function testFullSync() {
  console.log("=== E2E SSH Test ===");
  console.log("Connecting to:", config.host, "port:", config.port);

  const conn = new Client();

  conn.on("ready", () => {
    console.log("SSH connected!");
    conn.sftp((err, sftp) => {
      if (err) {
        console.error("SFTP error:", err.message);
        conn.end();
        return;
      }
      console.log("SFTP session ready");

      // Step 1: List directory
      console.log("Reading directory:", config.path);
      sftp.readdir(config.path, (err, files) => {
        if (err) {
          console.error("readdir error:", err.message);
          conn.end();
          return;
        }

        console.log("Total files:", files.length);
        const mp3s = files.filter((f) => f.filename.endsWith(".mp3"));
        const txts = files.filter((f) => f.filename.endsWith(".txt"));
        console.log("MP3 files:", mp3s.length);
        console.log("TXT files:", txts.length);

        // Show first 5 MP3s
        console.log("\nFirst 5 MP3s:");
        mp3s.slice(0, 5).forEach((f) => console.log("  ", f.filename));

        // Show first 5 TXTs
        console.log("\nFirst 5 TXTs:");
        txts.slice(0, 5).forEach((f) => console.log("  ", f.filename));

        // Step 2: Try reading a TXT file
        if (txts.length > 0) {
          const testFile = `${config.path}/${txts[0].filename}`;
          console.log("\nReading metadata file:", testFile);

          sftp.readFile(testFile, (err, data) => {
            if (err) {
              console.error("readFile error:", err.message);
            } else {
              const content = data.toString("utf8");
              console.log("File content (first 500 chars):");
              console.log(content.substring(0, 500));
              console.log("...");
              console.log("Total length:", content.length, "chars");
            }

            conn.end();
            console.log("\n=== Test Complete ===");
          });
        } else {
          conn.end();
          console.log("\n=== Test Complete (no TXT files) ===");
        }
      });
    });
  });

  conn.on("error", (err) => {
    console.error("Connection error:", err.message);
  });

  conn.connect({
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    readyTimeout: 30000,
    keepaliveInterval: 10000,
  });

  // Global timeout
  setTimeout(() => {
    console.error("GLOBAL TIMEOUT - test took too long");
    conn.end();
    process.exit(1);
  }, 120000);
}

testFullSync();
