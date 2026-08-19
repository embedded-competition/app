// 기기 등록(페어링)의 서버 경계. 사용자가 점검장비(MCU) 라벨의 MAC 주소를 입력하면 이
// 인터페이스를 통해 "이 폰이 어떤 킥보드를 볼지"를 정한다.
//
// **2026-08-12 확인: 실제 서버엔 등록 엔드포인트도, 인증도 없다.** 예전엔 여기서 "등록 성공 시
// deviceToken을 발급받아 Authorization 헤더에 싣는다"는 전제로 설계했는데, 실제 스펙
// (`https://api.agenthub.work/openapi.json`)엔 `POST /devices` 같은 등록 엔드포인트가 아예
// 없고 모든 요청이 `securitySchemes: {}`(인증 없음) 상태로 URL 경로에 맥주소만 넣어서 바로
// 조회된다 — 자세한 내용은 scooter-app/docs/interface.md §6 참고. 즉 **아래
// `localOnlyDeviceRegistry`(로컬 저장 + 무조건 성공)가 "서버 없어서 쓰는 임시 스텁"이 아니라
// 최종 아키텍처에 가까울 가능성이 높다** — 다른 사람이 맥주소만 알면 조회가 되는 게 의도인지,
// managementPhone을 어디서 받아야 하는지는 아직 서버팀 확인 중(backend-requests.md §1.4·§2.1).
const MAC_PATTERN = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

/** "aa-bb-cc-dd-ee-ff" 같은 입력도 받아서 "AA:BB:CC:DD:EE:FF" 형태로 정규화한다. 형식이 틀리면 null. */
export function normalizeMac(input: string): string | null {
  const trimmed = input.trim();
  if (!MAC_PATTERN.test(trimmed)) return null;
  return trimmed.toUpperCase().replace(/-/g, ":");
}

export interface DeviceRegistryResult {
  ok: boolean;
  error?: string;
  deviceId?: string;
  /** 이 킥보드가 등록된 위치(주차장·건물)의 관리실 전화번호 — 실제로 어느 API에서 받을지는 아직 미정(backend-requests.md §1.4). */
  managementPhone?: string;
}

export interface DeviceRegistry {
  register(mac: string): Promise<DeviceRegistryResult>;
}

// 로컬 전용 구현 — managementPhone은 데모용 고정값을 돌려준다. 위 파일 상단 주석 참고: 서버에
// 등록 엔드포인트가 없다는 게 확인돼서, 이게 "서버 없어서 쓰는 임시 스텁"이 아니라 최종 형태에
// 가까울 수 있다. managementPhone을 실제로 어디서 받을지 정해지면 그 부분만 고치면 된다.
export const localOnlyDeviceRegistry: DeviceRegistry = {
  async register(_mac) {
    return { ok: true, managementPhone: "01029015899" };
  },
};
