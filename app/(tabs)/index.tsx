import { ScrollView, Text, View, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect, useMemo } from "react";
import type { Href } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSongs } from "@/hooks/use-songs";

interface MusicStats {
  totalSongs: number;
  totalGenres: number;
  totalPlaylists: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { songs, isLoading, refresh } = useSongs();
  const [playlistCount, setPlaylistCount] = useState(0);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const playlistsData = await AsyncStorage.getItem("playlists");
      const playlists = playlistsData ? JSON.parse(playlistsData) : [];
      setPlaylistCount(playlists.length);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const stats = useMemo(() => {
    const genres = new Set(songs.map((song) => song.genre || "Unknown"));
    return {
      totalSongs: songs.length,
      totalGenres: genres.size,
      totalPlaylists: playlistCount,
    };
  }, [songs, playlistCount]);

  const StatCard = ({ label, value }: { label: string; value: number }) => (
    <View className="flex-1 bg-surface rounded-lg p-4 items-center justify-center border border-border">
      <Text className="text-3xl font-bold text-primary">{value}</Text>
      <Text className="text-sm text-muted mt-1">{label}</Text>
    </View>
  );

  const ActionButton = ({
    label,
    icon,
    onPress,
    variant = "primary",
  }: {
    label: string;
    icon: string;
    onPress: () => void;
    variant?: "primary" | "secondary";
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-center gap-2 rounded-lg py-3 px-4 ${
        variant === "primary"
          ? "bg-primary"
          : "bg-surface border border-border"
      }`}
      activeOpacity={0.7}
    >
      <Text
        className={`text-base font-semibold ${
          variant === "primary" ? "text-background" : "text-foreground"
        }`}
      >
        {icon} {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="p-6">
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-4xl font-bold text-foreground">Music Manager</Text>
            <Text className="text-base text-muted">Organize, create, and explore</Text>
          </View>

          {/* Stats Section */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Your Library</Text>
            <View className="flex-row gap-3">
              <StatCard label="Songs" value={stats.totalSongs} />
              <StatCard label="Genres" value={stats.totalGenres} />
              <StatCard label="Playlists" value={stats.totalPlaylists} />
            </View>
          </View>

          {/* AI Features Section */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">AI Studio</Text>
            <View className="gap-2">
              <ActionButton
                label="Generate Lyrics"
                icon="✨"
                onPress={() => router.push("lyrics-generator" as Href)}
                variant="primary"
              />
              <ActionButton
                label="Create Cover Art"
                icon="🎨"
                onPress={() => router.push("cover-art-generator" as Href)}
                variant="primary"
              />
            </View>
          </View>

          {/* Quick Access Section */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Quick Access</Text>
            <View className="gap-2">
              <ActionButton
                label="Browse Library"
                icon="🎵"
                onPress={() => router.push("./library" as Href)}
                variant="secondary"
              />
              <ActionButton
                label="Explore Genres"
                icon="🏷️"
                onPress={() => router.push("./genres" as Href)}
                variant="secondary"
              />
              <ActionButton
                label="My Playlists"
                icon="📋"
                onPress={() => router.push("./playlists" as Href)}
                variant="secondary"
              />
            </View>
          </View>

          {/* Tip Section */}
          <View className="bg-surface rounded-lg p-4 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">💡 Tip</Text>
            <Text className="text-xs text-muted leading-relaxed">
              Add songs to your library, organize by genre, and use AI to generate unique lyrics and cover art for your music.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
