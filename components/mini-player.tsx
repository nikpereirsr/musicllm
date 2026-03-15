/**
 * mini-player.tsx
 * Persistent bottom mini-player shown when a song is active.
 * Tapping it navigates to the full song detail/player screen.
 */
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { usePlayer } from "@/lib/player-context";
import { useColors } from "@/hooks/use-colors";

export function MiniPlayer() {
  const router = useRouter();
  const colors = useColors();
  const {
    currentSong,
    isPlaying,
    isBuffering,
    togglePlayPause,
    playNext,
    playPrev,
  } = usePlayer();

  if (!currentSong) return null;

  const handlePress = () => {
    router.push({
      pathname: "/song/[id]",
      params: { id: currentSong.id },
    } as any);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.9}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      {/* Cover art */}
      {currentSong.coverArtUrl ? (
        <Image
          source={{ uri: currentSong.coverArtUrl }}
          style={styles.cover}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cover, { backgroundColor: colors.primary + "30" }]}>
          <Text style={{ fontSize: 20 }}>🎵</Text>
        </View>
      )}

      {/* Song info */}
      <View style={styles.info}>
        <Text
          style={[styles.title, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {currentSong.title}
        </Text>
        <Text
          style={[styles.artist, { color: colors.muted }]}
          numberOfLines={1}
        >
          {currentSong.artist}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); playPrev(); }}
          style={styles.controlBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.controlIcon, { color: colors.foreground }]}>⏮</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); togglePlayPause(); }}
          style={[styles.playBtn, { backgroundColor: colors.primary }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isBuffering ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <Text style={[styles.playIcon, { color: colors.background }]}>
              {isPlaying ? "⏸" : "▶"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); playNext(); }}
          style={styles.controlBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.controlIcon, { color: colors.foreground }]}>⏭</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    gap: 10,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  artist: {
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  controlBtn: {
    padding: 4,
  },
  controlIcon: {
    fontSize: 18,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    fontSize: 16,
  },
});
