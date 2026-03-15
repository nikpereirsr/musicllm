import { describe, it, expect } from "vitest";
import { metadataParser } from "../music-service";

describe("Music Service - Metadata Parser", () => {
  const mockMetadataContent = `Title: Test Song
Artist: Test Artist
Year: 2025
Cover Art URL: https://example.com/cover.jpg

--- Lyrics ---
Verse 1:
This is a test song
With some lyrics

Chorus:
Test chorus here
La la la

--- Creation Details ---
Prompt: A rock song about testing`;

  it("should parse title correctly", () => {
    const result = metadataParser.parseMetadataFile(mockMetadataContent);
    expect(result.title).toBe("Test Song");
  });

  it("should parse artist correctly", () => {
    const result = metadataParser.parseMetadataFile(mockMetadataContent);
    expect(result.artist).toBe("Test Artist");
  });

  it("should parse year correctly", () => {
    const result = metadataParser.parseMetadataFile(mockMetadataContent);
    expect(result.year).toBe(2025);
  });

  it("should parse cover art URL correctly", () => {
    const result = metadataParser.parseMetadataFile(mockMetadataContent);
    expect(result.coverArtUrl).toBe("https://example.com/cover.jpg");
  });

  it("should parse lyrics correctly", () => {
    const result = metadataParser.parseMetadataFile(mockMetadataContent);
    expect(result.lyrics).toContain("This is a test song");
    expect(result.lyrics).toContain("Test chorus here");
  });

  it("should parse prompt correctly", () => {
    const result = metadataParser.parseMetadataFile(mockMetadataContent);
    expect(result.prompt).toContain("A rock song about testing");
  });
});

describe("Music Service - Genre Detection", () => {
  it("should detect rock genre from lyrics", () => {
    const lyrics = "Electric guitar, drums, loud power chords, stage presence";
    const title = "Rock Anthem";
    const genre = metadataParser.extractGenreFromLyrics(lyrics, title);
    expect(genre).toBe("Rock");
  });

  it("should detect pop genre from lyrics", () => {
    const lyrics = "Catchy upbeat dance party fun love hit";
    const title = "Pop Song";
    const genre = metadataParser.extractGenreFromLyrics(lyrics, title);
    expect(genre).toBe("Pop");
  });

  it("should detect hip-hop genre from lyrics", () => {
    const lyrics = "Rap flow beat mic street urban rhyme";
    const title = "Hip-Hop Track";
    const genre = metadataParser.extractGenreFromLyrics(lyrics, title);
    expect(genre).toBe("Hip-Hop");
  });

  it("should return Unknown for unrecognized genre", () => {
    const lyrics = "Some random lyrics without clear genre indicators";
    const title = "Unknown Song";
    const genre = metadataParser.extractGenreFromLyrics(lyrics, title);
    expect(genre).toBe("Unknown");
  });

  it("should detect genre from title when lyrics are minimal", () => {
    const lyrics = "Minimal lyrics";
    const title = "Jazz Improvisation";
    const genre = metadataParser.extractGenreFromLyrics(lyrics, title);
    expect(genre).toBe("Jazz");
  });
});
