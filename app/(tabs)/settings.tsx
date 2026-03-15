import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  FlatList,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { sftpLibraryService, type SFTPLibrary } from "@/lib/services/music-service";
import { trpc } from "@/lib/trpc";

/**
 * Cross-platform confirm dialog that works on both web and native
 */
function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: onConfirm, style: "destructive" },
    ]);
  }
}

/**
 * Cross-platform alert that works on both web and native
 */
function showAlert(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function SettingsScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [libraries, setLibraries] = useState<SFTPLibrary[]>([]);
  const [showAddLibrary, setShowAddLibrary] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [refreshingLibraryId, setRefreshingLibraryId] = useState<string | null>(null);
  const [newLibrary, setNewLibrary] = useState({
    name: "",
    host: "",
    port: 22,
    username: "",
    password: "",
    path: "/",
  });

  // tRPC mutations
  const testConnectionMutation = trpc.ssh.testConnection.useMutation();
  const syncLibraryMutation = trpc.ssh.syncLibrary.useMutation();

  useEffect(() => {
    loadSettings();
    loadLibraries();
  }, []);

  const loadSettings = async () => {
    const darkModeValue = await AsyncStorage.getItem("darkMode");
    const notificationsValue = await AsyncStorage.getItem("notifications");
    setDarkMode(darkModeValue === "true");
    setNotificationsEnabled(notificationsValue !== "false");
  };

  const loadLibraries = async () => {
    const libs = await sftpLibraryService.getLibraries();
    setLibraries(libs);
  };

  const saveSettings = async (key: string, value: any) => {
    await AsyncStorage.setItem(key, String(value));
  };

  const toggleDarkMode = (value: boolean) => {
    setDarkMode(value);
    saveSettings("darkMode", value);
    SystemUI.setBackgroundColorAsync(value ? "#000000" : "#ffffff");
  };

  const toggleNotifications = (value: boolean) => {
    setNotificationsEnabled(value);
    saveSettings("notifications", value);
  };

  const testConnection = useCallback(async () => {
    if (!newLibrary.name || !newLibrary.host || !newLibrary.username) {
      showAlert("Error", "Please fill in all required fields");
      return;
    }

    setTestingConnection(true);
    try {
      console.log("Testing SSH connection:", newLibrary.host, newLibrary.port, newLibrary.path);

      const result = await testConnectionMutation.mutateAsync({
        host: newLibrary.host,
        port: newLibrary.port,
        username: newLibrary.username,
        password: newLibrary.password,
        path: newLibrary.path,
      });

      console.log("SSH test result:", result);

      if (result.success) {
        showAlert("Connection Successful", result.message || "SSH connection test passed!");
      } else {
        showAlert("Connection Failed", result.message || "Could not connect to SSH server");
      }
    } catch (error) {
      console.error("SSH connection error:", error);
      showAlert("Error", `Failed to test connection: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setTestingConnection(false);
    }
  }, [newLibrary, testConnectionMutation]);

  const addLibrary = useCallback(async () => {
    if (!newLibrary.name || !newLibrary.host || !newLibrary.username) {
      showAlert("Error", "Please fill in all required fields");
      return;
    }

    try {
      const lib = await sftpLibraryService.addLibrary({
        name: newLibrary.name,
        host: newLibrary.host,
        port: newLibrary.port,
        username: newLibrary.username,
        password: newLibrary.password,
        path: newLibrary.path,
        isDefault: libraries.length === 0,
      });

      setLibraries([...libraries, lib]);
      setShowAddLibrary(false);
      setNewLibrary({ name: "", host: "", port: 22, username: "", password: "", path: "/" });
      showAlert("Success", "Library added successfully");
    } catch (error) {
      showAlert("Error", "Failed to add library");
    }
  }, [newLibrary, libraries]);

  const refreshLibrary = useCallback(async (library: SFTPLibrary) => {
    setRefreshingLibraryId(library.id);
    try {
      console.log("Syncing library:", library.name, library.host, library.port, library.path);

      const result = await syncLibraryMutation.mutateAsync({
        host: library.host,
        port: library.port,
        username: library.username,
        password: library.password,
        path: library.path,
      });

      console.log("Sync result:", JSON.stringify(result).substring(0, 200));

      if (result.success) {
        const songCount = result.songs?.length || 0;
        showAlert("Sync Complete", `Loaded ${songCount} songs from ${library.name}`);

        // Store songs in AsyncStorage
        if (result.songs) {
          await AsyncStorage.setItem(
            `library_songs_${library.id}`,
            JSON.stringify(result.songs)
          );
          // Also store in a global songs key for other screens
          const existingSongs = await AsyncStorage.getItem("all_songs");
          const existing = existingSongs ? JSON.parse(existingSongs) : [];
          // Remove old songs from this library
          const filtered = existing.filter((s: any) => !s.id.startsWith(`ssh-`));
          const merged = [...filtered, ...result.songs];
          await AsyncStorage.setItem("all_songs", JSON.stringify(merged));
        }
      } else {
        showAlert("Sync Failed", result.message || "Could not sync library");
      }
    } catch (error) {
      console.error("Refresh library error:", error);
      showAlert("Error", `Failed to refresh library: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setRefreshingLibraryId(null);
    }
  }, [syncLibraryMutation]);

  const deleteLibrary = useCallback(async (id: string) => {
    console.log("Delete requested for library:", id);
    confirmAction(
      "Delete Library",
      "Are you sure you want to remove this library? This will also remove cached songs.",
      async () => {
        try {
          console.log("Confirmed delete for library:", id);
          await sftpLibraryService.deleteLibrary(id);
          // Also remove cached songs
          await AsyncStorage.removeItem(`library_songs_${id}`);
          const updated = await sftpLibraryService.getLibraries();
          setLibraries(updated);
          showAlert("Success", "Library deleted successfully");
        } catch (error) {
          console.error("Delete error:", error);
          showAlert("Error", "Failed to delete library");
        }
      }
    );
  }, []);

  const setDefaultLibrary = useCallback(async (id: string) => {
    await sftpLibraryService.setDefaultLibrary(id);
    setLibraries(await sftpLibraryService.getLibraries());
  }, []);

  const clearAllData = useCallback(() => {
    confirmAction(
      "Clear All Data",
      "This will remove all libraries, cached songs, playlists, and settings. This cannot be undone.",
      async () => {
        try {
          await AsyncStorage.clear();
          setLibraries([]);
          setDarkMode(false);
          setNotificationsEnabled(true);
          showAlert("Success", "All data has been cleared");
        } catch (error) {
          console.error("Clear data error:", error);
          showAlert("Error", "Failed to clear data");
        }
      }
    );
  }, []);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 24 }}>
        {/* Theme Section */}
        <View style={styles.section}>
          <Text className="text-lg font-semibold text-foreground">Appearance</Text>
          <View className="bg-surface rounded-lg p-4 border border-border">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-foreground">Dark Mode</Text>
              <Switch value={darkMode} onValueChange={toggleDarkMode} />
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text className="text-lg font-semibold text-foreground">Notifications</Text>
          <View className="bg-surface rounded-lg p-4 border border-border">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-foreground">Enable Notifications</Text>
              <Switch value={notificationsEnabled} onValueChange={toggleNotifications} />
            </View>
          </View>
        </View>

        {/* Music Libraries Section */}
        <View style={styles.section}>
          <View className="flex-row justify-between items-center">
            <Text className="text-lg font-semibold text-foreground">Music Libraries</Text>
            <TouchableOpacity
              onPress={() => setShowAddLibrary(!showAddLibrary)}
              style={styles.addButton}
            >
              <Text style={{ fontSize: 24, color: colors.primary }}>+</Text>
            </TouchableOpacity>
          </View>

          {showAddLibrary && (
            <View className="bg-surface rounded-lg p-4 border border-border" style={{ gap: 12 }}>
              <TextInput
                placeholder="Library Name"
                placeholderTextColor={colors.muted}
                value={newLibrary.name}
                onChangeText={(text) => setNewLibrary({ ...newLibrary, name: text })}
                className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                editable={!testingConnection}
              />
              <TextInput
                placeholder="Host (e.g., 192.168.1.100)"
                placeholderTextColor={colors.muted}
                value={newLibrary.host}
                onChangeText={(text) => setNewLibrary({ ...newLibrary, host: text })}
                className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                editable={!testingConnection}
              />
              <TextInput
                placeholder="Port (default: 22)"
                placeholderTextColor={colors.muted}
                value={String(newLibrary.port)}
                onChangeText={(text) => setNewLibrary({ ...newLibrary, port: parseInt(text) || 22 })}
                keyboardType="number-pad"
                className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                editable={!testingConnection}
              />
              <TextInput
                placeholder="Username"
                placeholderTextColor={colors.muted}
                value={newLibrary.username}
                onChangeText={(text) => setNewLibrary({ ...newLibrary, username: text })}
                className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                editable={!testingConnection}
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor={colors.muted}
                value={newLibrary.password}
                onChangeText={(text) => setNewLibrary({ ...newLibrary, password: text })}
                secureTextEntry
                className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                editable={!testingConnection}
              />
              <TextInput
                placeholder="Remote Path (e.g., /mnt/comics/music)"
                placeholderTextColor={colors.muted}
                value={newLibrary.path}
                onChangeText={(text) => setNewLibrary({ ...newLibrary, path: text })}
                className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                editable={!testingConnection}
              />

              {/* Test Connection Button */}
              <TouchableOpacity
                onPress={testConnection}
                disabled={testingConnection}
                style={[
                  styles.testButton,
                  { backgroundColor: colors.warning, opacity: testingConnection ? 0.6 : 1 },
                ]}
              >
                {testingConnection ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.buttonText}>Testing...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Test Connection</Text>
                )}
              </TouchableOpacity>

              {/* Add/Cancel Buttons */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={addLibrary}
                  disabled={testingConnection}
                  style={[styles.actionButton, { backgroundColor: colors.primary, flex: 1 }]}
                >
                  <Text style={styles.buttonText}>Add Library</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowAddLibrary(false)}
                  disabled={testingConnection}
                  style={[styles.actionButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flex: 1 }]}
                >
                  <Text style={[styles.buttonText, { color: colors.foreground }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {libraries.length > 0 ? (
            libraries.map((library) => (
              <View
                key={library.id}
                className="bg-surface border border-border rounded-lg p-4"
                style={{ gap: 12, marginTop: 8 }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text className="text-lg font-semibold text-foreground">{library.name}</Text>
                    <Text className="text-sm text-muted">{library.host}:{library.port}</Text>
                    <Text className="text-xs text-muted" style={{ marginTop: 2 }}>{library.path}</Text>
                  </View>
                  {library.isDefault && (
                    <View style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: "600", color: colors.background }}>Default</Text>
                    </View>
                  )}
                </View>

                {/* Refresh Library Button */}
                <TouchableOpacity
                  onPress={() => refreshLibrary(library)}
                  disabled={refreshingLibraryId === library.id}
                  style={[
                    styles.refreshButton,
                    { backgroundColor: colors.primary, opacity: refreshingLibraryId === library.id ? 0.6 : 1 },
                  ]}
                >
                  {refreshingLibraryId === library.id ? (
                    <View style={styles.buttonContent}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.buttonText}>Syncing...</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>Refresh Library</Text>
                  )}
                </TouchableOpacity>

                {/* Action Buttons */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {!library.isDefault && (
                    <TouchableOpacity
                      onPress={() => setDefaultLibrary(library.id)}
                      style={styles.iconButton}
                    >
                      <Text style={{ fontSize: 16 }}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => deleteLibrary(library.id)}
                    style={[styles.deleteButton, { borderColor: colors.error }]}
                  >
                    <Text style={{ fontSize: 14, color: colors.error, fontWeight: "600" }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View className="bg-surface border border-border rounded-lg p-4 items-center" style={{ marginTop: 8 }}>
              <Text className="text-sm text-muted">No libraries configured yet</Text>
            </View>
          )}
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text className="text-lg font-semibold text-foreground">About</Text>
          <View className="bg-surface rounded-lg p-4 border border-border" style={{ gap: 8 }}>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">App Version</Text>
              <Text className="text-sm font-semibold text-foreground">1.0.0</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Build</Text>
              <Text className="text-sm font-semibold text-foreground">1</Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text className="text-lg font-semibold text-error">Danger Zone</Text>
          <TouchableOpacity
            onPress={clearAllData}
            style={[styles.clearButton, { backgroundColor: colors.error }]}
          >
            <Text style={styles.buttonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  testButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
