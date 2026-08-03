// **강조** 마크만 지원하는 최소 리치 텍스트. 프로토타입 HTML의 <b> 문구를 그대로 옮기기 위한 용도.
import { Text, TextStyle } from "react-native";

export function RichText({ text, style }: { text: string; style?: TextStyle }) {
  const lines = text.split("\n");
  return (
    <Text style={style}>
      {lines.map((line, li) => (
        <Text key={li}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <Text key={i} style={{ fontWeight: "700" }}>
                {part.slice(2, -2)}
              </Text>
            ) : (
              <Text key={i}>{part}</Text>
            ),
          )}
          {li < lines.length - 1 ? "\n" : ""}
        </Text>
      ))}
    </Text>
  );
}
