import {
  FlatList,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useMemo } from "react";
import { useSongs, type Song } from "@/hooks/use-songs";
import { usePlayer } from "@/lib/player-context";

function formatDuration(seconds: number) {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function LibraryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { songs, isLoading, refresh } = useSongs();
  const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayer();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "artist" | "genre">("title");

  const filteredSongs = useMemo(() => {
    let filtered = songs.filter(
      (song) =>
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );
    filtered.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "artist") return a.artist.localeCompare(b.artist);
      if (sortBy === "genre") return a.genre.localeCompare(b.genre);
      return 0;
    });
    return filtered;
  }, [songs, searchQuery, sortBy]);

  const handleSongPress = (song: Song) => {
    router.push({ pathname: "/song/[id]", params: { id: song.id } } as any);
  };

  const handlePlayPress = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlayPause();
    } else {
      playSong(song, filteredSongs);
    }
  };

  const SongCard = ({ song }: { song: Song }) => {
    const isActive = currentSong?.id === song.id;
    return (
      <TouchableOpacity
        onPress={() => handleSongPress(song)}
        activeOpacity={0.7}
        style={[
          styles.card,
          {
            backgroundColor: isActive ? colors.primary + "15" : colors.surface,
            borderColor: isActive ? colors.primary : colors.border,
          },
        ]}
      >
        {/* Cover art thumbnail */}
        <View style={styles.thumbContainer}>
          {song.coverArtUrl ? (
            <Image
              source={{ uri: song.coverArtUrl }}
              style={styles.thumb}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.primary + "20" }]}>
              <Text style={styles.thumbEmoji}>🎵</Text>
            </View>
          )}
        </View>

        {/* Song info */}
        <View style={styles.cardInfo}>
          <Text
            style={[styles.cardTitle, { color: isActive ? colors.primary : colors.foreground }]}
            numberOfLines={1}
          >
            {song.title}
          </Text>
          <Text style={[styles.cardArtist, { color: colors.muted }]} numberOfLines={1}>
            {song.artist}
          </Text>
          <View style={styles.cardMeta}>
            <View style={[styles.genrePill, { backgroundColor: colors.primary }]}>
              <Text style={[styles.genreText, { color: colors.background }]}>{song.genre}</Text>
            </View>
            <Text style={[styles.duration, { color: colors.muted }]}>
              {formatDuration(song.duration)}
            </Text>
          </View>
        </View>

        {/* Play button */}
        <TouchableOpacity
          onPress={() => handlePlayPress(song)}
          style={[styles.playBtn, { backgroundColor: isActive ? colors.primary : colors.primary + "20" }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.playIcon, { color: isActive ? colors.background : colors.primary }]}>
            {isActive && isPlaying ? "⏸" : "▶"}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer className="p-4">
      <View className="gap-4 flex-1">
        {/* Header */}
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Library</Text>
          <Text className="text-sm text-muted">{filteredSongs.length} songs</Text>
        </View>

        {/* Search Bar */}
        <TextInput
          placeholder="Search songs or artists..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
        />

        {/* Sort Options */}
        <View className="flex-row gap-2">
          {(["title", "artist", "genre"] as const).map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => setSortBy(option)}
              className={`rounded-full px-4 py-2 ${
                sortBy === option ? "bg-primary" : "bg-surface border border-border"
              }`}
            >
              <Text
                className={`text-sm font-medium capitalize ${
                  sortBy === option ? "text-background" : "text-foreground"
                }`}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Songs List */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-sm text-muted mt-2">Loading library...</Text>
          </View>
        ) : filteredSongs.length > 0 ? (
          <FlatList
            data={filteredSongs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <SongCard song={item} />}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refresh}
                tintColor={colors.primary}
              />
            }
          />
        ) : (
          <View className="flex-1 items-center justify-center gap-2">
            <Text className="text-lg font-semibold text-muted">No songs found</Text>
            <Text className="text-sm text-muted text-center">
              Add songs to your library via Settings → SSH Library
            </Text>
            <TouchableOpacity onPress={refresh} className="mt-4">
              <Text className="text-primary font-medium">Refresh Library</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  thumbContainer: {
    flexShrink: 0,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: "hidden",
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEmoji: {
    fontSize: 22,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  cardArtist: {
    fontSize: 12,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  genrePill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  genreText: {
    fontSize: 11,
    fontWeight: "600",
  },
  duration: {
    fontSize: 11,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  playIcon: {
    fontSize: 14,
    marginLeft: 2,
  },
});
