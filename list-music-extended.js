const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connection successful!');
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('❌ SFTP error:', err.message);
      conn.end();
      return;
    }
    
    console.log('✅ SFTP connection successful!');
    console.log('\nListing /music directory (this may take a moment)...\n');
    
    const startTime = Date.now();
    sftp.readdir('/music', (err, files) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (err) {
        console.error(`❌ Error reading /music (${duration}s):`, err.message);
        conn.end();
        return;
      }
      
      console.log(`✅ Successfully listed /music in ${duration}s\n`);
      console.log(`Total files: ${files.length}\n`);
      
      const mp3Files = files.filter(f => f.filename.endsWith('.mp3'));
      const txtFiles = files.filter(f => f.filename.endsWith('.txt'));
      
      console.log(`MP3 files: ${mp3Files.length}`);
      console.log(`TXT files: ${txtFiles.length}`);
      console.log(`Other files: ${files.length - mp3Files.length - txtFiles.length}\n`);
      
      if (mp3Files.length > 0) {
        console.log('Sample MP3 files:');
        mp3Files.slice(0, 10).forEach(f => {
          console.log(`  - ${f.filename}`);
        });
        if (mp3Files.length > 10) {
          console.log(`  ... and ${mp3Files.length - 10} more`);
        }
      }
      
      conn.end();
    });
  });
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
  console.error('\n❌ Connection timeout after 60 seconds');
  process.exit(1);
}, 60000);
