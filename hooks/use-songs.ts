import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Song {
  id: string;
  title: string;
  artist: string;
  year?: number;
  genre: string;
  duration: number;
  lyrics?: string;
  coverArtUrl?: string;
  fileName: string;
  source: "local" | "ssh";
  isCached: boolean;
}

export function useSongs() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSongs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch local songs from API
      const response = await fetch("/api/songs");
      const localSongs: Song[] = await response.json();

      // 2. Fetch SSH songs from AsyncStorage (synced via Settings)
      const allSongsData = await AsyncStorage.getItem("all_songs");
      const sshSongs: Song[] = allSongsData ? JSON.parse(allSongsData) : [];
      
      // Accept songs that have source:"ssh" OR whose id starts with "ssh-" (legacy fallback)
      // This ensures songs synced before the source field was added still appear.
      const filteredSshSongs = sshSongs.filter(
        (s) => s.source === "ssh" || (s.id && s.id.startsWith("ssh-"))
      );

      // 3. Merge and set
      const merged = [...localSongs, ...filteredSshSongs];
      
      // Deduplicate by ID just in case
      const uniqueSongs = Array.from(new Map(merged.map(s => [s.id, s])).values());
      
      setSongs(uniqueSongs);
      
      // Update the 'songs' key used by some legacy screens
      await AsyncStorage.setItem("songs", JSON.stringify(uniqueSongs));
    } catch (err) {
      console.error("Error loading songs:", err);
      setError(err instanceof Error ? err.message : "Failed to load songs");
      
      // Fallback to AsyncStorage if API fails
      const backup = await AsyncStorage.getItem("songs");
      if (backup) {
        setSongs(JSON.parse(backup));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  return { songs, isLoading, error, refresh: loadSongs };
}
