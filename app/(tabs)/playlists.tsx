import { FlatList, Text, View, TouchableOpacity, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Playlist {
  id: string;
  name: string;
  songCount: number;
  createdAt: string;
}

export default function PlaylistsScreen() {
  const colors = useColors();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const playlistsData = await AsyncStorage.getItem("playlists");
      const parsedPlaylists = playlistsData ? JSON.parse(playlistsData) : [];
      setPlaylists(parsedPlaylists);
    } catch (error) {
      console.error("Error loading playlists:", error);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert("Error", "Please enter a playlist name");
      return;
    }

    try {
      const newPlaylist: Playlist = {
        id: Date.now().toString(),
        name: newPlaylistName,
        songCount: 0,
        createdAt: new Date().toISOString(),
      };

      const updatedPlaylists = [...playlists, newPlaylist];
      await AsyncStorage.setItem("playlists", JSON.stringify(updatedPlaylists));
      setPlaylists(updatedPlaylists);
      setNewPlaylistName("");
      setShowInput(false);
    } catch (error) {
      console.error("Error creating playlist:", error);
      Alert.alert("Error", "Failed to create playlist");
    }
  };

  const deletePlaylist = async (id: string) => {
    Alert.alert("Delete Playlist", "Are you sure you want to delete this playlist?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Delete",
        onPress: async () => {
          try {
            const updatedPlaylists = playlists.filter((p) => p.id !== id);
            await AsyncStorage.setItem("playlists", JSON.stringify(updatedPlaylists));
            setPlaylists(updatedPlaylists);
          } catch (error) {
            console.error("Error deleting playlist:", error);
          }
        },
      },
    ]);
  };

  const PlaylistCard = ({ playlist }: { playlist: Playlist }) => (
    <View className="bg-surface rounded-lg p-4 mb-3 border border-border flex-row justify-between items-center">
      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground">{playlist.name}</Text>
        <Text className="text-sm text-muted mt-1">
          {playlist.songCount} {playlist.songCount === 1 ? "song" : "songs"}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => deletePlaylist(playlist.id)}
        className="p-2 active:opacity-70"
      >
        <Text className="text-lg">🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer className="p-4">
      <View className="gap-4 flex-1">
        {/* Header */}
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Playlists</Text>
          <Text className="text-sm text-muted">{playlists.length} playlists</Text>
        </View>

        {/* Create Playlist Section */}
        {showInput ? (
          <View className="gap-2">
            <TextInput
              placeholder="Playlist name..."
              placeholderTextColor={colors.muted}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              autoFocus
            />
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={createPlaylist}
                className="flex-1 bg-primary rounded-lg py-3 items-center active:opacity-80"
              >
                <Text className="text-background font-semibold">Create</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowInput(false);
                  setNewPlaylistName("");
                }}
                className="flex-1 bg-surface border border-border rounded-lg py-3 items-center active:opacity-70"
              >
                <Text className="text-foreground font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowInput(true)}
            className="bg-primary rounded-lg py-3 items-center active:opacity-80"
          >
            <Text className="text-background font-semibold">+ New Playlist</Text>
          </TouchableOpacity>
        )}

        {/* Playlists List */}
        {playlists.length > 0 ? (
          <FlatList
            data={playlists}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <PlaylistCard playlist={item} />}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1 items-center justify-center gap-2">
            <Text className="text-lg font-semibold text-muted">No playlists yet</Text>
            <Text className="text-sm text-muted text-center">
              Create your first playlist to organize your music
            </Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
