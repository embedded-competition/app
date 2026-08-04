# 서버 백엔드 API 명세 (Draft)

**상태: 제안(Draft) — 서버 레포도 서버 팀도 아직 없다.** 이 문서는 앱이 실제로 필요로 하는 것([`scooter-app/docs/interface.md`](scooter-app/docs/interface.md))과 임베디드 페이로드·서버 책임에 대한 기존 결정([`planning`](planning) 레포)을 근거로 **먼저 던지는 초안**이다. 서버 팀이 생기면 이 문서를 시작점으로 논의하고 결정된 내용으로 다시 쓸 것 — 최종 스펙이 아니라 협의용 제안이다.

## 0. 왜 이런 모양인가

- [C4](planning/decisions/collaboration.md#c4): 임베디드 전송 포맷 → 앱 필드 → 서버 스키마 순으로 정해져야 하는데, 임베디드 포맷이 아직 확정 전이다. 그래서 이 문서의 수집(ingest) 엔드포인트는 **지금 알려진 LoRa 14B 페이로드 필드**를 기준으로 잡고, 확정되면 갱신한다.
- [C5](planning/decisions/collaboration.md#c5): 서버 책임 = **raw 수신 → 정규화 → 저장 → 클라 서빙**. 노드는 상태 전이(`NORMAL`/`WATCH`/`ALARM`/`FAULT`)만 판정해서 보내고, 이벤트 서술·문구·fleet 집계·조치 로그는 전부 서버가 만든다. 이 원칙이 아래 엔드포인트 구성의 뼈대다.
- [A1](planning/decisions/algorithm.md#a1): 절대 임계값 금지, 상대값(z-score)·변화율만 쓴다 — 서버가 저장·서빙하는 값도 이 원칙을 따른다(raw와 정규화값을 분리 저장해서 나중에 임계값이 바뀌어도 과거 데이터를 재해석할 수 있게).
- [`scooter-app/docs/interface.md`](scooter-app/docs/interface.md)가 앱이 기대하는 필드·화면 사용처를 정리해뒀다 — 이 문서의 응답 스키마는 그것과 1:1로 맞춘다. 둘이 어긋나면 버그다.

## 1. 아키텍처

```
임베디드 노드 --(LoRa 920.9MHz)--> 게이트웨이 --(?)--> 서버 --(?)--> 앱
                                                   └─ 정규화 · 판정보조(단계 추정) · 저장 · fleet 집계
```

- 게이트웨이 없는 환경 대비 LTE-M fallback 또는 홈 wifi 브리지 경로가 있다([제품·범위 알림·대응 흐름](planning/decisions/product-scope.md#알림대응-흐름)) — 수집 엔드포인트는 게이트웨이든 브리지든 같은 스키마로 받는다는 전제.
- 서버 → 앱 구간은 REST 폴링 / WebSocket / SSE 중 미정이다 → [§7 열린 질문](#7-열린-질문) 참고. 이 문서는 **SSE(Server-Sent Events)를 1순위로 제안**한다 — 서버→앱 단방향 푸시만 있으면 되고, WebSocket보다 구현·인프라가 단순하다(§5.3).

## 2. 인증·계정 모델 — 통째로 미정

로그인/계정 시스템 자체가 아직 없다. 이 문서의 모든 엔드포인트는 잠정적으로 `Authorization: Bearer <token>` 헤더를 가정하지만, 토큰 발급 방식(이메일/소셜 로그인? 익명 기기 토큰?)은 정해진 바 없다. [O4](planning/decisions/open-questions.md#o4)(1대 vs 다중 기기)와 맞물리는 지점이라 계정 모델을 먼저 정해야 나머지가 확정된다.

## 3. 리소스 모델

| 리소스 | 설명 | 생성 주체 |
|---|---|---|
| `Device` | 등록된 킥보드 하나 (MAC 기준) | 앱이 페어링 요청 → 서버가 생성 |
| `TelemetrySample` | 한 시점의 정규화된 센서 스냅샷 | 서버 (노드 raw 페이로드를 정규화) |
| `Event` | 상태 전이·오경보 차단·조치 기록 | 서버 |
| `Action` | 플러그 차단·통보 등 자동 조치 실행 로그 | 서버 |

## 4. 엔드포인트

### 4.1 기기 등록 (페어링)

앱 쪽 계약은 [`scooter-app/services/deviceRegistry.ts`](scooter-app/services/deviceRegistry.ts)의 `DeviceRegistry.register()`와 1:1 대응.

```
POST /v1/devices
Authorization: Bearer <token>

{ "mac": "AA:BB:CC:DD:EE:FF" }

→ 201
{ "deviceId": "dev_01h...", "mac": "AA:BB:CC:DD:EE:FF", "createdAt": "2026-08-05T00:00:00Z" }

→ 409 이미 다른 계정에 등록된 MAC
{ "error": "already_paired" }

→ 400 형식 오류
{ "error": "invalid_mac" }
```

`deviceId`는 이후 모든 요청에서 MAC 대신 쓴다 — MAC이 URL에 계속 노출되지 않게.

### 4.2 텔레메트리 수집 (임베디드/게이트웨이 → 서버)

앱이 아니라 게이트웨이(또는 LTE-M 브리지)가 호출하는 별도 엔드포인트. 인증 방식도 앱 사용자 토큰과 다르다(기기/게이트웨이 단위 API 키 — 미정).

```
POST /v1/ingest/telemetry
X-Gateway-Key: <api key, 미정>

{
  "nodeId": "0x0A31",
  "seq": 1042,
  "state": "NORMAL",           // NORMAL | WATCH | ALARM | FAULT — 노드가 이미 판정
  "gas": { "sraw": 26412, "devZ": 0.4, "slope": 0.2 },
  "h2": { "mv": 2234, "slope": 0.1 },
  "battMv": 3980,
  "rssi": -71,
  "ts": "2026-08-05T00:00:00Z"
}

→ 202 Accepted
```

- 필드는 지금 알려진 LoRa 14B 페이로드 기준([`scooter-app/docs/interface.md` §3](scooter-app/docs/interface.md))이라 임베디드 쪽 포맷이 확정되면 이 스키마부터 갱신해야 한다.
- `co`/`env`/`pressure`/`water`/`signature`/`location`은 [O2](planning/decisions/open-questions.md#o2)·[O9](planning/decisions/open-questions.md#o9) 등이 정해지기 전까진 페이로드에 없다 — optional로 받는다.
- WATCH/ALARM 진입 시 전송 주기가 10초→1초로 상향되므로([A8](planning/decisions/algorithm.md#a8)) 이 엔드포인트는 높은 호출 빈도를 버텨야 한다.

### 4.3 텔레메트리 조회 (서버 → 앱)

**최신 상태 (폴백용 REST)**

```
GET /v1/devices/{deviceId}/telemetry/latest
Authorization: Bearer <token>

→ 200
{
  "state": "WATCH",
  "latched": false,
  "gas": { "sraw": 26158, "baseline": 26376, "devZ": 3.1, "slope": 2.4 },
  "h2": { "mv": 2251, "mvAvg": 2249, "rsKohm": 7.6, "slope": 0.1 },
  "signature": null,
  "location": null,
  "module": { "nodeId": "0x0A31", "seq": 1180, "battMv": 3960, "rssi": -74, "lastSeen": "2026-08-05T00:00:10Z" }
}
```

응답 스키마는 [`scooter-app/types/telemetry.ts`](scooter-app/types/telemetry.ts)의 `DeviceTelemetry`와 동일하게 맞춘다.

**실시간 스트림 (제안)**

```
GET /v1/devices/{deviceId}/telemetry/stream   (SSE, Accept: text/event-stream)

event: telemetry
data: {"state":"ALARM","gas":{...},...}
```

앱 쪽은 [`scooter-app/services/telemetrySource.ts`](scooter-app/services/telemetrySource.ts)의 `TelemetrySource.subscribe()` 구현체가 이 스트림을 그대로 받아서 콜백을 호출하면 된다 — 지금 `noTelemetrySource` 자리를 교체하는 지점.

### 4.4 이벤트 (기록 탭)

```
GET /v1/devices/{deviceId}/events?since=2026-08-01T00:00:00Z

→ 200
[
  { "id": "evt_1", "timestamp": "...", "kind": "state_change", "description": "정상 → 주의 전환" },
  { "id": "evt_2", "timestamp": "...", "kind": "suppressed", "description": "습도 급변으로 가스 채널 승격 보류 (오경보 아님)" }
]
```

`kind: "suppressed"`는 [O3](planning/decisions/open-questions.md#o3)(오경보 차단 기록 노출 여부)가 "보여줌"으로 확정될 때만 의미가 있다 — 지금은 필드만 만들어둔다.

### 4.5 같은 모델 비교 (fleet)

```
GET /v1/devices/{deviceId}/fleet-comparison

→ 200
{ "fleetSize": 1284, "fleetAvgLevel": "ok", "myLevel": "watch", "myMultiplier": 8 }
```

### 4.6 자동 조치 로그 + 경보 해제

```
GET /v1/devices/{deviceId}/actions
→ 200
[{ "type": "plug_cut", "status": "done", "ts": "..." }, { "type": "notify", "status": "sent", "ts": "..." }]

POST /v1/devices/{deviceId}/alarm/ack   -- (제안, O8 확정 전까지 비활성)
→ 403 { "error": "not_configured" }
```

[O8](planning/decisions/open-questions.md#o8)(해제 권한: 차주만/관리자만/조건부)이 안 정해졌다 — 앱 쪽(`app/alarm.tsx`)도 이 버튼을 지금 비활성으로 둔 상태다. 권한 모델이 정해지면 이 엔드포인트를 실제로 열고, 서버 → LoRa downlink로 노드에 latch 해제를 내려보내는 경로도 같이 설계해야 한다.

### 4.7 위치 (O1 대기)

```
PUT /v1/devices/{deviceId}/location
{ "label": "서울 성동구 행당동 · 지하주차장 B-14" }   -- 등록 위치 방식일 경우
```

[O1](planning/decisions/open-questions.md#o1)이 GPS/등록위치/게이트웨이 중 뭘로 정해지느냐에 따라 이 엔드포인트의 요청 형태가 통째로 바뀐다 — 지금은 자리만 잡아둔다. 앱은 이 값이 없으면 폰 자체 GPS로 대체 중이다([`scooter-app/components/map/DeviceMap.tsx`](scooter-app/components/map/DeviceMap.tsx)).

## 5. 저장 원칙

[C5](planning/decisions/collaboration.md#c5)에 따라 raw와 정규화값을 **분리 저장**한다 — 벤치 튜닝으로 임계값·정규화 로직이 계속 바뀔 것이므로([A10](planning/decisions/algorithm.md#a10)), 과거 raw 데이터를 나중에 새 로직으로 재해석할 수 있어야 한다. `TelemetrySample`은 최소한 다음을 같이 저장한다:

| 필드 | 용도 |
|---|---|
| raw 페이로드 원본(§4.2 그대로) | 재해석용, 불변 |
| 정규화값(devZ, slope 등) | 지금 로직 기준 계산 결과 |
| 계산에 쓰인 로직 버전 | 나중에 "이 값이 어느 로직으로 나왔는지" 추적 |

## 6. 에러 응답 공통 규칙 (제안)

```
{ "error": "<snake_case 코드>", "message": "<사람이 읽을 설명, 선택>" }
```

HTTP 상태 코드는 표준대로: 400(형식 오류) · 401(인증 없음) · 403(권한 없음) · 404(리소스 없음) · 409(충돌, 예: 이미 등록된 MAC) · 5xx(서버 오류).

## 7. 열린 질문

| # | 질문 | 막는 것 |
|---|---|---|
| — | 계정·인증 방식이 뭔지 (§2) | 모든 엔드포인트의 인증 헤더 실제 구현 |
| — | 서버→앱 실시간 전달 방식 — REST 폴링 / SSE / WebSocket (§4.3) | 앱의 `telemetrySource.ts` 구현체, 서버 인프라(커넥션 유지 방식) |
| [O1](planning/decisions/open-questions.md#o1) | 위치 소스 | §4.7 요청 형태 |
| [O2](planning/decisions/open-questions.md#o2) | 노드가 판단 근거를 전송할지 | §4.2 페이로드에 `signature` 포함 여부, 전송량 |
| [O3](planning/decisions/open-questions.md#o3) | 오경보 차단 기록 노출 여부 | §4.4 `suppressed` 이벤트 실제 생성 여부 |
| [O4](planning/decisions/open-questions.md#o4) | 기기 여러 대 관리 | 계정↔기기 다대다 모델, §4.1 응답 구조 |
| [O8](planning/decisions/open-questions.md#o8) | 경보 해제 권한 | §4.6 `alarm/ack` 활성화, downlink 경로 |
| [O9](planning/decisions/open-questions.md#o9) | 압력 채널 센서 종류 | §4.2 `pressure` 필드 단위·의미 |

## 8. 참고

- 앱이 기대하는 값(화면 사용처 포함): [`scooter-app/docs/interface.md`](scooter-app/docs/interface.md)
- 데이터 인벤토리 원본: [`planning/decisions.md` §7](planning/decisions.md#7-데이터-인벤토리)
- 협업·배포 원칙(C1~C5): [`planning/decisions/collaboration.md`](planning/decisions/collaboration.md)
- 감지 알고리즘(A1~A10): [`planning/decisions/algorithm.md`](planning/decisions/algorithm.md)

## 9. 변경 관리

서버 팀이 정해지면:
1. §2 인증 모델부터 확정 (다른 모든 엔드포인트가 이걸 전제로 함)
2. §4.2 수집 스키마를 임베디드 확정 포맷에 맞게 갱신
3. §4.3 실시간 전달 방식 확정 후 `scooter-app/services/telemetrySource.ts` 구현체 작성
4. 이 문서와 `scooter-app/types/telemetry.ts`·`scooter-app/docs/interface.md`를 같이 갱신 — 셋이 어긋나면 안 됨
