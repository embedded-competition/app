# 앱 ↔ 서버 인터페이스 명세

**상태: Draft.** 원 소스는 [`planning` 레포](../../../planning)의 `decisions.md` §7(데이터 인벤토리)·`decisions/open-questions.md`다. 이 문서는 그걸 **앱 코드가 실제로 기대하는 계약** 관점으로 정리한 것 — 서버·임베디드 팀이 이 문서를 보고 구현하면 된다. 값이 바뀌면 여기와 `types/telemetry.ts`·`services/telemetrySource.ts`를 같이 고칠 것.

## 0. 왜 이 문서가 필요한가

[C4](../../../planning/decisions/collaboration.md#c4)에 따르면 임베디드 전송 포맷이 앱 화면 필드·서버 스키마보다 먼저 정해져야 한다. 반대로 앱이 화면에 뭘 필요로 하는지가 먼저 드러나야 그 논의가 시작된다 — 이 문서가 그 "앱이 뭘 필요로 하는가" 쪽이다.

## 1. 아키텍처 경계

```
임베디드 노드 → 서버(정규화·판정 보조·저장) → [TelemetrySource 구현체] → useAppState → 화면
```

앱은 `services/telemetrySource.ts`의 `TelemetrySource` 인터페이스 하나만 알면 된다. 서버가 REST 폴링이든 WebSocket이든 SSE든, 그 구현체 안에서만 처리하면 화면 코드는 손댈 필요가 없다.

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
| `state` | `NodeState` | 있음 | 상태 리본, 탭바 배지, 경보 화면 진입 | §1의 `AppState`와 동일 개념 |
| `latched` | `boolean` | 있음 | 경보 해제 버튼 활성화 여부 | A7 — latch 해제 전까지 true |
| `gas.{sraw,baseline,devZ,slope}` | `GasChannel` | 일부 (내부값 미전송 → [O2](../../../planning/decisions/open-questions.md#o2)) | 배터리 가스 카드·게이지·원본수치 접이식 | PRIMARY 채널, S1 |
| `h2.{mv,mvAvg,rsKohm,slope}` | `HydrogenChannel` | 있음 | 과충전 가스 카드 | S2 |
| `co.{mv,slope}` | `CarbonMonoxideChannel?` | 미착수(센서 미도입) | 타는 가스 카드 | S3, 확증 전용 |
| `env.{tempC,rh,dRhDt}` | `EnvChannel?` | 미착수 | 배터리 온도 카드, 습도 게이트 | S4 |
| `pressure.{presDev,presRate}` | `PressureChannel?` | 미착수 | 부풀어 오름 카드 | S6/[O9](../../../planning/decisions/open-questions.md#o9) — 킥보드에선 거의 안 움직이는 게 정상 |
| `water` | `boolean?` | 계획 | 물·누액 카드 | S5, 확증 보너스 |
| `signature.{rise,hold,noRecover,holdS}` | `SignatureFlags?` | 전송 X → O2 | 항목 상세 "판단 근거 3요소" | A4 |
| `module.{nodeId,seq,battMv,rssi,lastSeen}` | `ModuleStatus` | 있음 | 모듈 상태 표 | LoRa 14B 페이로드 |
| `location` | `{lat,lon}\|{label}` | 없음 → [O1](../../../planning/decisions/open-questions.md#o1) | 실시간 화면 지도 | 지금은 폰 GPS로 대체(`DeviceMap.tsx` 참고) |

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
| [O1](../../../planning/decisions/open-questions.md#o1) | 위치 소스 (GPS/등록위치/게이트웨이) | 폰 자체 GPS로 카메라 추적 | `DeviceTelemetry.location` 기반 controlled `camera`로 교체 |
| [O2](../../../planning/decisions/open-questions.md#o2) | 노드가 판단 근거(dev·slope·시그니처)를 전송할지 | 상태별 목데이터로 채움 | 전송 확정 시 `signature` 필드 실값 연결 |
| [O5](../../../planning/decisions/open-questions.md#o5) | 탭 3개 vs 4개(+통계) | 4탭 유지, `stats.tsx`는 안내만 | 확정되면 탭 구조·집계 API 필요 여부 결정 |
| [O8](../../../planning/decisions/open-questions.md#o8) | 경보 해제 권한/경로 | 해제 버튼 비활성 | `ack` downlink API 필요 (서버 → LoRa) |
| [O9](../../../planning/decisions/open-questions.md#o9) | 압력 채널 센서 종류 | `pressure` 필드 목데이터로만 존재 | 센서 확정 후 실측 연동 |

## 6. 변경 관리

이 문서는 draft다. 서버 API가 실제로 정해지면:
1. `types/telemetry.ts`를 확정된 페이로드에 맞게 갱신
2. `services/telemetrySource.ts`에 실제 구현체(REST/WebSocket) 추가, `noTelemetrySource`는 개발/오프라인 폴백으로만 남김
3. 이 문서의 표를 "미착수/계획" → "있음"으로 갱신
4. `mocks/channels.ts`의 하드코딩 문구를 §3.1 결정에 따라 서버 응답 매핑으로 교체
