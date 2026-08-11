// 푸시 토큰을 서버에 등록하는 경계. api-spec.md "API 사용 순서" 2번(선택) —
// POST /devices/{deviceId}/push-token. 이 엔드포인트는 실제 백엔드(Orca)에도 있는 걸
// 확인했지만(https://api.agenthub.work/docs), 우리 쪽 deviceRegistry.ts가 아직 실제
// deviceId/deviceToken을 안 내려줘서(로컬 스텁) 이걸로 진짜 등록할 방법이 없다.
// alarmRelease.ts와 같은 패턴 — 정직하게 실패하는 스텁만 둔다(성공한 척 안 함).
export interface PushTokenResult {
  ok: boolean;
  error?: string;
}

export interface PushTokenService {
  register(deviceId: string, token: string): Promise<PushTokenResult>;
}

export const noPushTokenService: PushTokenService = {
  async register() {
    return { ok: false, error: "no_server" };
  },
};
