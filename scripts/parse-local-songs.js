const fs = require("fs");
const path = require("path");

const musicDir = path.join(__dirname, "..", "public", "music");
const outputFile = path.join(__dirname, "..", "public", "songs.json");

function parseMetadata(content, mp3Filename) {
  let title = "";
  let artist = "";
  let duration = 0;
  let lyrics = "";
  let coverArtUrl = "";
  let tags = "";
  let year = 0;
  let imageUrl = "";
  let imageLargeUrl = "";

  // Try to extract from raw API JSON
  const jsonMatch = content.match(/--- Raw API Response ---\s*\n([\s\S]+)$/);
  if (jsonMatch) {
    try {
      const apiData = JSON.parse(jsonMatch[1].trim());
      title = apiData.title || "";
      artist = apiData.display_name || "";
      duration = apiData.metadata?.duration || 0;
      tags = apiData.metadata?.tags || apiData.display_tags || "";
      imageUrl = apiData.image_url || "";
      imageLargeUrl = apiData.image_large_url || "";
      coverArtUrl = imageLargeUrl || imageUrl;

      // Extract year from created_at
      if (apiData.created_at) {
        year = new Date(apiData.created_at).getFullYear();
      }

      // Extract lyrics from prompt in metadata
      if (apiData.metadata?.prompt) {
        lyrics = apiData.metadata.prompt;
      }
    } catch (e) {
      console.error("Failed to parse JSON for", mp3Filename, e.message);
    }
  }

  // Fallback: extract cover art URL from text
  if (!coverArtUrl) {
    const coverMatch = content.match(/Cover Art URL:\s*(https?:\/\/[^\s]+)/);
    if (coverMatch) coverArtUrl = coverMatch[1];
  }

  // Fallback: extract lyrics from text before the JSON section
  if (!lyrics) {
    const textBeforeJson = jsonMatch ? content.substring(0, jsonMatch.index) : content;
    const lyricsLines = [];
    let inLyrics = false;
    for (const line of textBeforeJson.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.match(/^\[Verse|^\[Chorus|^\[Intro|^\[Outro|^\[Bridge|^\[Hook|^\[Pre/i)) {
        inLyrics = true;
      }
      if (inLyrics) {
        if (trimmed === "Cover Art URL:" || trimmed.startsWith("Cover Art URL:") || trimmed === "---") {
          break;
        }
        lyricsLines.push(trimmed);
      }
    }
    lyrics = lyricsLines.join("\n").trim();
  }

  // Fallback title from filename
  if (!title) {
    title = mp3Filename
      .replace(".mp3", "")
      .replace(/D\d{8}\s*T\d{4}[AP]M/g, "")
      .replace(/\s*V\d+\s*$/, "")
      .trim();
  }

  // Infer genre from tags
  const genre = inferGenre(tags, lyrics, title);

  return { title, artist, duration, lyrics, coverArtUrl, tags, year, genre };
}

function inferGenre(tags, lyrics, title) {
  const text = `${tags} ${lyrics} ${title}`.toLowerCase();

  const genreMap = {
    "Hip Hop": ["rap", "hip hop", "bars", "flow", "trap", "drill"],
    "R&B": ["r&b", "rnb", "soul", "smooth", "groove"],
    "Pop": ["pop", "catchy", "hook", "dance", "party"],
    "Rock": ["rock", "guitar", "punk", "metal", "grunge"],
    "Emo": ["emo", "emo-rap", "emotional", "melodic emo"],
    "Country": ["country", "truck", "cowboy", "southern"],
    "Jazz": ["jazz", "swing", "blues", "saxophone"],
    "Electronic": ["electronic", "edm", "synth", "techno", "house"],
    "Acoustic": ["acoustic", "unplugged", "folk"],
    "Indie": ["indie", "alternative", "lo-fi"],
    "Gospel": ["gospel", "praise", "worship"],
    "Reggae": ["reggae", "rasta", "dub"],
    "Latin": ["latin", "salsa", "reggaeton"],
  };

  for (const [genre, keywords] of Object.entries(genreMap)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return genre;
      }
    }
  }

  return "Other";
}

// Main
const files = fs.readdirSync(musicDir);
const mp3Files = files.filter((f) => f.endsWith(".mp3"));
const txtFiles = files.filter((f) => f.endsWith(".txt"));

console.log(`Found ${mp3Files.length} MP3 files and ${txtFiles.length} TXT files`);

const songs = [];

for (const mp3 of mp3Files) {
  const baseName = mp3.replace(".mp3", "");
  const txtFile = txtFiles.find((t) => t.startsWith(baseName));

  let metadata = {
    title: baseName,
    artist: "Unknown Artist",
    duration: 0,
    lyrics: "",
    coverArtUrl: "",
    tags: "",
    year: 0,
    genre: "Other",
  };

  if (txtFile) {
    const content = fs.readFileSync(path.join(musicDir, txtFile), "utf8");
    metadata = parseMetadata(content, mp3);
  }

  songs.push({
    id: `local-${Buffer.from(mp3).toString("base64url").substring(0, 16)}`,
    title: metadata.title,
    artist: metadata.artist,
    year: metadata.year,
    genre: metadata.genre,
    duration: metadata.duration,
    lyrics: metadata.lyrics,
    coverArtUrl: metadata.coverArtUrl,
    tags: metadata.tags,
    fileName: mp3,
    source: "local",
    isCached: true,
  });
}

fs.writeFileSync(outputFile, JSON.stringify(songs, null, 2));
console.log(`\nGenerated ${songs.length} song entries to ${outputFile}`);
songs.forEach((s) => {
  console.log(`  - ${s.title} | ${s.artist} | ${s.genre} | ${Math.round(s.duration)}s`);
});
