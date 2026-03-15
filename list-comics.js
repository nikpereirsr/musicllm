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
    
    console.log('\nListing /mnt/comics:\n');
    sftp.readdir('/mnt/comics', (err, files) => {
      if (err) {
        console.error('❌ Error reading /mnt/comics:', err.message);
        conn.end();
        return;
      }
      
      console.log(`Found ${files.length} items:\n`);
      files.forEach(f => {
        const type = f.longname.startsWith('d') ? '[DIR]' : '[FILE]';
        const size = f.attrs.size ? ` (${(f.attrs.size / 1024 / 1024).toFixed(2)} MB)` : '';
        console.log(`  ${type} ${f.filename}${size}`);
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
  console.error('\n❌ Connection timeout');
  process.exit(1);
}, 15000);
