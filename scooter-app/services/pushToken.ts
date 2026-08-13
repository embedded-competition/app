// 푸시 토큰을 서버에 등록하는 경계. 실제 엔드포인트: POST /v1/devices/{mac}/push-token
// (멱등), body { token: string }, 응답 { registered: boolean } — 인증·deviceId 발급 절차가
// 없어졌으니(deviceRegistry.ts 참고) mac만 있으면 부를 수 있는 구조로 보인다. 다만 아직 이
// 파일에 실제 HTTP 호출을 안 붙였다 — telemetrySource.ts처럼 HTTP 연동 작업 자체가 남아있음.
// alarmRelease.ts와 같은 패턴 — 정직하게 실패하는 스텁만 둔다(성공한 척 안 함).
export interface PushTokenResult {
  ok: boolean;
  error?: string;
}

export interface PushTokenService {
  register(mac: string, token: string): Promise<PushTokenResult>;
}

export const noPushTokenService: PushTokenService = {
  async register() {
    return { ok: false, error: "no_server" };
  },
};
