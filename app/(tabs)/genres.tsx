import { FlatList, Text, View, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useMemo } from "react";
import { useSongs } from "@/hooks/use-songs";

interface GenreData {
  name: string;
  count: number;
  color: string;
}

const GENRE_COLORS: Record<string, string> = {
  Rock: "#E74C3C",
  Pop: "#E91E63",
  "Hip Hop": "#9C27B0",
  "Hip-Hop": "#9C27B0",
  Jazz: "#3498DB",
  Classical: "#2ECC71",
  Electronic: "#F39C12",
  "R&B": "#1ABC9C",
  Country: "#D4A574",
  Acoustic: "#8E44AD",
  Unknown: "#687076",
};

export default function GenresScreen() {
  const colors = useColors();
  const { songs, isLoading, refresh } = useSongs();

  const genres = useMemo(() => {
    const genreMap = new Map<string, number>();
    songs.forEach((song) => {
      const genre = song.genre || "Unknown";
      genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
    });

    const genreList = Array.from(genreMap.entries()).map(([name, count]) => ({
      name,
      count,
      color: GENRE_COLORS[name] || GENRE_COLORS.Unknown,
    }));

    genreList.sort((a, b) => b.count - a.count);
    return genreList;
  }, [songs]);

  const GenreCard = ({ genre }: { genre: GenreData }) => (
    <TouchableOpacity
      className="rounded-lg p-4 mb-3 border border-border active:opacity-70"
      style={{ backgroundColor: genre.color + "20" }}
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-foreground">{genre.name}</Text>
          <Text className="text-sm text-muted mt-1">
            {genre.count} {genre.count === 1 ? "song" : "songs"}
          </Text>
        </View>
        <View
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: genre.color }}
        >
          <Text className="text-white font-bold">{genre.count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="p-4">
      <View className="gap-4 flex-1">
        {/* Header */}
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Genres</Text>
          <Text className="text-sm text-muted">{genres.length} genres</Text>
        </View>

        {/* Genres List */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : genres.length > 0 ? (
          <FlatList
            data={genres}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => <GenreCard genre={item} />}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />
            }
          />
        ) : (
          <View className="flex-1 items-center justify-center gap-2">
            <Text className="text-lg font-semibold text-muted">No genres yet</Text>
            <Text className="text-sm text-muted text-center">
              Add songs to your library to organize by genre
            </Text>
            <TouchableOpacity onPress={refresh} className="mt-4">
              <Text className="text-primary font-medium">Refresh Genres</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
