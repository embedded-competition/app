// 기기 등록(페어링)의 서버 경계. 사용자가 점검장비(MCU) 라벨의 MAC 주소를 입력하면
// 이 인터페이스를 통해 서버로 보내서 킥보드를 계정에 연동한다.
//
// 인증 모델 확정: 로그인 없음 — 등록 성공 시 서버가 내려주는 deviceToken이 "이 폰이 이
// 킥보드에 접근 자격이 있다"는 증명이다. 이후 모든 요청은 이 토큰만 Authorization 헤더에
// 실어 보내면 된다(사람 계정 로그인이 아니라 폰-킥보드 페어링 단위 인증). 자세한 요청/응답
// 예시는 레포 최상위 api-spec.md 참고.
//
// 서버가 아직 없어서(C4) 지금은 로컬에만 저장하고 무조건 성공 처리하는 스텁만 있다 —
// deviceToken도 아직 안 내려준다(어차피 지금은 이 토큰을 쓰는 API 호출 자체가 없음).
// 서버가 정해지면 이 파일 안에서 실제 HTTP 구현체로 교체하면 된다.
const MAC_PATTERN = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

/** "aa-bb-cc-dd-ee-ff" 같은 입력도 받아서 "AA:BB:CC:DD:EE:FF" 형태로 정규화한다. 형식이 틀리면 null. */
export function normalizeMac(input: string): string | null {
  const trimmed = input.trim();
  if (!MAC_PATTERN.test(trimmed)) return null;
  return trimmed.toUpperCase().replace(/-/g, ":");
}

// 실기기 없이 화면 개발할 때 쓰는 우회 코드. PairingForm에 "0000"을 입력하면 실제 MAC
// 형식 검증 없이 이 값으로 즉시 등록되고, 곧바로 미리보기(NoDataState → 정상/주의/경보) 화면으로
// 들어간다 — 진짜 기기처럼 보이지 않도록 화면에 노출될 땐 항상 isDevBypassMac()으로 구분해서 표시할 것.
export const DEV_BYPASS_CODE = "0000";
export const DEV_BYPASS_MAC = "00:00:00:00:00:00";

export function isDevBypassMac(mac: string | null): boolean {
  return mac === DEV_BYPASS_MAC;
}

export interface DeviceRegistryResult {
  ok: boolean;
  error?: string;
  deviceId?: string;
  /** 이후 모든 요청의 Authorization: Bearer <deviceToken>에 쓸 값. 실 서버 연동 전까지는 안 채워짐. */
  deviceToken?: string;
  /** 이 킥보드가 등록된 위치(주차장·건물)의 관리실 전화번호 — 서버가 맥주소 연결 시 같이 내려준다. */
  managementPhone?: string;
}

export interface DeviceRegistry {
  register(mac: string): Promise<DeviceRegistryResult>;
}

// 서버가 없어서 항상 성공 처리하는 로컬 전용 스텁 — managementPhone은 데모용 고정값을 돌려준다.
// 실 서버가 생기면 fetch(`/devices`, ...) 구현체로 바꿔서 export를 교체한다 —
// DeviceProvider의 registry prop만 갈아끼우면 된다.
export const localOnlyDeviceRegistry: DeviceRegistry = {
  async register(_mac) {
    return { ok: true, managementPhone: "01029015899" };
  },
};
