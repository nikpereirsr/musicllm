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
    
    // List root directory
    sftp.readdir('/', (err, files) => {
      if (err) {
        console.error('❌ Error reading /:', err.message);
        conn.end();
        return;
      }
      
      console.log('Root directory contents:');
      files.forEach(f => {
        const type = f.longname.startsWith('d') ? '[DIR]' : '[FILE]';
        console.log(`  ${type} ${f.filename}`);
      });
      
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
