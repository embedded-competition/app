// 설정 탭에서 기기를 다시 등록/변경할 때 쓰는 라우트. 최초 게이트(미등록 상태)는
// app/_layout.tsx가 이 화면과 같은 PairingForm을 라우팅 없이 직접 띄운다.
import { router } from "expo-router";
import { PairingForm } from "@/components/pairing/PairingForm";

export default function PairingScreen() {
  return <PairingForm onPaired={() => router.back()} />;
}
