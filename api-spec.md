# 서버 백엔드 API 명세 (Draft)

**상태: 제안(Draft) — 서버 레포도 서버 팀도 아직 없다.** 실제 협의·구현 전에 던지는 시작점이다. 확정되면 이 문서를 그 결과로 다시 쓸 것.

## 0. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 서비스 이름 | 전동킥보드 배터리 화재 조기경보 시스템 — 앱 백엔드 API |
| 주요 기능 | 기기(맥주소) 등록, 임베디드 센서 텔레메트리 수집·정규화·서빙, 상태 전이 이벤트/자동조치 기록, 경보 처리, 같은 모델 비교(fleet 집계) |
| 인증 방식 | 사용자(앱) 요청 = **Bearer JWT 토큰**(`Authorization` 헤더). 게이트웨이(임베디드) 수집 요청 = **API Key**(`X-Gateway-Key` 헤더) — 사용자 인증과 별도 체계. 로그인/계정 시스템 자체가 아직 없어 토큰 발급 방식은 미정 → [§11 열린 질문](#11-열린-질문) |
| Base URL | `https://api.example.com/v1` (제안 — 실제 도메인/인프라 미정) |
| 데이터 포맷 | 모든 요청/응답 `Content-Type: application/json; charset=utf-8` |
| 날짜/시간 포맷 | ISO 8601, UTC (예: `2026-08-05T12:00:00Z`) |

**왜 이런 모양인가** — [C4](planning/decisions/collaboration.md#c4)(임베디드 포맷 확정이 선행돼야 함), [C5](planning/decisions/collaboration.md#c5)(서버 책임 = raw 수신→정규화→저장→클라 서빙, 노드는 상태 판정만), [A1](planning/decisions/algorithm.md#a1)(절대 임계값 금지, 상대값·변화율만)을 근거로 삼았다. 응답 스키마는 [`scooter-app/docs/interface.md`](scooter-app/docs/interface.md)(앱이 실제로 기대하는 값)와 1:1로 맞춘다 — 어긋나면 버그다.

## 1. 아키텍처

```
임베디드 노드 --(LoRa 920.9MHz)--> 게이트웨이 --(?)--> 서버 --(?)--> 앱
                                                   └─ 정규화 · 판정보조(단계 추정) · 저장 · fleet 집계
```

게이트웨이 없는 환경 대비 LTE-M fallback/홈 wifi 브리지 경로가 있다 — 수집 엔드포인트(§3)는 게이트웨이든 브리지든 같은 스키마로 받는다는 전제. 서버→앱 실시간 전달은 SSE를 1순위로 제안한다(§5) — WebSocket보다 구현·인프라가 단순하고 서버→앱 단방향 푸시만 있으면 된다.

## 2. 리소스 모델

| 리소스 | 설명 | 생성 주체 |
|---|---|---|
| `Device` | 등록된 킥보드 하나 (MAC 기준) | 앱이 페어링 요청 → 서버가 생성 |
| `TelemetrySample` | 한 시점의 정규화된 센서 스냅샷 | 서버 (노드 raw 페이로드를 정규화) |
| `Event` | 상태 전이·오경보 차단·조치 기록 | 서버 |
| `Action` | 플러그 차단·통보 등 자동 조치 실행 로그 | 서버 |

## 3. API 목록

| # | API 이름 | Method | Endpoint |
|---|---|---|---|
| 1 | 기기 등록(페어링) | POST | `/devices` |
| 2 | 텔레메트리 수집 | POST | `/ingest/telemetry` |
| 3 | 텔레메트리 최신 조회 | GET | `/devices/{deviceId}/telemetry/latest` |
| 4 | 텔레메트리 실시간 스트림 | GET | `/devices/{deviceId}/telemetry/stream` |
| 5 | 이벤트 목록 조회 | GET | `/devices/{deviceId}/events` |
| 6 | 같은 모델 비교 조회 | GET | `/devices/{deviceId}/fleet-comparison` |
| 7 | 자동 조치 로그 조회 | GET | `/devices/{deviceId}/actions` |
| 8 | 경보 해제 | POST | `/devices/{deviceId}/alarm/ack` |
| 9 | 위치 등록 | PUT | `/devices/{deviceId}/location` |

---

### 1. 기기 등록 (페어링)

사용자가 점검장비(MCU) 라벨의 MAC 주소를 입력하면 계정에 킥보드를 연동한다. 앱 쪽 계약은 [`scooter-app/services/deviceRegistry.ts`](scooter-app/services/deviceRegistry.ts)의 `DeviceRegistry.register()`와 1:1 대응.

| 항목 | 내용 |
|---|---|
| Method / Endpoint | `POST /devices` |
| 설명 | MAC 주소로 킥보드를 현재 계정에 등록한다 |

**Request Header**

| 헤더명 | 필수 여부 | 설명 |
|---|---|---|
| `Authorization` | 필수 | `Bearer <JWT>` |
| `Content-Type` | 필수 | `application/json` |

**Request Body**

| 필드명 | 타입 | 필수 여부 | 설명 | 예시값 |
|---|---|---|---|---|
| `mac` | string | 필수 | 콜론 구분 MAC 주소 (`AA:BB:CC:DD:EE:FF` 형식, 대소문자 무관) | `"AA:BB:CC:DD:EE:FF"` |

```json
{ "mac": "AA:BB:CC:DD:EE:FF" }
```

**Response — 성공**

`201 Created`
```json
{
  "deviceId": "dev_01h8xzk3q0",
  "mac": "AA:BB:CC:DD:EE:FF",
  "createdAt": "2026-08-05T00:00:00Z"
}
```

**Response — 실패**

`400 Bad Request` (형식 오류)
```json
{ "error": "invalid_mac", "message": "MAC 주소 형식이 올바르지 않습니다." }
```

`401 Unauthorized` (토큰 없음/만료)
```json
{ "error": "unauthorized", "message": "인증 토큰이 유효하지 않습니다." }
```

`409 Conflict` (이미 다른 계정에 등록된 MAC)
```json
{ "error": "already_paired", "message": "이미 다른 계정에 등록된 기기입니다." }
```

`500 Internal Server Error`
```json
{ "error": "internal_error", "message": "잠시 후 다시 시도해 주세요." }
```

---

### 2. 텔레메트리 수집

게이트웨이(또는 LTE-M 브리지)가 임베디드 노드의 raw 센서 페이로드를 서버로 올린다. **앱이 아니라 인프라가 호출**하는 엔드포인트라 인증 체계가 다르다. 필드는 지금 알려진 LoRa 14B 페이로드 기준([`scooter-app/docs/interface.md` §3](scooter-app/docs/interface.md))이며, 임베디드 포맷이 확정되면 이 스키마부터 갱신해야 한다.

| 항목 | 내용 |
|---|---|
| Method / Endpoint | `POST /ingest/telemetry` |
| 설명 | 노드 1개의 원시 센서 스냅샷 1건을 수집한다 |

**Request Header**

| 헤더명 | 필수 여부 | 설명 |
|---|---|---|
| `X-Gateway-Key` | 필수 | 게이트웨이/브리지 단위 API 키 (발급 방식 미정) |
| `Content-Type` | 필수 | `application/json` |

**Request Body**

| 필드명 | 타입 | 필수 여부 | 설명 | 예시값 |
|---|---|---|---|---|
| `nodeId` | string | 필수 | 노드 고유 ID | `"0x0A31"` |
| `seq` | number | 필수 | 페이로드 시퀀스 번호(유실 감지용) | `1042` |
| `state` | string (enum) | 필수 | 노드가 이미 판정한 상태 — `NORMAL`\|`WATCH`\|`ALARM`\|`FAULT` | `"NORMAL"` |
| `gas.sraw` | number | 필수 | 가스 센서 원본값(SGP40 SRAW) | `26412` |
| `gas.devZ` | number | 필수 | 평소 대비 편차(z-score) | `0.4` |
| `gas.slope` | number | 필수 | 변화율(z/min) | `0.2` |
| `h2.mv` | number | 필수 | 수소 센서 전압(mV) | `2234` |
| `h2.slope` | number | 필수 | 변화율(z/min) | `0.1` |
| `co` | object | 선택 | 타는 가스(CO) 채널 — 센서 미도입 시 생략 ([O2](planning/decisions/open-questions.md#o2)) | `null` |
| `pressure` | object | 선택 | 압력 채널 — 미착수 ([O9](planning/decisions/open-questions.md#o9)) | `null` |
| `signature` | object | 선택 | 판단 근거 3요소(급변/지속/무회복) — 전송 여부 미정 ([O2](planning/decisions/open-questions.md#o2)) | `null` |
| `battMv` | number | 필수 | 모듈 배터리 전압(mV) | `3980` |
| `rssi` | number | 필수 | 수신 신호 세기(dBm) | `-71` |
| `ts` | string (ISO 8601) | 필수 | 센싱 시각 | `"2026-08-05T00:00:00Z"` |

```json
{
  "nodeId": "0x0A31",
  "seq": 1042,
  "state": "NORMAL",
  "gas": { "sraw": 26412, "devZ": 0.4, "slope": 0.2 },
  "h2": { "mv": 2234, "slope": 0.1 },
  "battMv": 3980,
  "rssi": -71,
  "ts": "2026-08-05T00:00:00Z"
}
```

**Response — 성공**

`202 Accepted`
```json
{ "received": true, "seq": 1042 }
```

**Response — 실패**

`400 Bad Request`
```json
{ "error": "invalid_payload", "message": "필수 필드가 누락되었습니다: gas.sraw" }
```

`401 Unauthorized`
```json
{ "error": "invalid_gateway_key", "message": "게이트웨이 키가 유효하지 않습니다." }
```

`404 Not Found` (등록 안 된 노드)
```json
{ "error": "node_not_found", "message": "등록되지 않은 노드입니다." }
```

`500 Internal Server Error`
```json
{ "error": "internal_error", "message": "수집 처리 중 오류가 발생했습니다." }
```

> WATCH/ALARM 진입 시 전송 주기가 10초→1초로 상향되므로([A8](planning/decisions/algorithm.md#a8)) 이 엔드포인트는 높은 호출 빈도를 버텨야 한다.

---

### 3. 텔레메트리 최신 조회

앱이 폴백/최초 진입 시 쓰는 REST 조회 — 실시간은 §4(스트림)를 우선 쓴다.

| 항목 | 내용 |
|---|---|
| Method / Endpoint | `GET /devices/{deviceId}/telemetry/latest` |
| 설명 | 등록된 기기의 가장 최근 정규화 텔레메트리 스냅샷을 반환한다 |

**Request Header**

| 헤더명 | 필수 여부 | 설명 |
|---|---|---|
| `Authorization` | 필수 | `Bearer <JWT>` |

**Path Parameter**

| 이름 | 타입 | 필수 여부 | 설명 |
|---|---|---|---|
| `deviceId` | string | 필수 | §1에서 발급받은 기기 ID |

**Response — 성공**

`200 OK`
```json
{
  "state": "WATCH",
  "latched": false,
  "gas": { "sraw": 26158, "baseline": 26376, "devZ": 3.1, "slope": 2.4 },
  "h2": { "mv": 2251, "mvAvg": 2249, "rsKohm": 7.6, "slope": 0.1 },
  "co": null,
  "env": null,
  "pressure": null,
  "water": null,
  "signature": null,
  "location": null,
  "module": {
    "nodeId": "0x0A31",
    "seq": 1180,
    "battMv": 3960,
    "rssi": -74,
    "lastSeen": "2026-08-05T00:00:10Z"
  }
}
```

응답 스키마는 [`scooter-app/types/telemetry.ts`](scooter-app/types/telemetry.ts)의 `DeviceTelemetry`와 동일하게 맞춘다.

**Response — 실패**

`401 Unauthorized`
```json
{ "error": "unauthorized", "message": "인증 토큰이 유효하지 않습니다." }
```

`403 Forbidden` (내 계정 소유 기기가 아님)
```json
{ "error": "forbidden", "message": "이 기기에 접근할 권한이 없습니다." }
```

`404 Not Found`
```json
{ "error": "device_not_found", "message": "존재하지 않는 기기입니다." }
```

---

### 4. 텔레메트리 실시간 스트림

| 항목 | 내용 |
|---|---|
| Method / Endpoint | `GET /devices/{deviceId}/telemetry/stream` |
| 설명 | Server-Sent Events로 텔레메트리 변경을 실시간 push한다 (제안 — WebSocket 대안 검토 중, [§11](#11-열린-질문)) |

**Request Header**

| 헤더명 | 필수 여부 | 설명 |
|---|---|---|
| `Authorization` | 필수 | `Bearer <JWT>` |
| `Accept` | 필수 | `text/event-stream` |

**Path Parameter**

| 이름 | 타입 | 필수 여부 | 설명 |
|---|---|---|---|
| `deviceId` | string | 필수 | 기기 ID |

**Response — 성공**

`200 OK` (연결 유지, `Content-Type: text/event-stream`)
```
event: telemetry
data: {"state":"ALARM","latched":true,"gas":{"sraw":21200,"baseline":29450,"devZ":18.4,"slope":61},"h2":{"mv":210,"slope":3.2},"module":{"nodeId":"0x0A31","seq":1241,"battMv":3910,"rssi":-78,"lastSeen":"2026-08-05T00:01:00Z"}}

event: telemetry
data: {"state":"ALARM", ...}
```

앱 쪽은 [`scooter-app/services/telemetrySource.ts`](scooter-app/services/telemetrySource.ts)의 `TelemetrySource.subscribe()` 구현체가 이 스트림을 그대로 받아서 콜백을 호출하면 된다 — 지금 `noTelemetrySource` 자리를 교체하는 지점.

**Response — 실패**

`401 Unauthorized`
```json
{ "error": "unauthorized", "message": "인증 토큰이 유효하지 않습니다." }
```

`403 Forbidden`
```json
{ "error": "forbidden", "message": "이 기기에 접근할 권한이 없습니다." }
```

---

### 5. 이벤트 목록 조회

기록 탭에서 쓴다. 노드는 상태 전이만 보내고, "무슨 일이 있었는지" 서술은 서버가 만든다([C5](planning/decisions/collaboration.md#c5)).

| 항목 | 내용 |
|---|---|
| Method / Endpoint | `GET /devices/{deviceId}/events` |
| 설명 | 기기의 상태 전이·오경보 차단·조치 이벤트 목록을 시간순으로 반환한다 |

**Request Header**

| 헤더명 | 필수 여부 | 설명 |
|---|---|---|
| `Authorization` | 필수 | `Bearer <JWT>` |

**Query Parameter**

| 이름 | 타입 | 필수 여부 | 설명 | 예시값 |
|---|---|---|---|---|
| `since` | string (ISO 8601) | 선택 | 이 시각 이후 이벤트만 반환 (기본: 최근 30일) | `2026-08-01T00:00:00Z` |
| `limit` | number | 선택 | 최대 반환 개수 (기본 50, 최대 200) | `50` |

**Response — 성공**

`200 OK`
```json
{
  "items": [
    { "id": "evt_1", "timestamp": "2026-08-05T00:00:00Z", "kind": "state_change", "description": "정상 → 주의 전환" },
    { "id": "evt_2", "timestamp": "2026-08-05T00:05:00Z", "kind": "suppressed", "description": "습도 급변으로 가스 채널 승격 보류 (오경보 아님)" }
  ],
  "nextCursor": null
}
```

> `kind: "suppressed"`는 [O3](planning/decisions/open-questions.md#o3)(오경보 차단 기록 노출 여부)가 "보여줌"으로 확정될 때만 실제로 채워진다.

**Response — 실패**

`400 Bad Request`
```json
{ "error": "invalid_query", "message": "since 형식이 올바르지 않습니다." }
```

`401 Unauthorized`
```json
{ "error": "unauthorized", "message": "인증 토큰이 유효하지 않습니다." }
```

`404 Not Found`
```json
{ "error": "device_not_found", "message": "존재하지 않는 기기입니다." }
```

---

### 6. 같은 모델 비교 조회

| 항목 | 내용 |
|---|---|
| Method / Endpoint | `GET /devices/{deviceId}/fleet-comparison` |
| 설명 | 같은 모델 킥보드 전체 대비 이 기기의 상태를 비교한 값을 반환한다 |

**Request Header**

| 헤더명 | 필수 여부 | 설명 |
|---|---|---|
| `Authorization` | 필수 | `Bearer <JWT>` |

**Response — 성공**

`200 OK`
```json
{
  "fleetSize": 1284,
  "fleetAvgLevel": "ok",
  "myLevel": "watch",
  "myMultiplier": 8
}
```

**Response — 실패**

`401 Unauthorized`
```json
{ "error": "unauthorized", "message": "인증 토큰이 유효하지 않습니다." }
```

`404 Not Found`
```json
{ "error": "device_not_found", "message": "존재하지 않는 기기입니다." }
```

---

### 7. 자동 조치 로그 조회

| 항목 | 내용 |
|---|---|
| Method / Endpoint | `GET /devices/{deviceId}/actions` |
| 설명 | 스마트플러그 차단·관리실 통보 등 서버가 실행한 자동 조치 로그를 반환한다 |

**Request Header**

| 헤더명 | 필수 여부 | 설명 |
|---|---|---|
| `Authorization` | 필수 | `Bearer <JWT>` |

**Response — 성공**

`200 OK`
```json
{
  "items": [
    { "type": "plug_cut", "status": "done", "ts": "2026-08-05T00:01:05Z" },
    { "type": "notify", "status": "sent", "ts": "2026-08-05T00:01:06Z" }
  ]
}
```

**Response — 실패**

`401 Unauthorized`
```json
{ "error": "unauthorized", "message": "인증 토큰이 유효하지 않습니다." }
```

`404 Not Found`
```json
{ "error": "device_not_found", "message": "존재하지 않는 기기입니다." }
```

---

### 8. 경보 해제

[A7](planning/decisions/algorithm.md#a7)에 따라 ALARM은 자동 해제되지 않는다(latch) — 사람이 명시적으로 확인해야 풀린다. **[O8](planning/decisions/open-questions.md#o8)(해제 권한: 차주만/관리자만/조건부)이 아직 안 정해져서 이 엔드포인트는 지금 항상 비활성 응답만 낸다.** 앱 쪽(`app/alarm.tsx`)도 해제 버튼을 비활성 상태로만 둔다.

| 항목 | 내용 |
|---|---|
| Method / Endpoint | `POST /devices/{deviceId}/alarm/ack` |
| 설명 | 경보 상태를 확인 처리하고 노드에 latch 해제 downlink를 보낸다 (권한 모델 확정 전까지 비활성) |

**Request Header**

| 헤더명 | 필수 여부 | 설명 |
|---|---|---|
| `Authorization` | 필수 | `Bearer <JWT>` |

**Request Body**

| 필드명 | 타입 | 필수 여부 | 설명 | 예시값 |
|---|---|---|---|---|
| `note` | string | 선택 | 해제 사유 메모 | `"현장 확인 완료, 오작동으로 판단"` |

**Response — 성공 (권한 모델 확정 후)**

`200 OK`
```json
{ "acknowledged": true, "ackedAt": "2026-08-05T00:10:00Z", "ackedBy": "user_123" }
```

**Response — 실패 (지금 항상 이 상태)**

`403 Forbidden`
```json
{ "error": "not_configured", "message": "경보 해제 권한 모델이 아직 정해지지 않았습니다." }
```

기타 표준 실패:

`401 Unauthorized`
```json
{ "error": "unauthorized", "message": "인증 토큰이 유효하지 않습니다." }
```

`404 Not Found`
```json
{ "error": "device_not_found", "message": "존재하지 않는 기기입니다." }
```

---

### 9. 위치 등록

[O1](planning/decisions/open-questions.md#o1)이 GPS/등록위치/게이트웨이 중 뭘로 정해지느냐에 따라 요청 형태가 통째로 바뀐다 — 아래는 "사용자 등록 위치" 방식을 가정한 제안이다. 앱은 이 값이 없으면 폰 자체 GPS로 대체 중이다([`scooter-app/components/map/DeviceMap.tsx`](scooter-app/components/map/DeviceMap.tsx)).

| 항목 | 내용 |
|---|---|
| Method / Endpoint | `PUT /devices/{deviceId}/location` |
| 설명 | 기기의 등록 위치(주차장 동·호수 등)를 설정한다 |

**Request Header**

| 헤더명 | 필수 여부 | 설명 |
|---|---|---|
| `Authorization` | 필수 | `Bearer <JWT>` |
| `Content-Type` | 필수 | `application/json` |

**Request Body**

| 필드명 | 타입 | 필수 여부 | 설명 | 예시값 |
|---|---|---|---|---|
| `label` | string | 필수 | 사람이 읽을 위치 설명 | `"서울 성동구 행당동 · 지하주차장 B-14"` |
| `lat` | number | 선택 | 위도 (GPS 방식으로 바뀔 경우 대비) | `37.5573` |
| `lon` | number | 선택 | 경도 | `127.0329` |

```json
{ "label": "서울 성동구 행당동 · 지하주차장 B-14" }
```

**Response — 성공**

`200 OK`
```json
{ "label": "서울 성동구 행당동 · 지하주차장 B-14", "updatedAt": "2026-08-05T00:00:00Z" }
```

**Response — 실패**

`400 Bad Request`
```json
{ "error": "invalid_body", "message": "label은 필수입니다." }
```

`401 Unauthorized`
```json
{ "error": "unauthorized", "message": "인증 토큰이 유효하지 않습니다." }
```

`404 Not Found`
```json
{ "error": "device_not_found", "message": "존재하지 않는 기기입니다." }
```

---

## 10. 저장 원칙

[C5](planning/decisions/collaboration.md#c5)에 따라 raw와 정규화값을 **분리 저장**한다 — 벤치 튜닝으로 임계값·정규화 로직이 계속 바뀔 것이므로([A10](planning/decisions/algorithm.md#a10)), 과거 raw 데이터를 나중에 새 로직으로 재해석할 수 있어야 한다.

| 필드 | 용도 |
|---|---|
| raw 페이로드 원본(§2 그대로) | 재해석용, 불변 |
| 정규화값(devZ, slope 등) | 지금 로직 기준 계산 결과 |
| 계산에 쓰인 로직 버전 | 나중에 "이 값이 어느 로직으로 나왔는지" 추적 |

## 11. 열린 질문

| # | 질문 | 막는 것 |
|---|---|---|
| — | 계정·인증 방식이 뭔지 (§0) | 모든 엔드포인트의 `Authorization` 실제 구현 |
| — | 서버→앱 실시간 전달 방식 — REST 폴링 / SSE / WebSocket (§4) | 앱의 `telemetrySource.ts` 구현체, 서버 인프라(커넥션 유지 방식) |
| [O1](planning/decisions/open-questions.md#o1) | 위치 소스 | §9 요청 형태 |
| [O2](planning/decisions/open-questions.md#o2) | 노드가 판단 근거를 전송할지 | §2 페이로드에 `signature` 포함 여부, 전송량 |
| [O3](planning/decisions/open-questions.md#o3) | 오경보 차단 기록 노출 여부 | §5 `suppressed` 이벤트 실제 생성 여부 |
| [O4](planning/decisions/open-questions.md#o4) | 기기 여러 대 관리 | 계정↔기기 다대다 모델, §1 응답 구조 |
| [O8](planning/decisions/open-questions.md#o8) | 경보 해제 권한 | §8 활성화, downlink 경로 |
| [O9](planning/decisions/open-questions.md#o9) | 압력 채널 센서 종류 | §2 `pressure` 필드 단위·의미 |

## 12. 참고

- 앱이 기대하는 값(화면 사용처 포함): [`scooter-app/docs/interface.md`](scooter-app/docs/interface.md)
- 데이터 인벤토리 원본: [`planning/decisions.md` §7](planning/decisions.md#7-데이터-인벤토리)
- 협업·배포 원칙(C1~C5): [`planning/decisions/collaboration.md`](planning/decisions/collaboration.md)
- 감지 알고리즘(A1~A10): [`planning/decisions/algorithm.md`](planning/decisions/algorithm.md)

## 13. 변경 관리

서버 팀이 정해지면:
1. §0 인증 모델부터 확정 (다른 모든 엔드포인트가 이걸 전제로 함)
2. §2 수집 스키마를 임베디드 확정 포맷에 맞게 갱신
3. §4 실시간 전달 방식 확정 후 `scooter-app/services/telemetrySource.ts` 구현체 작성
4. 이 문서와 `scooter-app/types/telemetry.ts`·`scooter-app/docs/interface.md`를 같이 갱신 — 셋이 어긋나면 안 됨
