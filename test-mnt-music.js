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
    
    sftp.readdir('/mnt/comics/music', (err, files) => {
      if (err) {
        console.error('❌ Error reading /mnt/comics/music:', err.message);
        conn.end();
        return;
      }
      
      console.log('✅ Found /mnt/comics/music with', files.length, 'files');
      const mp3Files = files.filter(f => f.filename.endsWith('.mp3'));
      const txtFiles = files.filter(f => f.filename.endsWith('.txt'));
      console.log('   MP3 files:', mp3Files.length);
      console.log('   TXT files:', txtFiles.length);
      if (mp3Files.length > 0) {
        console.log('   Sample files:');
        mp3Files.slice(0, 5).forEach(f => console.log('     -', f.filename));
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
  console.error('❌ Connection timeout');
  process.exit(1);
}, 15000);
