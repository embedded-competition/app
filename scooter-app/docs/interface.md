# 앱 ↔ 서버 인터페이스 명세

**상태: Draft.** 원 소스는 [`planning` 레포](../../../planning)의 `decisions.md` §7(데이터 인벤토리)·`decisions/open-questions.md`다. 이 문서는 그걸 **앱 코드가 실제로 기대하는 계약** 관점으로 정리한 것 — 서버·임베디드 팀이 이 문서를 보고 구현하면 된다. 값이 바뀌면 여기와 `types/telemetry.ts`·`services/telemetrySource.ts`를 같이 고칠 것.

실제 엔드포인트 형태(URL·메서드·요청/응답 스키마)는 [`../../api-spec.md`](../../api-spec.md)(레포 최상위)에 따로 있다 — 이제 그 문서는 "제안"이 아니라 실제로 배포된 백엔드(Orca Backend)의 OpenAPI 스펙을 그대로 옮긴 것이다. 이 문서는 "앱이 뭘 원하는가" 관점이라 실제 스펙과 어긋나는 부분(예: raw 센서값 없음, 상태값 대문자)이 있을 수 있다 — 그런 건 아래에 표시해뒀다.

## 0. 왜 이 문서가 필요한가

[C4](../../../planning/decisions/collaboration.md#c4)에 따르면 임베디드 전송 포맷이 앱 화면 필드·서버 스키마보다 먼저 정해져야 한다. 반대로 앱이 화면에 뭘 필요로 하는지가 먼저 드러나야 그 논의가 시작된다 — 이 문서가 그 "앱이 뭘 필요로 하는가" 쪽이다.

## 1. 아키텍처 경계

```
임베디드 노드 → 서버(정규화·판정 보조·저장) → [TelemetrySource 구현체] → useAppState → 화면
```

앱은 `services/telemetrySource.ts`의 `TelemetrySource` 인터페이스 하나만 알면 된다. 실제 통신 방식은 **HTTP 요청 폴링으로 확정**했다(WebSocket·SSE 같은 연결 유지형 프로토콜은 안 씀 — [`../../api-spec.md`](../../api-spec.md)의 "① 조회" 패턴 참고) — 그 구현체 안에서만 처리하면 화면 코드는 손댈 필요가 없다.

**실제 백엔드는 있다(Orca Backend, `../../api-spec.md` 참고) — 다만 앱이 아직 거기 안 붙었다.** `services/telemetrySource.ts`는 여전히 `noTelemetrySource`(아무 것도 방출하지 않음)가 기본값이고, `DevStateToggle`이 화면 상단에서 로컬로만 상태를 채워 넣는다. `LiveBadge`가 `isLive=false`일 때 "목데이터"라고 정직하게 표시하는 것도 이 때문이다. 실제 HTTP 폴링 구현체를 붙이는 건 아직 안 한 일이다(§7).

## 2. 지금 구현된 최소 계약 (Phase 1)

```ts
type AppState = "NORMAL" | "WATCH" | "ALARM" | "FAULT";

interface TelemetrySource {
  /** 서버가 상태를 보낼 때마다 호출. 구독 해제 함수를 반환한다. */
  subscribe(onState: (state: AppState) => void): () => void;
}
```

- `AppState`는 실제 백엔드의 `AlertState`(`WARMUP`/`NORMAL`/`WATCH`/`ALARM`/`FAULT`)와 **대소문자까지** 맞췄다. `WARMUP`은 아직 안 넣었다 — `WATCH`와 의미가 겹칠 가능성이 있어 서버팀에 정의를 확인 요청해뒀다([`../../backend-requests.md`](../../backend-requests.md)). `FAULT`는 넣었다 — `components/dev/FaultState.tsx`로 별도 화면(가스 심각도 개념이 아니라서 게이지·리본 틀에 안 맞음).
- `subscribe`가 처음 호출된 시점에는 아직 값이 없을 수 있다(연결 전) — 그 동안 앱은 `remoteState === null`로 보고 `isLive=false`를 유지한다.
- 상태가 `ALARM`으로 잠기면([A7](../../../planning/decisions/algorithm.md#a7), latch) 서버도 계속 `"ALARM"`을 보내야 한다 — 신호가 사라졌다고 조용히 `"NORMAL"`로 되돌리면 안 된다.

## 3. 목표 데이터 모델 (Phase 2 — 아직 미구현)

지금 화면(채널 카드·게이지·차트·판단근거·비교)은 `mocks/channels.ts`에 **상태별로 하드코딩된 문구·수치**를 쓰고 있다. 실제 서버 페이로드가 오면 `TelemetrySource.subscribe`가 `AppState` 대신(또는 그와 함께) 아래 `DeviceTelemetry`를 방출하도록 확장해야 한다. 필드는 `types/telemetry.ts`에 이미 타입으로 있다 — 여기서는 각 필드가 **화면 어디에 쓰이는지**와 **지금 상태**를 같이 적는다.

| 필드 | 타입 | 상태 | 화면 사용처 | 비고 |
|---|---|---|---|---|
| `state` | `NodeState` | 있음 | 상태 리본, `LiveBadge`, 경보 화면 진입 | §1의 `AppState`와 동일 개념 |
| `latched` | `boolean` | 있음 | 경보가 계속 유지 중인지 표시(참고용) | A7 — latch 해제 전까지 true. 해제는 앱이 요청만 보내고 승인은 서버가 판단([O8](../../../planning/decisions/open-questions.md#o8), `../../../api-spec.md`의 `alarm/release`) |
| `gas.{devZ,slope}` | `GasChannel` | 있음 — **단 `sraw`/`baseline`(raw값)은 실제로 안 온다**([O2](../../../planning/decisions/open-questions.md#o2)) | 배터리 가스 카드·게이지 | PRIMARY 채널, S1. 원본수치 접이식은 보여줄 게 없어서 주석 처리함 |
| `h2.{devZ,slope}` | — | 있음 — **`mv`/`mvAvg`/`rsKohm`(raw값)은 안 온다**, `gas`와 완전히 같은 모양 | 과충전 가스 카드 | S2. 아래 `types/telemetry.ts`의 `HydrogenChannel` 타입은 실제 스펙과 다름 — 갱신 필요 |
| `co.{devZ,slope}` | — | 있음(`telemetry/latest`에선 null 가능, `telemetry/history`에선 항상 채워짐) | 타는 가스 카드 | S3, 확증 전용. 마찬가지로 raw `mv` 없음 |
| `env.{tempC,rh,dRhDt}` | `EnvChannel?` | nullable | 배터리 온도 카드, 습도 게이트 | S4 |
| `pressure.{presDev,presRate}` | `PressureChannel?` | nullable — **`telemetry/history`의 시간별 샘플에서는 `presDev`만 감싸지 않은 숫자로 오고 `presRate`는 필드 자체가 없음**(gas/h2/co는 두 응답에서 모양이 동일한데 pressure만 다름 — 의도된 건지 확인 요청함) | 부풀어 오름 카드 | S6/[O9](../../../planning/decisions/open-questions.md#o9) — 킥보드에선 거의 안 움직이는 게 정상 |
| `water` | `boolean?` | nullable | 물·누액 카드 | S5, 확증 보너스 |
| `signature.{rise,hold,noRecover,holdS}` | `SignatureFlags?` | 있음 — **단 nullable**(항상 채워지는 게 아님, 어떤 조건에서 null인지 확인 요청함) | 항목 상세 "판단 근거 3요소" | A4 |
| `module.{nodeId,seq,battMv,rssi,snr,lastSeen}` | `ModuleStatus` | 있음 | 모듈 상태 표 | LoRa 14B 페이로드. `snr` 필드가 추가로 옴(지금 화면에서 안 씀) |
| `location` | `{lat,lon}` | GPS로 확정([O1](../../../planning/decisions/open-questions.md#o1)) — nullable | 실시간 화면 지도 | 지금은 폰 GPS로 대체 중(`DeviceMap.tsx`) — 서버 좌표 연동 코드 전환 필요 |

### 3.1 문구는 누가 만드나 — 답이 나왔다: 서버는 문구를 안 준다

지금 `mocks/channels.ts`의 `STATE_CONTENT`에는 `"평소보다 8배 빠르게 늘고 있습니다"` 같은 **완성된 한국어 문구**가 상태별로 하드코딩돼 있다. [C5](../../../planning/decisions/collaboration.md#c5) 원칙("상태 → 문구·권장 조치 매핑은 서버 책임")대로라면 이 문구를 서버가 내려줘야 하는데, **실제 백엔드 스펙엔 그런 필드가 없다** — `state`/`devZ`/`slope` 같은 숫자·enum만 오고 `msg`/`easy`/`cta` 같은 표시용 문구 필드는 아예 없다. 즉 지금 스펙대로면 **문구 생성은 앱 책임으로 남는다** — C5 원칙과 실제 구현이 어긋난 상태. 이대로 갈지, 서버에 문구 필드 추가를 요청할지는 팀 논의가 필요하다(일단 [`backend-requests.md`](../../backend-requests.md)에는 안 올렸음 — 이건 API 스펙 문제라기보다 팀 설계 방향 문제라서).

## 4. 이벤트 모델 — `TelemetryEvent` (기록 탭)

| 필드 | 설명 |
|---|---|
| `id` | 고유 ID |
| `timestamp` | ISO 8601 |
| `kind` | `"state_change"` \| `"action"` \| `"suppressed"` |
| `description` | 사람이 읽을 문장 (역시 서버가 생성 — [C5](../../../planning/decisions/collaboration.md#c5)) |

노드는 상태 전이만 보내고, "무슨 일이 있었는지" 서술·`suppressed`(오경보 차단 기록, [O3](../../../planning/decisions/open-questions.md#o3))·`actions`(플러그 차단·통보)는 전부 서버가 만든다.

## 5. 열린 질문이 인터페이스에 미치는 영향

| # | 질문 | 지금 앱이 임시로 하는 것 | Phase 2에서 바뀔 것 |
|---|---|---|---|
| [O5](../../../planning/decisions/open-questions.md#o5) | 탭 3개 vs 4개(+통계) | **최종적으로 탭바 자체를 없앴다**(하단 탭 4개 → 메인 화면 하나) — 기록은 아코디언, 통계는 메인·상세보기의 "기간 조회"(지금/오늘/최근 7일/기간선택)로 흡수됨. 설정은 헤더 햄버거로 여는 오버레이 | `telemetry/history`는 하루 단위만 되고 범위 조회가 없어서, "최근 7일"류는 지금 API로 안 됨 — 서버에 range 지원 요청해둠([`../../backend-requests.md`](../../backend-requests.md)) |

> [O9](../../../planning/decisions/open-questions.md#o9)(압력 채널 센서 종류)는 이 표에서 뺐다 — 어떤 센서를 쓰든 앱은 정규화된 `pressure` 값만 받으므로 인터페이스에 영향이 없다(임베디드 하드웨어 결정일 뿐). `pressure` 필드 자체는 여전히 "미착수" 상태([§3](#3-목표-데이터-모델-phase-2--아직-미구현) 표 참고) — 센서가 뭐든 상관없이 임베디드 쪽 구현이 끝나야 채워진다.

**확정된 것**

| # | 결정 | 앱에 미치는 영향 |
|---|---|---|
| [O1](../../../planning/decisions/open-questions.md#o1) | 위치 소스 = **GPS로 확정**(임베디드 모듈이 직접 측정) | `DeviceTelemetry.location`에 실좌표가 채워져서 온다. 앱은 그대로 표시만 하면 됨 — 지금 `DeviceMap.tsx`의 폰 GPS 추종은 이 결정 전 임시방편이라 controlled `camera`(서버 좌표 기반)로 코드 전환 필요 |
| [O2](../../../planning/decisions/open-questions.md#o2) | 노드가 판단 근거를 전송할지 = **서버가 계산해서 제공**(노드가 아니라 서버가 raw로부터 계산) | `signature` 필드로 온다 — 단 **nullable이라 항상 채워지는 건 아님**([§3](#3-목표-데이터-모델-phase-2--아직-미구현) 참고), 화면은 null 가능성을 방어적으로 처리해야 함 |
| [O4](../../../planning/decisions/open-questions.md#o4) | 기기 관리 = **단일 기기로 확정**(1계정=1기기) | `DeviceContext`의 맥주소 1개 전제가 그대로 최종 모델. 다중 기기 대응 코드 안 짜도 됨 |
| [O8](../../../planning/decisions/open-questions.md#o8) | 경보 해제 권한 = **앱은 요청만, 승인은 서버가 내부 규칙으로 판단** | `alarm.tsx`에 "경보 해제 요청" 버튼 완료 — `services/alarmRelease.ts`로 요청 전송, 서버 없어서 항상 실패 응답 |

## 6. 기기 등록 (페어링)

텔레메트리를 받으려면 그 전에 **어떤 킥보드인지**부터 정해져야 한다. 사용자가 점검장비(MCU) 라벨의 MAC 주소를 앱에 입력하면 서버가 그 MAC으로 킥보드를 계정에 연동한다 — 등록 전에는 앱이 아예 메인 화면을 안 띄우고 등록 화면만 보여준다(`app/_layout.tsx`).

```ts
interface DeviceRegistryResult {
  ok: boolean;
  error?: string;
  deviceId?: string;
  deviceToken?: string; // 인증용 — 이후 모든 요청에 Authorization: Bearer <deviceToken>
  managementPhone?: string; // 등록 위치의 관리실 전화번호 — 경보 화면 "관리실 전화" 버튼에 씀
}

interface DeviceRegistry {
  /** mac은 "AA:BB:CC:DD:EE:FF" 형식으로 정규화된 값(services/deviceRegistry.ts의 normalizeMac). */
  register(mac: string): Promise<DeviceRegistryResult>;
}
```

- **인증 모델 확정**: 로그인/계정 시스템 없음. 등록 성공 시 서버가 내려주는 `deviceToken`이 "이 폰이 이 킥보드에 접근 자격이 있다"는 증명이고, 이후 모든 요청은 그 토큰만 쓴다(사람 단위가 아니라 폰-킥보드 페어링 단위 인증). 상세 요청/응답 예시는 [`../../../api-spec.md`](../../../api-spec.md) 참고.
- 지금은 `localOnlyDeviceRegistry`가 항상 `{ ok: true }`만 반환하고 AsyncStorage에는 mac만 저장한다 — `deviceToken`은 실 서버가 생기기 전까지 안 채워진다(어차피 아직 이 토큰을 쓰는 API 호출이 없음).
- MAC 하나 = 킥보드 한 대, **[O4](../../../planning/decisions/open-questions.md#o4) 확정**: 다중 기기 지원 없이 이대로 최종 모델로 간다. (관리실 다중 관리 같은 시나리오가 나중에 필요해지면 계정↔기기 다대다 관계·로그인 시스템을 다시 설계해야 하지만, 지금은 범위 밖으로 명시적으로 뺐다.)
- 개발 모드(`__DEV__`)에서는 `"0000"`을 입력하면 실제 MAC 검증 없이 고정 값(`00:00:00:00:00:00`)으로 즉시 등록되고 미리보기 화면으로 들어간다. 프로덕션 빌드에서는 이 분기가 번들에서 아예 빠진다 — 배포판에 우회 코드가 남을 걱정은 안 해도 된다.

## 7. 변경 관리

이 문서는 draft다. **서버 API 자체는 이제 실제로 있다**(Orca Backend) — 남은 건 앱 쪽 통합이다:
1. `types/telemetry.ts`를 실제 스펙(`../../api-spec.md`)에 맞게 갱신 — 지금은 raw 필드(`sraw`/`mv` 등)가 남아있어서 실제와 다름
2. `services/telemetrySource.ts`에 HTTP 폴링 구현체(`telemetry/latest` 반복 호출) 추가, `noTelemetrySource`는 개발/오프라인 폴백으로만 남김
3. `services/deviceRegistry.ts`에 실제 HTTP 구현체(`POST /devices`) 추가, `localOnlyDeviceRegistry`는 폴백으로만 남김
4. `services/alarmRelease.ts`에 실제 HTTP 구현체(`POST /devices/{id}/alarm/release`) 추가
5. 이 문서·`mocks/channels.ts`의 하드코딩 문구를 §3.1 결정(문구를 서버가 줄지 앱이 만들지)에 따라 갱신
6. [`backend-requests.md`](../../backend-requests.md)의 요청 사항(기간 범위 조회, nullable 필드 조건 등)이 해결되면 관련 표를 갱신
