import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

export default function LyricsGeneratorScreen() {
  const colors = useColors();
  const [prompt, setPrompt] = useState("");
  const [generatedLyrics, setGeneratedLyrics] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateLyrics = async () => {
    if (!prompt.trim()) {
      Alert.alert("Error", "Please enter a song theme or description");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Integrate with OpenAI API via backend
      // For now, show a placeholder
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const placeholderLyrics = `Verse 1:
${prompt}

Chorus:
This is where the magic happens,
In the rhythm of the night,
Every word a different passion,
Everything feels right.

Verse 2:
Building up the melody,
Finding the perfect sound,
Creating harmony,
Where love is always found.

Chorus:
This is where the magic happens,
In the rhythm of the night,
Every word a different passion,
Everything feels right.`;

      setGeneratedLyrics(placeholderLyrics);
    } catch (error) {
      Alert.alert("Error", "Failed to generate lyrics. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      // TODO: Implement clipboard copy
      Alert.alert("Success", "Lyrics copied to clipboard!");
    } catch (error) {
      Alert.alert("Error", "Failed to copy lyrics");
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="gap-4 flex-1">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Lyrics Generator</Text>
            <Text className="text-sm text-muted">Create AI-powered lyrics for your songs</Text>
          </View>

          {/* Input Section */}
          <View className="gap-3">
            <Text className="text-base font-semibold text-foreground">Song Theme</Text>
            <TextInput
              placeholder="Describe your song theme, mood, or story..."
              placeholderTextColor={colors.muted}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={6}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              editable={!isLoading}
            />
            <Text className="text-xs text-muted">
              Be specific about the mood, genre, or story you want to convey
            </Text>
          </View>

          {/* Generate Button */}
          <TouchableOpacity
            onPress={generateLyrics}
            disabled={isLoading}
            className={`rounded-lg py-3 items-center justify-center ${
              isLoading ? "bg-primary opacity-60" : "bg-primary"
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text className="text-background font-semibold">Generate Lyrics</Text>
            )}
          </TouchableOpacity>

          {/* Generated Lyrics Display */}
          {generatedLyrics && (
            <View className="gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-semibold text-foreground">Generated Lyrics</Text>
                <TouchableOpacity
                  onPress={copyToClipboard}
                  className="bg-surface border border-border rounded-lg px-3 py-2 active:opacity-70"
                >
                  <Text className="text-sm font-medium text-primary">Copy</Text>
                </TouchableOpacity>
              </View>

              <View className="bg-surface border border-border rounded-lg p-4">
                <Text className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {generatedLyrics}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setGeneratedLyrics("");
                  setPrompt("");
                }}
                className="bg-surface border border-border rounded-lg py-3 items-center active:opacity-70"
              >
                <Text className="text-foreground font-semibold">Generate New</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tips Section */}
          {!generatedLyrics && (
            <View className="bg-surface rounded-lg p-4 border border-border gap-2">
              <Text className="text-sm font-semibold text-foreground">💡 Tips</Text>
              <Text className="text-xs text-muted leading-relaxed">
                • Describe the emotion or story you want to tell{"\n"}• Mention the genre or
                style{"\n"}• Include any specific themes or messages{"\n"}• Be creative and
                specific for better results
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
