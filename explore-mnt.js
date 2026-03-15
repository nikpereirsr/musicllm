const { Client } = require('ssh2');
const conn = new Client();

function listDir(sftp, path, depth = 0) {
  return new Promise((resolve) => {
    const indent = '  '.repeat(depth);
    sftp.readdir(path, (err, files) => {
      if (err) {
        console.log(`${indent}❌ ${path} - Error: ${err.message}`);
        resolve();
        return;
      }
      
      console.log(`${indent}✅ ${path} (${files.length} items)`);
      
      // Show first 10 items
      files.slice(0, 10).forEach(f => {
        const type = f.longname.startsWith('d') ? '[DIR]' : '[FILE]';
        console.log(`${indent}  ${type} ${f.filename}`);
      });
      
      if (files.length > 10) {
        console.log(`${indent}  ... and ${files.length - 10} more items`);
      }
      
      resolve();
    });
  });
}

conn.on('ready', () => {
  console.log('✅ SSH Connection successful!\n');
  conn.sftp(async (err, sftp) => {
    if (err) {
      console.error('❌ SFTP error:', err.message);
      conn.end();
      return;
    }
    
    console.log('Exploring /mnt directory structure:\n');
    
    // List /mnt
    await listDir(sftp, '/mnt', 0);
    
    // List /mnt/comics if it exists
    console.log('\nExploring /mnt/comics:\n');
    await listDir(sftp, '/mnt/comics', 0);
    
    // List /mnt/comics/music if it exists
    console.log('\nExploring /mnt/comics/music:\n');
    await listDir(sftp, '/mnt/comics/music', 0);
    
    conn.end();
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
}, 30000);
