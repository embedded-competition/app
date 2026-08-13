// 2026-08-12 시점 실제 백엔드(Orca Backend, https://api.agenthub.work/openapi.json) 응답을
// 그대로 타입화. 예전엔 planning/decisions.md §7 데이터 인벤토리 기준(sraw·mv 같은 raw값 포함)
// 이었는데, 실제 스펙엔 그런 raw값이 없고 상태 모델도 완전히 다르다 — 자세한 대조는
// scooter-app/docs/interface.md §2·§3 참고.
//
// 아직 이 타입을 실제로 쓰는 화면 코드는 없다(services/telemetrySource.ts가 여전히
// noTelemetrySource, HTTP 폴링 구현체는 없음) — 실 연동 시 이 타입을 쓰면 된다.

/** 사용자가 지금 뭘 해야 하는가. 화면 게이지의 세 지점과 1:1(서버 스펙 설명). */
export type DeviceStatus = "STABLE" | "SERVICE_NEEDED" | "REPORT";

/** 화재로 가는 진행 단계. 나열 순서가 곧 진행 순서 — mocks/channels.ts의 STEPPER_LABELS 5개와 순서가 같다. */
export type Stage = "NONE" | "TEMP_RISE" | "GAS_LEAK" | "RAPID_WORSENING" | "IGNITION";

/** 지금 동시에 일어나는 현상들(배열, 복수 가능). */
export type Condition =
  | "CO_RISE"
  | "H2_RISE"
  | "VOC_RISE"
  | "PRESSURE_RISE"
  | "WATER"
  | "SENSOR_FAULT"
  | "UNKNOWN";

/** GET /sensors/{sensor}/detail의 sensor 경로 파라미터. temp·rh는 기간 조회에서만 되고 telemetry/current엔 아직 없다. */
export type Sensor = "gas" | "h2" | "co" | "pressure" | "temp" | "rh";

/** GET /sensors/{sensor}/detail의 집계 눈금. */
export type Interval = "5m" | "15m" | "30m" | "1h" | "2h" | "6h" | "12h" | "1d";

/** 기준선 대비 상대 편차(value)와 분당 변화량(slope). 평소와 같으면 value=0. gas/h2/co/pressure가 전부 이 모양. */
export interface ChannelReading {
  value: number | null;
  slope: number | null;
}

/** GET /v1/devices/{mac}/telemetry/current 응답. */
export interface DeviceCurrentResponse {
  status: DeviceStatus | null;
  stage: Stage | null;
  conditions: Condition[];
  /** 이 응답이 근거로 삼은 마지막 관측 시각(UTC). 관측이 없으면 null. */
  at: string | null;
  /** ALARM latch 유지 여부. 자동 해제 없음(A7). */
  latched: boolean;
  /** 침수·누액 감지 — 이제 채널이 아니라 최상위 불리언. */
  water: boolean;
  gas: ChannelReading | null;
  h2: ChannelReading | null;
  co: ChannelReading | null;
  pressure: ChannelReading | null;
}

export interface PeakChannelReading extends ChannelReading {
  /** 이 값이 기간 중 최고치를 찍은 시각(UTC). */
  at: string;
}

/** GET /v1/devices/{mac}/telemetry/peaks?from=&to= 응답. */
export interface PeriodPeaksResponse {
  status: DeviceStatus | null;
  stage: Stage | null;
  conditions: Condition[];
  gas: PeakChannelReading | null;
  h2: PeakChannelReading | null;
  co: PeakChannelReading | null;
  pressure: PeakChannelReading | null;
}

export type BucketLevel = "NORMAL" | "CAUTION" | "DANGER";

export interface DetailBucket {
  /** 눈금 구간의 시작 시각(UTC, 끝은 미포함). */
  start: string;
  /** 판정 기준이 아직 없어서 지금은 항상 null. */
  level: BucketLevel | null;
  /** 이 칸의 값 — 평균이 아니라 최고치(서버 설명: "평균은 스파이크를 지우고, 지워진 스파이크가 곧 놓친 경보다"). */
  value: number | null;
  slope: number | null;
}

/** GET /v1/devices/{mac}/sensors/{sensor}/detail?interval=&from=&to= 응답. */
export interface SensorDetailResponse {
  /** 데이터가 있는 눈금 칸만 온다 — 빠진 칸이 곧 관측 공백. */
  buckets: DetailBucket[];
}

/** GET /v1/devices/{mac}/location 응답. telemetry/current에서 빠지고 별도 엔드포인트로 분리됨. */
export interface LocationResponse {
  lat: number;
  lon: number;
  at: string;
}

export interface EventResponse {
  id: number;
  timestamp: string;
  kind: string; // 예: "state_change" | "action" | "suppressed"
  /** 서버가 생성한 문장(C5) — 노드는 상태 전이만 보내고 서술은 서버 책임. */
  description: string;
}

/** GET /v1/devices/{mac}/events?since=&until= 응답. */
export interface EventListResponse {
  items: EventResponse[];
  /** true면 이 범위에 더 있는데 이번 응답엔 안 담겼다는 뜻(페이지네이션 없음, 잘렸다는 신호만 줌). */
  truncated: boolean;
}

/** POST /v1/devices/{mac}/alarm/release 요청/응답. */
export interface AlarmReleaseRequest {
  note?: string | null;
}
export interface AlarmReleaseResponse {
  released: boolean;
}

/** POST /v1/devices/{mac}/push-token 요청/응답(멱등). */
export interface PushTokenRequest {
  token: string;
}
export interface PushTokenResponse {
  registered: boolean;
}
