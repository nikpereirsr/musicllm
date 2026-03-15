import { FlatList, Text, View, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect, useMemo } from "react";
import { useSongs, type Song } from "@/hooks/use-songs";

export default function LibraryScreen() {
  const colors = useColors();
  const { songs, isLoading, refresh } = useSongs();
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

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const SongCard = ({ song }: { song: Song }) => (
    <TouchableOpacity className="bg-surface rounded-lg p-4 mb-3 border border-border active:opacity-70">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {song.title}
          </Text>
          <Text className="text-sm text-muted mt-1">{song.artist}</Text>
          <View className="flex-row gap-2 mt-2">
            <View className="bg-primary rounded-full px-2 py-1">
              <Text className="text-xs font-medium text-background">{song.genre}</Text>
            </View>
            <Text className="text-xs text-muted self-center">{formatDuration(song.duration)}</Text>
            {song.source === "local" && (
              <View className="bg-secondary rounded-full px-2 py-1">
                <Text className="text-xs font-medium text-foreground">Local</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

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
                sortBy === option
                  ? "bg-primary"
                  : "bg-surface border border-border"
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
              <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />
            }
          />
        ) : (
          <View className="flex-1 items-center justify-center gap-2">
            <Text className="text-lg font-semibold text-muted">No songs found</Text>
            <Text className="text-sm text-muted text-center">
              Add songs to your library to get started
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
