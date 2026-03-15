const fs = require('fs');
const path = require('path');

const musicDir = path.join(__dirname, '..', 'public', 'music');
const songsJsonPath = path.join(__dirname, '..', 'public', 'songs.json');

function parseMetadataContent(content) {
  const lines = content.split('\n');
  let title = '';
  let artist = '';
  let year = 2025;
  let lyrics = '';
  let coverArtUrl = '';
  let id = '';
  let tags = '';
  let duration = 0;

  // Try to find the JSON block first as it's most reliable
  const jsonMatch = content.match(/--- Raw API Response ---\s*(\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      const raw = JSON.parse(jsonMatch[1]);
      return {
        id: raw.id,
        title: raw.title,
        artist: raw.display_name || raw.handle,
        year: new Date(raw.created_at).getFullYear(),
        genre: inferGenre(raw.metadata?.tags || raw.display_tags || ''),
        duration: raw.metadata?.duration || 0,
        lyrics: raw.metadata?.prompt || '',
        coverArtUrl: raw.image_large_url || raw.image_url,
        tags: raw.metadata?.tags || raw.display_tags || '',
      };
    } catch (e) {
      console.error("Error parsing JSON block", e);
    }
  }

  // Fallback to manual parsing if JSON block is missing or fails
  let inLyrics = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Title:')) title = trimmed.replace('Title:', '').trim();
    else if (trimmed.startsWith('Artist:')) artist = trimmed.replace('Artist:', '').trim();
    else if (trimmed.startsWith('Year:')) year = parseInt(trimmed.replace('Year:', '').trim()) || 2025;
    else if (trimmed.startsWith('Cover Art URL:')) coverArtUrl = trimmed.replace('Cover Art URL:', '').trim();
    else if (trimmed.startsWith('--- Lyrics ---')) inLyrics = true;
    else if (inLyrics && (trimmed.startsWith('---') || trimmed.includes('Raw API Response'))) inLyrics = false;
    else if (inLyrics && trimmed) lyrics += trimmed + '\n';
  }

  return { id, title, artist, year, lyrics: lyrics.trim(), coverArtUrl, tags, duration };
}

function inferGenre(tags) {
  const text = tags.toLowerCase();
  if (text.includes('rock') || text.includes('punk') || text.includes('emo')) return 'Rock';
  if (text.includes('hip hop') || text.includes('rap') || text.includes('trap')) return 'Hip Hop';
  if (text.includes('pop')) return 'Pop';
  if (text.includes('electronic') || text.includes('edm')) return 'Electronic';
  if (text.includes('acoustic') || text.includes('folk')) return 'Acoustic';
  return 'Other';
}

const songs = [];
const files = fs.readdirSync(musicDir);
const txtFiles = files.filter(f => f.endsWith('.txt'));

for (const txtFile of txtFiles) {
  const content = fs.readFileSync(path.join(musicDir, txtFile), 'utf8');
  const metadata = parseMetadataContent(content);
  const mp3File = txtFile.replace('.txt', '.mp3');
  
  if (fs.existsSync(path.join(musicDir, mp3File))) {
    songs.push({
      ...metadata,
      id: `local-${metadata.id || Buffer.from(mp3File).toString('base64').substring(0, 16)}`,
      fileName: mp3File,
      source: 'local',
      isCached: true
    });
  }
}

fs.writeFileSync(songsJsonPath, JSON.stringify(songs, null, 2));
console.log(`Successfully rebuilt songs.json with ${songs.length} songs.`);
