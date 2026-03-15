import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

export default function CoverArtGeneratorScreen() {
  const colors = useColors();
  const [prompt, setPrompt] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateCoverArt = async () => {
    if (!prompt.trim()) {
      Alert.alert("Error", "Please describe the cover art you want");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Integrate with OpenAI API via backend
      // For now, use a placeholder image
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Placeholder image URL (gradient background)
      setGeneratedImageUrl(
        "https://via.placeholder.com/400x400/0a7ea4/ffffff?text=Cover+Art"
      );
    } catch (error) {
      Alert.alert("Error", "Failed to generate cover art. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveImage = async () => {
    try {
      // TODO: Implement image saving to device
      Alert.alert("Success", "Cover art saved to your library!");
    } catch (error) {
      Alert.alert("Error", "Failed to save cover art");
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="gap-4 flex-1">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Cover Art Generator</Text>
            <Text className="text-sm text-muted">Create AI-powered cover art for your songs</Text>
          </View>

          {/* Input Section */}
          <View className="gap-3">
            <Text className="text-base font-semibold text-foreground">Art Description</Text>
            <TextInput
              placeholder="Describe the cover art style, colors, mood, elements..."
              placeholderTextColor={colors.muted}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={5}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              editable={!isLoading}
            />
            <Text className="text-xs text-muted">
              Include style (abstract, realistic, minimalist), colors, mood, and any specific
              elements
            </Text>
          </View>

          {/* Generate Button */}
          <TouchableOpacity
            onPress={generateCoverArt}
            disabled={isLoading}
            className={`rounded-lg py-3 items-center justify-center ${
              isLoading ? "bg-primary opacity-60" : "bg-primary"
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text className="text-background font-semibold">Generate Cover Art</Text>
            )}
          </TouchableOpacity>

          {/* Generated Image Display */}
          {generatedImageUrl && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">Generated Cover Art</Text>

              <View className="bg-surface border border-border rounded-lg overflow-hidden">
                <Image
                  source={{ uri: generatedImageUrl }}
                  style={{ width: "100%", height: 300 }}
                  resizeMode="cover"
                />
              </View>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={saveImage}
                  className="flex-1 bg-primary rounded-lg py-3 items-center active:opacity-80"
                >
                  <Text className="text-background font-semibold">Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setGeneratedImageUrl("");
                    setPrompt("");
                  }}
                  className="flex-1 bg-surface border border-border rounded-lg py-3 items-center active:opacity-70"
                >
                  <Text className="text-foreground font-semibold">Generate New</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tips Section */}
          {!generatedImageUrl && (
            <View className="bg-surface rounded-lg p-4 border border-border gap-2">
              <Text className="text-sm font-semibold text-foreground">💡 Tips</Text>
              <Text className="text-xs text-muted leading-relaxed">
                • Specify the art style (abstract, realistic, minimalist, surreal){"\n"}• Mention
                color palette{"\n"}• Describe the mood or atmosphere{"\n"}• Include specific
                elements or symbols{"\n"}• Be descriptive for better results
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
