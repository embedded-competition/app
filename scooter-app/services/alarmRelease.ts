// 경보 해제 요청의 서버 경계. [O8](../../planning/decisions/open-questions.md#o8) 확정:
// 해제 "권한 판단"은 서버가 내부에서 한다 — 앱은 그 규칙을 몰라도 되고, 그냥 요청만 보낸다.
// 서버가 허용하면 성공, 아니면 실패만 돌려준다(왜 거부됐는지 세세한 사유는 앱에 안 내려줌).
//
// 서버가 아직 없어서(C4) 지금은 항상 실패하는 스텁만 있다 — deviceRegistry.ts의
// localOnlyDeviceRegistry(항상 성공)와 다르게, 이건 진짜 서버 쪽 권한 로직이 있어야
// 의미가 있는 액션이라 "서버 없음"을 정직하게 실패로 표시한다.
export interface AlarmReleaseResult {
  ok: boolean;
  error?: string;
}

export interface AlarmReleaseService {
  /** note는 선택 — 해제 사유 메모. */
  request(deviceId: string, note?: string): Promise<AlarmReleaseResult>;
}

export const noAlarmReleaseService: AlarmReleaseService = {
  async request() {
    return { ok: false, error: "no_server" };
  },
};
