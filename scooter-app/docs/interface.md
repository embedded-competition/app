# 앱 ↔ 서버 인터페이스 명세

**상태: Draft.** 원 소스는 [`planning` 레포](../../../planning)의 `decisions.md` §7(데이터 인벤토리)·`decisions/open-questions.md`다. 이 문서는 그걸 **앱 코드가 실제로 기대하는 계약** 관점으로 정리한 것 — 서버·임베디드 팀이 이 문서를 보고 구현하면 된다. 값이 바뀌면 여기와 `types/telemetry.ts`·`services/telemetrySource.ts`를 같이 고칠 것.

실제 엔드포인트 형태(URL·메서드·요청/응답 스키마)는 [`../../api-spec.md`](../../api-spec.md)(레포 최상위)에 따로 있다.

> **⚠️ 2026-08-12: 백엔드가 다시 한번 통째로 바뀌었다.** `api-spec.md`는 그 이전 버전(엔드포인트가 `/devices/{deviceId}/...`, 상태값이 `AlertState` 5개짜리 문자열 하나였던 시절) 기준으로 쓰여서 **지금은 상당 부분 안 맞는다** — 아직 새 스펙에 맞춰 다시 쓰지 않았다(코드 반영은 나중에 하기로 함, 지금은 문서만 최신화). 아래 §2·§3·§6은 `https://api.agenthub.work/openapi.json`을 직접 받아서 확인한 **2026-08-12 시점 실제 스펙** 기준으로 갱신했다 — `api-spec.md`를 볼 때는 이 문서 쪽 최신 내용을 우선하고, `api-spec.md`는 엔드포인트 URL·요청 예시 형태를 참고하는 용도로만 걸러서 볼 것.

## 0. 왜 이 문서가 필요한가

[C4](../../../planning/decisions/collaboration.md#c4)에 따르면 임베디드 전송 포맷이 앱 화면 필드·서버 스키마보다 먼저 정해져야 한다. 반대로 앱이 화면에 뭘 필요로 하는지가 먼저 드러나야 그 논의가 시작된다 — 이 문서가 그 "앱이 뭘 필요로 하는가" 쪽이다.

## 1. 아키텍처 경계

```
임베디드 노드 → 서버(정규화·판정 보조·저장) → [TelemetrySource 구현체] → useAppState → 화면
```

앱은 `services/telemetrySource.ts`의 `TelemetrySource` 인터페이스 하나만 알면 된다. 실제 통신 방식은 **HTTP 요청 폴링으로 확정**했다(WebSocket·SSE 같은 연결 유지형 프로토콜은 안 씀 — [`../../api-spec.md`](../../api-spec.md)의 "① 조회" 패턴 참고) — 그 구현체 안에서만 처리하면 화면 코드는 손댈 필요가 없다.

**실제 백엔드는 있다(Orca Backend, `../../api-spec.md` 참고) — 다만 앱이 아직 거기 안 붙었다.** `services/telemetrySource.ts`는 여전히 `noTelemetrySource`(아무 것도 방출하지 않음)가 기본값이고, `DevStateToggle`이 화면 상단에서 로컬로만 상태를 채워 넣는다. `LiveBadge`가 `isLive=false`일 때 "목데이터"라고 정직하게 표시하는 것도 이 때문이다. 실제 HTTP 폴링 구현체를 붙이는 건 아직 안 한 일이다(§7).

## 2. 지금 구현된 최소 계약 (Phase 1) — 클라이언트 코드 기준, 실제 서버와는 이미 어긋남

```ts
type AppState = "NORMAL" | "WATCH" | "ALARM" | "FAULT";

interface TelemetrySource {
  /** 서버가 상태를 보낼 때마다 호출. 구독 해제 함수를 반환한다. */
  subscribe(onState: (state: AppState) => void): () => void;
}
```

지금 `contexts/AppStateContext.tsx`·`mocks/channels.ts`가 실제로 이 타입을 쓴다 — 아직 코드는 안 고쳤다. 하지만 **2026-08-12 시점 실제 서버는 이런 단일 문자열 상태를 안 준다.** 대신 아래 4개 필드로 쪼개져서 온다(`GET /v1/devices/{mac}/telemetry/current` 응답, `DeviceCurrentResponse`):

| 필드 | 타입 | 의미 |
|---|---|---|
| `status` | `"STABLE"` \| `"SERVICE_NEEDED"` \| `"REPORT"` \| `null` | 사용자가 지금 뭘 해야 하는가 — 스펙 설명에 "화면 게이지의 세 지점과 1:1"이라고 명시돼 있음. 관측 없거나 예열 중이면 `null` |
| `stage` | `"NONE"` \| `"TEMP_RISE"` \| `"GAS_LEAK"` \| `"RAPID_WORSENING"` \| `"IGNITION"` \| `null` | 화재로 가는 진행 단계(5개, 나열 순서=진행 순서) — `StatusRibbon`의 "5단 스테퍼"와 값 개수가 일치. 판정 규칙이 아직 없으면 `null`(`NONE`="이상 없음"과 다름) |
| `conditions` | `("CO_RISE"\|"H2_RISE"\|"VOC_RISE"\|"PRESSURE_RISE"\|"WATER"\|"SENSOR_FAULT"\|"UNKNOWN")[]` | 지금 동시에 일어나는 현상들(배열, 복수 가능) — 기존 `signature{rise,hold,noRecover}` 자리를 대신하는 개념으로 보이지만 모양이 다름 |
| `latched` | `boolean` | ALARM 유지 여부, 기본 `false` — 자동 해제 없음([A7](../../../planning/decisions/algorithm.md#a7)) |
| `water` | `boolean` | 침수·누액 감지, 기본 `false` — 이제 채널이 아니라 최상위 불리언 |

**아직 코드에 반영 안 했다.** `AppState`(단일 문자열) → `status`/`stage`/`conditions`/`latched`/`water`(5개 필드 조합)로 마이그레이션하는 건 `mocks/channels.ts`·`AppStateContext`·`STATE_CONTENT`(현재 상태별 리본/게이지/차트/판단근거 문구를 전부 `NORMAL`/`WATCH`/`ALARM`/`FAULT` 4키로 색인) 구조를 다시 설계해야 하는 작업이라 별도로 진행하기로 함.

- `subscribe`가 처음 호출된 시점에는 아직 값이 없을 수 있다(연결 전) — 그 동안 앱은 `remoteState === null`로 보고 `isLive=false`를 유지한다.
- `latched`가 `true`인 동안은 서버도 계속 `true`를 보내야 한다 — 신호가 사라졌다고 조용히 `false`로 되돌리면 안 된다([A7](../../../planning/decisions/algorithm.md#a7)).

## 3. 목표 데이터 모델 (Phase 2 — 아직 미구현)

지금 화면(채널 카드·게이지·차트·판단근거·비교)은 `mocks/channels.ts`에 **상태별로 하드코딩된 문구·수치**를 쓰고 있다. 아래는 **우리 화면이 실제로 쓰고 있는 데이터**를 기준으로, 2026-08-12 시점 실제 서버(`GET /v1/devices/{mac}/telemetry/current`, `DeviceCurrentResponse`)에 대응 값이 있는지 정리한 것 — 필드는 `types/telemetry.ts`에도 타입으로 있지만 거긴 아직 옛 스펙(raw값 포함) 기준이라 갱신 필요.

| 화면이 쓰는 것 | 실제 서버 값 | 상태 | 화면 사용처 | 비고 |
|---|---|---|---|---|
| `state`(NORMAL/WATCH/ALARM) | `status`+`stage`+`conditions` 조합 | **필드 자체가 없어짐** — §2 참고 | 상태 리본, `LiveBadge`, 경보 화면 진입 | 매핑 규칙(예: `stage==="IGNITION"` → 화면 `ALARM`)을 새로 정해야 함 — 아직 안 정함 |
| `latched` | `latched`(boolean) | 있음, 이름·의미 동일 | 경보가 계속 유지 중인지 표시(참고용) | A7. 해제는 앱이 요청만 보내고 승인은 서버가 판단([O8](../../../planning/decisions/open-questions.md#o8)) — `POST /v1/devices/{mac}/alarm/release`는 그대로 있음 |
| `gas.{devZ,slope}` | `gas.{value,slope}` | 있음, **필드명 `devZ`→`value`로 변경**. raw값(`sraw`/`baseline`)은 여전히 안 옴 | 배터리 가스 카드·게이지 | PRIMARY 채널, S1. `value` 설명: "기준선 대비 상대 편차, 평소와 같으면 0" — `devZ`와 같은 개념 |
| `h2.{devZ,slope}` | `h2.{value,slope}` | 있음, 마찬가지로 `value`로 개명. `gas`와 완전히 같은 모양(`ChannelResponse`) | 과충전 가스 카드 | S2 |
| `co.{devZ,slope}` | `co.{value,slope}` | 있음, 마찬가지로 `value`로 개명 | 타는 가스 카드 | S3, 확증 전용 |
| `env.{tempC,rh,dRhDt}` | **`telemetry/current`엔 없음** — `temp`/`rh`는 `Sensor` enum에만 있고 `sensors/{sensor}/detail`(기간 차트)에서만 조회 가능 | 실시간 값 없음 | 배터리 온도 카드, 습도 게이트 | S4. 실시간 카드에 쓸 값이 아직 없다 — 온습도는 기간 조회로만 확인 가능하다는 뜻인지 확인 필요 |
| `pressure.{presDev,presRate}` | `pressure.{value,slope}` | 있음, `gas`/`h2`/`co`와 동일한 `ChannelResponse` 모양으로 통일됨(예전엔 `presRate`가 기간 조회에서 빠지는 비대칭이 있었는데 이번 개편으로 없어진 듯) | 부풀어 오름 카드 | S6/[O9](../../../planning/decisions/open-questions.md#o9) |
| `water` | `water`(boolean, 최상위) | 있음 — nullable 아니고 기본 `false` | 물·누액 카드 | S5, 확증 보너스. 이제 채널 객체가 아니라 단순 불리언이라 카드 표시 로직 조정 필요 |
| `signature.{rise,hold,noRecover,holdS}` | `conditions[]`(배열) | **모양이 완전히 다름** — 3개 불리언+지속시간 조합이 아니라 enum 배열 | 항목 상세 "판단 근거 3요소" | A4. `conditions`로 "판단 근거 3요소" UI를 어떻게 다시 표현할지 설계 필요(예: `CO_RISE`가 있으면 "갑자기 늘었나"에 해당한다고 볼 수 있는지 등 1:1 대응이 명확치 않음) |
| `module.{nodeId,seq,battMv,rssi,snr,lastSeen}` | **엔드포인트 자체가 없어짐** | 사라짐 | 설정 패널 "감지 모듈 배터리·연결 상태·센서 점검" | 2026-08-12 개편 전엔 `telemetry/latest.module`로 왔는데 새 스펙 어디에도 없다 — 배터리·RSSI·SNR·마지막 수신 시각을 보여줄 실데이터가 없어짐. 화면에서 이 섹션을 어떻게 할지(숨김/자리만 유지) 결정 필요 |
| (fleet 비교, `CompareRow.tsx`) | **엔드포인트 자체가 없어짐** | 사라짐 | 항목 상세 "같은 모델과 비교" | 예전 스펙엔 `GET /devices/{deviceId}/fleet-comparison`이 있었는데 새 스펙 8개 엔드포인트 중엔 없다 |
| `location` | `GET /v1/devices/{mac}/location` (별도 엔드포인트) | 있음, 단 **`telemetry/current` 응답에서 빠지고 전용 엔드포인트로 분리됨** — `{lat, lon, at}` | 실시간 화면 지도 | O1 확정대로 GPS. 지금은 폰 GPS로 대체 중(`DeviceMap.tsx`) — 연동 시 이 엔드포인트를 별도로 폴링해야 함(telemetry 폴링에 얹혀오지 않음) |

**새로 생겨서 화면에 아직 안 쓰는 것**: `GET /v1/devices/{mac}/telemetry/peaks`(기간 중 최고치 요약), `GET /v1/devices/{mac}/sensors/{sensor}/detail`(채널별 기간·눈금 차트, `interval`=5m~1d) — 둘 다 [`../../backend-requests.md`](../../backend-requests.md) 1.1에서 요청했던 "기간 범위 조회"가 정확히 반영된 것으로 보임. 메인·상세보기의 "오늘/최근 7일/기간선택" 목데이터(`mocks/period.ts`)를 이 엔드포인트로 교체할 수 있어 보인다.

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

**2026-08-12 실제 스펙(`GET /v1/devices/{mac}/events`) 기준**: `since`뿐 아니라 `until`도 이제 필수 쿼리 파라미터다(예전엔 `since`만 있어서 끝을 못 잘랐는데, [`../../backend-requests.md`](../../backend-requests.md) 1.2에서 요청했던 게 반영된 것으로 보임). 응답은 `{items: EventResponse[], truncated: boolean}` — `truncated`가 `true`면 이 범위에 더 있는데 이번 응답엔 안 담겼다는 뜻(페이지네이션 없음, 잘랐다는 신호만 줌) — 지금 `RecordAccordion` 목데이터는 이 값을 안 쓰고 있어서 실 연동 시 "더 있음" 표시를 추가할지 검토 필요.

## 5. 열린 질문이 인터페이스에 미치는 영향

| # | 질문 | 지금 앱이 임시로 하는 것 | Phase 2에서 바뀔 것 |
|---|---|---|---|
| [O5](../../../planning/decisions/open-questions.md#o5) | 탭 3개 vs 4개(+통계) | **최종적으로 탭바 자체를 없앴다**(하단 탭 4개 → 메인 화면 하나) — 기록은 아코디언, 통계는 메인·상세보기의 "기간 조회"(지금/오늘/최근 7일/기간선택)로 흡수됨. 설정은 헤더 햄버거로 여는 오버레이 | ~~`telemetry/history`는 하루 단위만 되고 범위 조회가 없어서 안 됨~~ → **2026-08-12 개편으로 해결됨**: `GET /sensors/{sensor}/detail?from=&to=&interval=`, `GET /telemetry/peaks?from=&to=`가 신설돼서 "최근 7일"류를 실제 범위 조회로 구현할 수 있어 보인다(§3 맨 아래 참고) — 아직 `mocks/period.ts`를 이걸로 교체하는 작업은 안 함 |

> [O9](../../../planning/decisions/open-questions.md#o9)(압력 채널 센서 종류)는 이 표에서 뺐다 — 어떤 센서를 쓰든 앱은 정규화된 `pressure` 값만 받으므로 인터페이스에 영향이 없다(임베디드 하드웨어 결정일 뿐). `pressure` 필드 자체는 여전히 "미착수" 상태([§3](#3-목표-데이터-모델-phase-2--아직-미구현) 표 참고) — 센서가 뭐든 상관없이 임베디드 쪽 구현이 끝나야 채워진다.

**확정된 것**

| # | 결정 | 앱에 미치는 영향 |
|---|---|---|
| [O1](../../../planning/decisions/open-questions.md#o1) | 위치 소스 = **GPS로 확정**(임베디드 모듈이 직접 측정) | `DeviceTelemetry.location`에 실좌표가 채워져서 온다. 앱은 그대로 표시만 하면 됨 — 지금 `DeviceMap.tsx`의 폰 GPS 추종은 이 결정 전 임시방편이라 controlled `camera`(서버 좌표 기반)로 코드 전환 필요 |
| [O2](../../../planning/decisions/open-questions.md#o2) | 노드가 판단 근거를 전송할지 = **서버가 계산해서 제공**(노드가 아니라 서버가 raw로부터 계산) | `signature` 필드로 온다 — 단 **nullable이라 항상 채워지는 건 아님**([§3](#3-목표-데이터-모델-phase-2--아직-미구현) 참고), 화면은 null 가능성을 방어적으로 처리해야 함 |
| [O4](../../../planning/decisions/open-questions.md#o4) | 기기 관리 = **단일 기기로 확정**(1계정=1기기) | `DeviceContext`의 맥주소 1개 전제가 그대로 최종 모델. 다중 기기 대응 코드 안 짜도 됨 |
| [O8](../../../planning/decisions/open-questions.md#o8) | 경보 해제 권한 = **앱은 요청만, 승인은 서버가 내부 규칙으로 판단** | `alarm.tsx`에 "경보 해제 요청" 버튼 완료 — `services/alarmRelease.ts`로 요청 전송, 서버 없어서 항상 실패 응답 |

## 6. 기기 등록 (페어링)

텔레메트리를 받으려면 그 전에 **어떤 킥보드인지**부터 정해져야 한다. 사용자가 점검장비(MCU) 라벨의 MAC 주소를 앱에 입력한다 — 입력 전에는 앱이 아예 메인 화면을 안 띄우고 등록 화면만 보여준다(`app/_layout.tsx`).

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

> **⚠️ 2026-08-12: 이 인터페이스 전제가 실제 서버와 안 맞는다.** 위 `DeviceRegistry.register()`는 "서버에 등록 요청을 보내서 `deviceId`/`deviceToken`을 발급받는다"는 전제로 설계됐는데, **실제 스펙엔 등록 엔드포인트(`POST /devices` 같은 것)가 아예 없다.** 모든 엔드포인트가 `Authorization` 헤더 없이(`securitySchemes: {}`, 전역 `security: null`) URL 경로에 맥주소를 그대로 넣어서(`/v1/devices/{mac}/...`) 바로 조회하는 구조다. 즉:
> - 서버 쪽에 "이 폰이 이 기기에 접근해도 되는지" 같은 등록·인증 개념 자체가 없다 — 맥주소만 알면 누구든 그 기기 데이터를 조회할 수 있는 구조로 보인다.
> - `deviceToken`/`Authorization: Bearer` 발급이라는 개념도 없다.
> - `managementPhone`(관리실 전화번호)을 서버가 등록 응답으로 내려준다는 것도 대응되는 필드가 안 보인다 — 이 값을 어디서 받을지 다시 정해야 한다.
>
> 결론적으로 **지금 `localOnlyDeviceRegistry`가 "서버 없어서 임시로 로컬에만 저장하는 스텁"이라고 문서화해뒀던 게, 사실은 최종 아키텍처와 크게 다르지 않을 가능성이 있다** — "등록"은 서버 왕복이 필요한 절차가 아니라 그냥 **이 폰이 어떤 킥보드의 맥주소를 조회할지 로컬에서 고르는 것**일 수 있다. 다만 이러면 `managementPhone`을 어디서 받는지, 다른 사람이 맥주소만 알면 남의 킥보드 데이터를 볼 수 있는 게 의도인지는 서버팀 확인이 필요한 부분 — 아직 [`../../backend-requests.md`](../../backend-requests.md)에 안 올렸음(코드 반영을 나중으로 미루기로 해서, 질문도 그때 같이 정리하기로 함).

- MAC 하나 = 킥보드 한 대, **[O4](../../../planning/decisions/open-questions.md#o4) 확정**: 다중 기기 지원 없이 이대로 최종 모델로 간다. (관리실 다중 관리 같은 시나리오가 나중에 필요해지면 계정↔기기 다대다 관계·로그인 시스템을 다시 설계해야 하지만, 지금은 범위 밖으로 명시적으로 뺐다.)
- 개발 모드(`__DEV__`)에서는 `"0000"`을 입력하면 실제 MAC 검증 없이 고정 값(`00:00:00:00:00:00`)으로 즉시 등록되고 미리보기 화면으로 들어간다. 프로덕션 빌드에서는 이 분기가 번들에서 아예 빠진다 — 배포판에 우회 코드가 남을 걱정은 안 해도 된다.

## 7. 변경 관리

이 문서는 draft다. **서버 API 자체는 이제 실제로 있다**(Orca Backend) — 다만 2026-08-12 기준 두 번째 큰 개편을 겪어서, 코드 반영은 스펙이 조금 더 안정될 때까지 미루고 문서만 최신 상태로 맞춰두기로 했다. 코드 반영 시 할 일:
1. `types/telemetry.ts`를 실제 스펙에 맞게 전면 재작성 — raw 필드(`sraw`/`mv` 등) 제거는 물론, `devZ`→`value` 개명, `AlertState` 단일 문자열 → `status`/`stage`/`conditions`/`latched`/`water` 구조로 통째로 바뀜(§2·§3)
2. `contexts/AppStateContext.tsx`·`mocks/channels.ts`의 `AppState`(`NORMAL`/`WATCH`/`ALARM`/`FAULT` 4키 인덱싱 구조)를 새 5필드 모델에 맞게 재설계 — `status`(3)/`stage`(5)를 기존 게이지·스테퍼 UI에 매핑하는 규칙부터 정해야 함
3. `services/telemetrySource.ts`에 HTTP 폴링 구현체(`GET /v1/devices/{mac}/telemetry/current` 반복 호출) 추가, `noTelemetrySource`는 개발/오프라인 폴백으로만 남김
4. `services/deviceRegistry.ts` — **등록 엔드포인트가 없다는 걸 확인했으니(§6), HTTP 구현체를 새로 만드는 게 아니라 오히려 지금의 `localOnlyDeviceRegistry`(로컬 저장)가 최종 형태에 가까울 수 있다** — `managementPhone`을 어디서 받을지만 서버팀에 확인 후 결정
5. `services/alarmRelease.ts`에 실제 HTTP 구현체(`POST /v1/devices/{mac}/alarm/release`, body `{note?}` → `{released}`) 추가
6. `components/settings/SettingsPanel.tsx`의 모듈 상태 행, `components/detail/CompareRow.tsx` — 대응 엔드포인트가 없어졌으니 화면에서 어떻게 할지(숨김/자리만 유지/서버팀에 부활 요청) 결정
7. 이 문서·`mocks/channels.ts`의 하드코딩 문구를 §3.1 결정(문구를 서버가 줄지 앱이 만들지 — `conditions` 배열 기반으로는 더더욱 앱이 만들어야 할 가능성이 커짐)에 따라 갱신
8. `mocks/period.ts`를 `GET /sensors/{sensor}/detail`·`GET /telemetry/peaks`로 교체(§3 맨 아래) — "최근 7일"류 기간 조회가 이제 실제로 가능해 보임
9. `api-spec.md`를 2026-08-12 스펙 기준으로 전면 재작성(엔드포인트 URL·요청 예시가 전부 구버전이라 지금은 이 문서 쪽을 우선해야 함)
