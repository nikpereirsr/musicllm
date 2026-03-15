const SMB2 = require('v9u-smb2');

const smb = new SMB2({
  host: '71.117.153.94',
  port: 3456,
  username: 'root',
  password: 'admin',
  share: 'music',
});

console.log('Testing SMB connection with v9u-smb2...\n');

smb.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  console.log('✅ SMB connection successful!');

  // Try to list the root of the music share
  smb.readdir('/', (err, files) => {
    if (err) {
      console.error('❌ Error reading /:', err.message);
      smb.close(() => process.exit(1));
      return;
    }

    console.log(`✅ Successfully listed music share root`);
    console.log(`   Total files: ${files.length}`);

    const mp3Files = files.filter(f => f.filename.endsWith('.mp3'));
    const txtFiles = files.filter(f => f.filename.endsWith('.txt'));

    console.log(`   MP3 files: ${mp3Files.length}`);
    console.log(`   TXT files: ${txtFiles.length}`);

    if (mp3Files.length > 0) {
      console.log('\n   Sample MP3 files:');
      mp3Files.slice(0, 5).forEach(f => {
        console.log(`     - ${f.filename}`);
      });
    }

    smb.close(() => {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    });
  });

  // Timeout after 30 seconds
  setTimeout(() => {
    console.error('\n❌ Operation timeout');
    smb.close(() => process.exit(1));
  }, 30000);
});
