/**
 * app/song/[id].tsx
 * Full-screen song detail & music player.
 * Shows cover art, metadata, lyrics, and playback controls.
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useSongs, type Song } from "@/hooks/use-songs";
import { usePlayer } from "@/lib/player-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({
  currentTime,
  duration,
  onSeek,
  color,
  trackColor,
}: {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  color: string;
  trackColor: string;
}) {
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  return (
    <View style={styles.progressContainer}>
      <View
        style={[styles.progressTrack, { backgroundColor: trackColor }]}
        // Simple tap-to-seek on web
        onTouchEnd={(e) => {
          const { locationX, target } = e.nativeEvent;
          // We can't easily get the width here on native without a ref,
          // so we use a fixed width approximation for web
          if (Platform.OS === "web") {
            const el = e.target as HTMLElement;
            const rect = el.getBoundingClientRect();
            const ratio = (e.nativeEvent as any).clientX
              ? ((e.nativeEvent as any).clientX - rect.left) / rect.width
              : locationX / rect.width;
            onSeek(ratio * duration);
          }
        }}
      >
        <View
          style={[
            styles.progressFill,
            { backgroundColor: color, width: `${progress * 100}%` as any },
          ]}
        />
        <View
          style={[
            styles.progressThumb,
            { backgroundColor: color, left: `${progress * 100}%` as any },
          ]}
        />
      </View>
      <View style={styles.timeRow}>
        <Text style={[styles.timeText, { color: trackColor }]}>
          {formatTime(currentTime)}
        </Text>
        <Text style={[styles.timeText, { color: trackColor }]}>
          {formatTime(duration)}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SongDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { songs } = useSongs();
  const {
    currentSong,
    isPlaying,
    isBuffering,
    isLoaded,
    currentTime,
    duration,
    playSong,
    togglePlayPause,
    seekTo,
    playNext,
    playPrev,
    queue,
    setQueue,
  } = usePlayer();

  const [song, setSong] = useState<Song | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);

  // Find the song from the library
  useEffect(() => {
    const found = songs.find((s) => s.id === id);
    if (found) {
      setSong(found);
      // If this song isn't currently playing, start it
      if (!currentSong || currentSong.id !== found.id) {
        // Set the full library as the queue
        if (songs.length > 0) setQueue(songs);
        playSong(found, songs);
      }
    }
  }, [id, songs]);

  // Load playlists for "add to playlist" feature
  useEffect(() => {
    AsyncStorage.getItem("playlists").then((data) => {
      if (data) setPlaylists(JSON.parse(data));
    });
  }, []);

  const activeSong = currentSong?.id === id ? currentSong : song;

  const addToPlaylist = async (playlistId: string) => {
    if (!song) return;
    try {
      const updated = playlists.map((p) => {
        if (p.id === playlistId) {
          const songs = p.songs || [];
          if (!songs.find((s: any) => s.id === song.id)) {
            return { ...p, songs: [...songs, song], songCount: (p.songCount || 0) + 1 };
          }
        }
        return p;
      });
      await AsyncStorage.setItem("playlists", JSON.stringify(updated));
      setPlaylists(updated);
      setShowAddToPlaylist(false);
      if (Platform.OS === "web") {
        window.alert("Song added to playlist!");
      } else {
        Alert.alert("Success", "Song added to playlist!");
      }
    } catch {
      if (Platform.OS === "web") {
        window.alert("Failed to add song to playlist");
      } else {
        Alert.alert("Error", "Failed to add song to playlist");
      }
    }
  };

  if (!song && !activeSong) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Loading song...
          </Text>
        </View>
      </View>
    );
  }

  const displaySong = activeSong || song!;
  const isCurrentlyPlaying = currentSong?.id === displaySong.id;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.backIcon, { color: colors.foreground }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          Now Playing
        </Text>
        <TouchableOpacity
          onPress={() => setShowAddToPlaylist(!showAddToPlaylist)}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.backIcon, { color: colors.foreground }]}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Art */}
        <View style={styles.coverContainer}>
          {displaySong.coverArtUrl ? (
            <Image
              source={{ uri: displaySong.coverArtUrl }}
              style={styles.coverArt}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.coverArt,
                styles.coverPlaceholder,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Text style={styles.coverEmoji}>🎵</Text>
            </View>
          )}
        </View>

        {/* Song Info */}
        <View style={styles.songInfo}>
          <Text style={[styles.songTitle, { color: colors.foreground }]} numberOfLines={2}>
            {displaySong.title}
          </Text>
          <Text style={[styles.songArtist, { color: colors.muted }]}>
            {displaySong.artist}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.genreBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.genreText, { color: colors.background }]}>
                {displaySong.genre}
              </Text>
            </View>
            {displaySong.year && (
              <Text style={[styles.yearText, { color: colors.muted }]}>
                {displaySong.year}
              </Text>
            )}
            {displaySong.source === "local" && (
              <View style={[styles.sourceBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sourceText, { color: colors.muted }]}>Local</Text>
              </View>
            )}
          </View>
        </View>

        {/* Playback Controls */}
        <View style={styles.playerSection}>
          {/* Progress Bar */}
          <ProgressBar
            currentTime={isCurrentlyPlaying ? currentTime : 0}
            duration={isCurrentlyPlaying ? (duration || displaySong.duration) : displaySong.duration}
            onSeek={seekTo}
            color={colors.primary}
            trackColor={colors.muted + "40"}
          />

          {/* Control Buttons */}
          <View style={styles.controlRow}>
            <TouchableOpacity
              onPress={playPrev}
              style={styles.sideBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.sideBtnIcon, { color: colors.foreground }]}>⏮</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (isCurrentlyPlaying) {
                  togglePlayPause();
                } else {
                  playSong(displaySong, songs);
                }
              }}
              style={[styles.playButton, { backgroundColor: colors.primary }]}
            >
              {isBuffering && isCurrentlyPlaying ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text style={[styles.playButtonIcon, { color: colors.background }]}>
                  {isCurrentlyPlaying && isPlaying ? "⏸" : "▶"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={playNext}
              style={styles.sideBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.sideBtnIcon, { color: colors.foreground }]}>⏭</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add to Playlist dropdown */}
        {showAddToPlaylist && (
          <View
            style={[
              styles.playlistDropdown,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.dropdownTitle, { color: colors.foreground }]}>
              Add to Playlist
            </Text>
            {playlists.length === 0 ? (
              <Text style={[styles.dropdownEmpty, { color: colors.muted }]}>
                No playlists yet. Create one in the Playlists tab.
              </Text>
            ) : (
              playlists.map((pl) => (
                <TouchableOpacity
                  key={pl.id}
                  onPress={() => addToPlaylist(pl.id)}
                  style={[styles.playlistItem, { borderTopColor: colors.border }]}
                >
                  <Text style={[styles.playlistItemText, { color: colors.foreground }]}>
                    {pl.name}
                  </Text>
                  <Text style={[styles.playlistItemCount, { color: colors.muted }]}>
                    {pl.songCount || 0} songs
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Lyrics Section */}
        {displaySong.lyrics && (
          <View style={styles.lyricsSection}>
            <TouchableOpacity
              onPress={() => setShowLyrics(!showLyrics)}
              style={[styles.lyricsToggle, { borderColor: colors.border }]}
            >
              <Text style={[styles.lyricsToggleText, { color: colors.foreground }]}>
                {showLyrics ? "Hide Lyrics ▲" : "Show Lyrics ▼"}
              </Text>
            </TouchableOpacity>

            {showLyrics && (
              <View
                style={[
                  styles.lyricsContainer,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.lyricsText, { color: colors.foreground }]}>
                  {displaySong.lyrics}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Tags */}
        {(displaySong as any).tags && (
          <View style={styles.tagsSection}>
            <Text style={[styles.tagsLabel, { color: colors.muted }]}>Tags</Text>
            <Text style={[styles.tagsText, { color: colors.muted }]}>
              {(displaySong as any).tags}
            </Text>
          </View>
        )}

        {/* AI Actions */}
        <View style={styles.aiSection}>
          <Text style={[styles.aiTitle, { color: colors.foreground }]}>AI Studio</Text>
          <View style={styles.aiButtons}>
            <TouchableOpacity
              onPress={() => router.push("/lyrics-generator" as any)}
              style={[styles.aiBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.aiBtnText, { color: colors.background }]}>
                ✨ Generate Lyrics
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/cover-art-generator" as any)}
              style={[styles.aiBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
            >
              <Text style={[styles.aiBtnText, { color: colors.foreground }]}>
                🎨 Create Cover Art
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    padding: 4,
    minWidth: 32,
    alignItems: "center",
  },
  backIcon: {
    fontSize: 22,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  scrollContent: {
    padding: 20,
    gap: 24,
    paddingBottom: 40,
  },
  coverContainer: {
    alignItems: "center",
  },
  coverArt: {
    width: 260,
    height: 260,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  coverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  coverEmoji: {
    fontSize: 80,
  },
  songInfo: {
    alignItems: "center",
    gap: 6,
  },
  songTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  songArtist: {
    fontSize: 16,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  genreBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  genreText: {
    fontSize: 12,
    fontWeight: "600",
  },
  yearText: {
    fontSize: 13,
  },
  sourceBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  sourceText: {
    fontSize: 12,
  },
  playerSection: {
    gap: 16,
  },
  progressContainer: {
    gap: 6,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    position: "relative",
    overflow: "visible",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    position: "absolute",
    left: 0,
    top: 0,
  },
  progressThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: "absolute",
    top: -5,
    marginLeft: -7,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeText: {
    fontSize: 12,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  sideBtn: {
    padding: 8,
  },
  sideBtnIcon: {
    fontSize: 28,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  playButtonIcon: {
    fontSize: 28,
    marginLeft: 3,
  },
  playlistDropdown: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    padding: 12,
    gap: 8,
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  dropdownEmpty: {
    fontSize: 13,
  },
  playlistItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 0.5,
  },
  playlistItemText: {
    fontSize: 14,
    fontWeight: "500",
  },
  playlistItemCount: {
    fontSize: 12,
  },
  lyricsSection: {
    gap: 8,
  },
  lyricsToggle: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  lyricsToggleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  lyricsContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  lyricsText: {
    fontSize: 14,
    lineHeight: 22,
  },
  tagsSection: {
    gap: 4,
  },
  tagsLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tagsText: {
    fontSize: 13,
    lineHeight: 20,
  },
  aiSection: {
    gap: 12,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  aiButtons: {
    gap: 8,
  },
  aiBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  aiBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
