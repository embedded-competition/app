// 데이터 모델. planning/decisions.md §7 데이터 인벤토리를 그대로 타입화.
// optional 필드 = 아직 "미착수/계획/없음" 상태(문서 원본 상태 주석 참고). 있음/일부만 non-optional.

export type NodeState = "NORMAL" | "WATCH" | "ALARM" | "FAULT";

export interface GasChannel {
  // 배터리 가스 (VOC · SGP40) — PRIMARY 채널. 있음(일부: 내부값 미전송 → O2)
  sraw: number;
  baseline: number;
  devZ: number;
  slope: number;
}

export interface HydrogenChannel {
  // 과충전 가스 (H2 · MQ-8) — 있음
  mv: number;
  mvAvg: number;
  rsKohm: number;
  slope: number;
}

export interface CarbonMonoxideChannel {
  // 타는 가스 (CO · MQ-7) — 미착수, 센서 미도입
  mv: number;
  slope: number;
}

export interface EnvChannel {
  // 배터리 온도/습도 게이트 (SHT4x) — 미착수
  tempC: number;
  rh: number;
  dRhDt: number;
}

export interface PressureChannel {
  // 부풀어 오름 (S6) — 미착수. 킥보드에선 거의 안 움직임, 확장 대비 채널 (O9)
  presDev: number;
  presRate: number;
}

export interface SignatureFlags {
  // 판단 근거 3요소: 급변/지속/무회복 (A4) — 노드가 아직 전송 안 함 → O2
  rise: boolean;
  hold: boolean;
  noRecover: boolean;
  holdS: number;
}

export interface ModuleStatus {
  // LoRa 14B 페이로드 기반 — 있음
  nodeId: string;
  seq: number;
  battMv: number;
  rssi: number;
  lastSeen: string; // ISO timestamp
}

export interface TelemetryEvent {
  // 기록 탭용 — 서버가 생성 (C5). 노드는 상태 전이만 보냄
  id: string;
  timestamp: string;
  kind: "state_change" | "action" | "suppressed";
  description: string;
}

export interface DeviceTelemetry {
  state: NodeState;
  latched: boolean; // ALARM은 자동 해제 없음 (A7)
  gas: GasChannel;
  h2: HydrogenChannel;
  co?: CarbonMonoxideChannel;
  env?: EnvChannel;
  pressure?: PressureChannel;
  water?: boolean; // 물·누액 확증 보너스 — 계획
  module: ModuleStatus;
  signature?: SignatureFlags;
  location?: { lat: number; lon: number }; // O1 확정: GPS(임베디드 모듈 직접 측정). 실 전송은 임베디드 포맷 확정 후
}
