const { Client } = require('ssh2');
const conn = new Client();

const pathsToTry = [
  '/root/music',
  '/home/music',
  '/opt/music',
  '/srv/music',
  '/mnt/music',
  '/var/music',
  '/music',
];

let currentIndex = 0;

function checkNextPath() {
  if (currentIndex >= pathsToTry.length) {
    console.log('\n❌ Music directory not found in any of the common paths');
    conn.end();
    return;
  }

  const path = pathsToTry[currentIndex];
  currentIndex++;

  conn.sftp((err, sftp) => {
    if (err) {
      console.error(`❌ SFTP error: ${err.message}`);
      conn.end();
      return;
    }

    sftp.readdir(path, (err, files) => {
      if (err) {
        console.log(`❌ ${path} - Not found or not accessible`);
        checkNextPath();
      } else {
        const mp3Files = files.filter(f => f.filename.endsWith('.mp3'));
        const txtFiles = files.filter(f => f.filename.endsWith('.txt'));
        console.log(`✅ ${path}`);
        console.log(`   Total files: ${files.length}`);
        console.log(`   MP3 files: ${mp3Files.length}`);
        console.log(`   TXT files: ${txtFiles.length}`);
        if (mp3Files.length > 0) {
          console.log(`   Sample MP3: ${mp3Files[0].filename}`);
        }
        conn.end();
      }
    });
  });
}

conn.on('ready', () => {
  console.log('✅ SSH Connection successful!\n');
  console.log('Checking common music directory paths...\n');
  checkNextPath();
});

conn.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
});

conn.connect({
  host: '71.117.153.94',
  port: 3456,
  username: 'root',
  password: 'admin',
});

setTimeout(() => {
  console.error('\n❌ Connection timeout');
  process.exit(1);
}, 30000);
