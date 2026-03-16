import { View, Text, Modal, TouchableOpacity, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  confirmStyle?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = "Confirm",
  confirmStyle = "default",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
        onPress={onCancel}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 24,
            padding: 24,
            width: "100%",
            maxWidth: 380,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          {/* Icon */}
          <View
            style={{
              alignSelf: "center",
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor:
                confirmStyle === "destructive" ? "#fff0f0" : "#eff6ff",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons
              name={
                confirmStyle === "destructive"
                  ? "trash-outline"
                  : "help-circle-outline"
              }
              size={28}
              color={confirmStyle === "destructive" ? "#ff4b4b" : "#2563eb"}
            />
          </View>

          {/* Title */}
          <Text
            style={{
              fontFamily: "Nunito_700Bold",
              fontSize: 20,
              color: "#1e293b",
              textAlign: "center",
              marginBottom: message ? 8 : 24,
            }}
          >
            {title}
          </Text>

          {/* Message */}
          {message && (
            <Text
              style={{
                fontFamily: "Nunito_400Regular",
                fontSize: 15,
                color: "#5b6b82",
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              {message}
            </Text>
          )}

          {/* Buttons */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: "#f1f5f9",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Nunito_600SemiBold",
                  fontSize: 16,
                  color: "#475569",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor:
                  confirmStyle === "destructive" ? "#ff4b4b" : "#2563eb",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Nunito_600SemiBold",
                  fontSize: 16,
                  color: "#ffffff",
                }}
              >
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
