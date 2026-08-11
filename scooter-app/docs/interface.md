# 앱 ↔ 서버 인터페이스 명세

**상태: Draft.** 원 소스는 [`planning` 레포](../../../planning)의 `decisions.md` §7(데이터 인벤토리)·`decisions/open-questions.md`다. 이 문서는 그걸 **앱 코드가 실제로 기대하는 계약** 관점으로 정리한 것 — 서버·임베디드 팀이 이 문서를 보고 구현하면 된다. 값이 바뀌면 여기와 `types/telemetry.ts`·`services/telemetrySource.ts`를 같이 고칠 것.

실제 엔드포인트 형태(URL·메서드·요청/응답 스키마) 제안은 [`../../api-spec.md`](../../api-spec.md)(레포 최상위)에 따로 있다 — 이 문서는 "앱이 뭘 원하는가", 그 문서는 "그럼 서버 API는 어떻게 생겨야 하는가" 관점이다.

## 0. 왜 이 문서가 필요한가

[C4](../../../planning/decisions/collaboration.md#c4)에 따르면 임베디드 전송 포맷이 앱 화면 필드·서버 스키마보다 먼저 정해져야 한다. 반대로 앱이 화면에 뭘 필요로 하는지가 먼저 드러나야 그 논의가 시작된다 — 이 문서가 그 "앱이 뭘 필요로 하는가" 쪽이다.

## 1. 아키텍처 경계

```
임베디드 노드 → 서버(정규화·판정 보조·저장) → [TelemetrySource 구현체] → useAppState → 화면
```

앱은 `services/telemetrySource.ts`의 `TelemetrySource` 인터페이스 하나만 알면 된다. 실제 통신 방식은 **HTTP 요청 폴링으로 확정**했다(WebSocket·SSE 같은 연결 유지형 프로토콜은 안 씀 — [`../../api-spec.md`](../../api-spec.md)의 "① 조회" 패턴 참고) — 그 구현체 안에서만 처리하면 화면 코드는 손댈 필요가 없다.

**지금은 서버가 없다** — `noTelemetrySource`(아무 것도 방출하지 않음)가 기본값이고, `DevStateToggle`이 화면 상단에서 로컬로만 상태를 채워 넣는다. `LiveBadge`가 `isLive=false`일 때 "목데이터"라고 정직하게 표시하는 것도 이 때문이다.

## 2. 지금 구현된 최소 계약 (Phase 1)

```ts
type AppState = "normal" | "watch" | "alarm";

interface TelemetrySource {
  /** 서버가 상태를 보낼 때마다 호출. 구독 해제 함수를 반환한다. */
  subscribe(onState: (state: AppState) => void): () => void;
}
```

- `AppState`는 planning의 `NodeState`(`NORMAL`/`WATCH`/`ALARM`/`FAULT`, [A6](../../../planning/decisions/algorithm.md#a6--a7--a8))에서 화면 표시용으로 3가지만 쓴 것이다. **`FAULT`는 아직 화면에 없다** — 모듈 고장 시 어떻게 보여줄지는 미정이라 별도 이슈로 다뤄야 한다.
- `subscribe`가 처음 호출된 시점에는 아직 값이 없을 수 있다(연결 전) — 그 동안 앱은 `remoteState === null`로 보고 `isLive=false`를 유지한다.
- 상태가 `ALARM`으로 잠기면([A7](../../../planning/decisions/algorithm.md#a7), latch) 서버도 계속 `"alarm"`을 보내야 한다 — 신호가 사라졌다고 조용히 `"normal"`로 되돌리면 안 된다.

## 3. 목표 데이터 모델 (Phase 2 — 아직 미구현)

지금 화면(채널 카드·게이지·차트·판단근거·비교)은 `mocks/channels.ts`에 **상태별로 하드코딩된 문구·수치**를 쓰고 있다. 실제 서버 페이로드가 오면 `TelemetrySource.subscribe`가 `AppState` 대신(또는 그와 함께) 아래 `DeviceTelemetry`를 방출하도록 확장해야 한다. 필드는 `types/telemetry.ts`에 이미 타입으로 있다 — 여기서는 각 필드가 **화면 어디에 쓰이는지**와 **지금 상태**를 같이 적는다.

| 필드 | 타입 | 상태 | 화면 사용처 | 비고 |
|---|---|---|---|---|
| `state` | `NodeState` | 있음 | 상태 리본, `LiveBadge`, 경보 화면 진입 | §1의 `AppState`와 동일 개념 |
| `latched` | `boolean` | 있음 | 경보가 계속 유지 중인지 표시(참고용) | A7 — latch 해제 전까지 true. 해제는 앱이 요청만 보내고 승인은 서버가 판단([O8](../../../planning/decisions/open-questions.md#o8), `../../../api-spec.md`의 `alarm/release`) |
| `gas.{sraw,baseline,devZ,slope}` | `GasChannel` | 일부 (내부값 미전송 → [O2](../../../planning/decisions/open-questions.md#o2)) | 배터리 가스 카드·게이지·원본수치 접이식 | PRIMARY 채널, S1 |
| `h2.{mv,mvAvg,rsKohm,slope}` | `HydrogenChannel` | 있음 | 과충전 가스 카드 | S2 |
| `co.{mv,slope}` | `CarbonMonoxideChannel?` | 미착수(센서 미도입) | 타는 가스 카드 | S3, 확증 전용 |
| `env.{tempC,rh,dRhDt}` | `EnvChannel?` | 미착수 | 배터리 온도 카드, 습도 게이트 | S4 |
| `pressure.{presDev,presRate}` | `PressureChannel?` | 미착수 | 부풀어 오름 카드 | S6/[O9](../../../planning/decisions/open-questions.md#o9) — 킥보드에선 거의 안 움직이는 게 정상 |
| `water` | `boolean?` | 계획 | 물·누액 카드 | S5, 확증 보너스 |
| `signature.{rise,hold,noRecover,holdS}` | `SignatureFlags?` | 전송 X → O2 | 항목 상세 "판단 근거 3요소" | A4 |
| `module.{nodeId,seq,battMv,rssi,lastSeen}` | `ModuleStatus` | 있음 | 모듈 상태 표 | LoRa 14B 페이로드 |
| `location` | `{lat,lon}` | GPS로 확정([O1](../../../planning/decisions/open-questions.md#o1)) — 실 전송은 임베디드 포맷 확정 후 | 실시간 화면 지도 | 지금은 폰 GPS로 대체 중(`DeviceMap.tsx`) — 서버 좌표 연동 코드 전환 필요 |

### 3.1 문구는 누가 만드나 — 미해결 설계 이슈

지금 `mocks/channels.ts`의 `STATE_CONTENT`에는 `"평소보다 8배 빠르게 늘고 있습니다"` 같은 **완성된 한국어 문구**가 상태별로 하드코딩돼 있다. [C5](../../../planning/decisions/collaboration.md#c5) 원칙("상태 → 문구·권장 조치 매핑은 서버 책임 — 앱에 박으면 수정할 때마다 스토어 심사")을 그대로 따르면, Phase 2에서는 이 문구 자체를 서버가 내려줘야 한다. 즉 `DeviceTelemetry`에 `raw`/`devZ`/`slope` 같은 숫자만이 아니라 **`copy: { msg, sub, pillT, pillV, easy, sigHint, cmp, cta }`류의 표시용 문구 필드**를 포함시킬지를 서버 설계 시 같이 정해야 한다. 안 정하면 문구 로직이 다시 앱에 박히게 된다.

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
| [O5](../../../planning/decisions/open-questions.md#o5) | 탭 3개 vs 4개(+통계) | **최종적으로 탭바 자체를 없앴다**(하단 탭 4개 → 메인 화면 하나) — 기록은 아코디언, 통계는 메인·상세보기의 "기간 조회"(지금/오늘/최근 7일/기간선택)로 흡수됨. 설정은 헤더 햄버거로 여는 오버레이 | `telemetry/history`(하루)만으론 부족해서 `telemetry/period-summary`(여러 날 집계) API가 새로 필요해짐 — `../../api-spec.md` 참고 |

> [O9](../../../planning/decisions/open-questions.md#o9)(압력 채널 센서 종류)는 이 표에서 뺐다 — 어떤 센서를 쓰든 앱은 정규화된 `pressure` 값만 받으므로 인터페이스에 영향이 없다(임베디드 하드웨어 결정일 뿐). `pressure` 필드 자체는 여전히 "미착수" 상태([§3](#3-목표-데이터-모델-phase-2--아직-미구현) 표 참고) — 센서가 뭐든 상관없이 임베디드 쪽 구현이 끝나야 채워진다.

**확정된 것**

| # | 결정 | 앱에 미치는 영향 |
|---|---|---|
| [O1](../../../planning/decisions/open-questions.md#o1) | 위치 소스 = **GPS로 확정**(임베디드 모듈이 직접 측정) | `DeviceTelemetry.location`에 실좌표가 채워져서 온다. 앱은 그대로 표시만 하면 됨 — 지금 `DeviceMap.tsx`의 폰 GPS 추종은 이 결정 전 임시방편이라 controlled `camera`(서버 좌표 기반)로 코드 전환 필요 |
| [O2](../../../planning/decisions/open-questions.md#o2) | 노드가 판단 근거를 전송할지 = **서버가 계산해서 제공**(노드가 아니라 서버가 raw로부터 계산) | `signature` 필드가 응답에 항상 채워져서 온다 — "전송 안 될 수도 있음"을 전제로 화면을 짤 필요 없음 |
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

이 문서는 draft다. 서버 API가 실제로 정해지면:
1. `types/telemetry.ts`를 확정된 페이로드에 맞게 갱신
2. `services/telemetrySource.ts`에 HTTP 폴링 구현체(`../../api-spec.md`의 "현재 상태 조회" 메서드) 추가, `noTelemetrySource`는 개발/오프라인 폴백으로만 남김
3. `services/deviceRegistry.ts`에 실제 HTTP 구현체 추가, `localOnlyDeviceRegistry`는 폴백으로만 남김
4. 이 문서의 표를 "미착수/계획" → "있음"으로 갱신
5. `mocks/channels.ts`의 하드코딩 문구를 §3.1 결정에 따라 서버 응답 매핑으로 교체
