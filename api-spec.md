# 서버 API — 간단 정리

> **⚠️ 이 문서는 구버전이다 (2026-08-12 기준).** 아래 내용은 백엔드가 `/devices/{deviceId}/...` 경로 + 단일 문자열 `AlertState`(`WARMUP`/`NORMAL`/`WATCH`/`ALARM`/`FAULT`)를 쓰던 시절 스펙이다. 그 후 백엔드가 한 번 더 통째로 바뀌어서(`/v1/devices/{mac}/...` 경로, 인증 없음, 상태가 `status`/`stage`/`conditions`/`latched`/`water` 5개 필드로 분리) 지금은 상당 부분 안 맞는다. **최신 내용은 [`scooter-app/docs/interface.md`](scooter-app/docs/interface.md) §2·§3·§6을 볼 것** — 이 문서를 그 기준으로 전면 재작성하는 건 코드 반영과 함께 나중에 하기로 했다(지금은 문서만 최신화한 상태).

**상태: 실제 배포된 백엔드(Orca Backend, https://api.agenthub.work/docs) 기준으로 갱신함.** 예전엔 이 문서가 앱 쪽 "제안"이었는데, 이제 실제로 돌아가는 서버가 있어서 그 OpenAPI 스펙(`/openapi.json`)에 맞춰 다시 정리했다. 앱이 기대하는 값: [`scooter-app/docs/interface.md`](scooter-app/docs/interface.md). 여기 없는데 앱에 필요한 건 [`backend-requests.md`](backend-requests.md)에 따로 정리했다 — 그건 "요청 중"이지 지금 되는 게 아니다. 문서 작성 원칙은 [`CLAUDE.md`](CLAUDE.md#api-specmd-작성-원칙) 참고.

## 인증

로그인 없음. 맥주소 등록 시 발급되는 **기기 토큰**만 쓴다 — "이 폰이 이 킥보드에 접근 자격이 있다"는 증명. 이후 모든 요청에 `Authorization: Bearer <deviceToken>`.

- **토큰은 만료 없이 유지된다.** 재조회 불가 — 앱이 로컬에 저장해야 한다(등록 응답에서만 받을 수 있음).
- **폰을 바꿔도 같은 맥주소를 다시 등록하면 새 토큰이 발급되고, 예전 폰의 토큰은 그대로 둔다**(별도 무효화 안 함). 개인 1대 시나리오([O4](planning/decisions/open-questions.md#o4) 확정)라 여러 폰이 동시에 같은 토큰/기기에 접근해도 문제 삼지 않는다.
- 게이트웨이(임베디드) 쪽 인증은 이거랑 완전히 별개이고 아직 미정이다 — 앱 API와 무관하니 이 문서 범위 밖.

## API 사용 순서

```
1. POST /devices              맥주소 등록 → deviceToken 발급받음
2. POST /devices/{id}/push-token   (선택) 푸시 토큰 등록
3. GET  /devices/{id}/telemetry/latest   반복 폴링 (NORMAL 10초 / WATCH·ALARM 1초 간격)
4. (ALARM 판정되면 서버가 알아서 푸시 발송 — 앱이 뭘 부를 필요 없음)
5. POST /devices/{id}/alarm/release   사용자가 해제 요청할 때만
```
기록·날짜별 조회·fleet 비교 조회는 이 순서와 무관하게 화면 진입 시 아무 때나 부르면 된다.

## 상태값 (AlertState)

```
WARMUP | NORMAL | WATCH | ALARM | FAULT
```
`telemetry/latest`·`telemetry/history`의 `state`, `fleet-comparison`의 `*Level`에 전부 이 5개 중 하나가 온다 — **대문자**다.

- 앱은 지금 `NORMAL`/`WATCH`/`ALARM`/`FAULT` 4개를 다룬다.
- **`WARMUP`은 아직 화면 처리를 안 했다** — `WATCH`와 의미가 겹칠 가능성이 있어 보류 중([`backend-requests.md`](backend-requests.md) 확인 요청함). 그때까지 서버가 `WARMUP`을 보내면 앱이 어떻게 반응할지는 정해지지 않았다.
- `FAULT`(기기 고장)는 가스 심각도 단계(정상→주의→경보)가 아니라 완전히 다른 축이라, 게이지·판단근거 같은 "얼마나 심각한지" 화면 대신 별도 안내 화면(`FaultState`)으로 보여준다.

## 공통 에러

**모든 인증된 요청(§ 인증 헤더 필요한 것 전부)에 공통으로 적용** — 아래 API별 설명에는 그 API만의 특이 케이스만 적는다.

| 상태 코드 | 의미 | 바디 |
|---|---|---|
| `401 Unauthorized` | `deviceToken` 없음/유효하지 않음 | `{ "error": "unauthorized", "requestId": "req_..." }` |
| `404 Not Found` | `deviceId`가 존재하지 않음 | `{ "error": "device_not_found", "requestId": "req_..." }` |
| `422 Unprocessable Entity` | 요청 파라미터 검증 실패(필수 쿼리 누락, 형식 오류 등) — FastAPI가 자동으로 내려줌 | `{ "detail": [{ "loc": ["query", "date"], "msg": "Field required", "type": "missing" }] }` |
| `500 Internal Server Error` | 서버 오류 | `{ "error": "internal_error", "requestId": "req_..." }` |

- 성공은 항상 `200`/`201` 중 하나 — 바디는 리소스를 그대로 반환한다(별도 래핑 없음).
- **일반 에러(401/404/409/403/500)와 검증 에러(422)는 바디 모양이 다르다** — `error`+`requestId` vs `detail` 배열. 앱에서 에러를 파싱할 때 이 둘을 구분해야 한다.
- `requestId`는 문의할 때 같이 알려주면 서버 로그 추적에 쓸 수 있다.

## 통신 패턴 3가지

| 패턴 | 방향 |
|---|---|
| ① 조회 | 앱 → 서버 요청 → 응답 |
| ② 등록/실행 | 앱 → 서버 요청 → 응답 |
| ③ 서버 발신(푸시) | 서버 → 앱, 요청 없음 |

---

## ① 조회

**현재 상태 조회**
```
GET /devices/{deviceId}/telemetry/latest
Authorization: Bearer <deviceToken>

→ 200
{
  "state": "WATCH",
  "latched": false,
  "gas": { "devZ": 3.1, "slope": 2.4 },
  "h2": { "devZ": 0.4, "slope": 0.1 },
  "co": null,
  "env": null,
  "pressure": null,
  "water": null,
  "signature": { "rise": true, "hold": false, "noRecover": true, "holdS": 18 },
  "location": { "lat": 37.5573, "lon": 127.0329 },
  "module": { "nodeId": "44bd8d239c28", "seq": 12, "battMv": 3960, "rssi": -74, "snr": 8.2, "lastSeen": "2026-08-05T00:00:10Z" }
}
```
- **raw 센서값(sraw·mv·baseline)은 안 온다** — 노드가 이미 판정해서 정규화값(`devZ`/`slope`)만 보낸다. 앱의 "센서 원본 수치 보기" 접이식은 그래서 지금 주석 처리해뒀다(보여줄 실데이터가 없음).
- `gas`·`h2`는 같은 모양(`{devZ, slope}`)을 쓴다 — `h2`도 mV 원본값 없음.
- `co`/`env`/`pressure`/`water`/`signature`/`location`은 전부 **null일 수 있다**(센서 미장착이거나 아직 값이 없는 경우 등). 정확히 어떤 조건에서 null인지는 [`backend-requests.md`](backend-requests.md)에서 확인 요청함 — 그때까지 앱은 null 가능성을 항상 방어적으로 처리해야 한다.
- `module.snr`(수신 신호 대 잡음비)도 온다 — 지금 앱 화면에선 안 씀.

**날짜별 센서값 조회**
```
GET /devices/{deviceId}/telemetry/history?date=2026-08-05
Authorization: Bearer <deviceToken>

→ 200
{
  "date": "2026-08-05",
  "samples": [
    { "hour": "00:00", "state": "NORMAL", "gas": { "devZ": 0.4, "slope": 0.1 }, "h2": { "devZ": 0.1, "slope": 0.0 }, "co": { "devZ": 0.0, "slope": 0.0 }, "tempC": 24.6, "rh": 41, "presDev": 0 },
    { "hour": "14:00", "state": "WATCH", "gas": { "devZ": 3.1, "slope": 2.4 }, "h2": { "devZ": 0.4, "slope": 0.1 }, "co": { "devZ": 0.0, "slope": 0.0 }, "tempC": 25.1, "rh": 40, "presDev": 0 }
  ],
  "events": [
    { "time": "14:32", "description": "정상 → 주의 전환" }
  ]
}
```
- `date`는 **필수**, 하루치만 조회된다(범위 조회 없음) — "오늘" 한 화면 분량. "최근 7일"·"기간 선택"처럼 여러 날을 보려면 지금은 이 API를 날짜 수만큼 호출해서 클라이언트가 합치는 수밖에 없다(서버에 range API 요청해둠, [`backend-requests.md`](backend-requests.md)).
- `gas`/`h2`/`co`는 `telemetry/latest`와 완전히 같은 모양(`{devZ, slope}`). 단 여기선 `co`가 항상 채워져서 온다(널 아님) — `telemetry/latest`에서는 null일 수 있는 것과 다르다.
- **`pressure`만 다르다**: `telemetry/latest`는 `pressure: {presDev, presRate}`인데 여기선 `presRate` 없이 `presDev`만 감싸지 않은 숫자로 온다. gas/h2/co는 두 응답에서 모양이 똑같은데 pressure만 이런 이유는 불명확 — 확인 요청함([`backend-requests.md`](backend-requests.md)).

**기록(이벤트) 조회**
```
GET /devices/{deviceId}/events?since=2026-08-01T00:00:00Z
Authorization: Bearer <deviceToken>

→ 200
{
  "items": [
    { "id": "evt_1", "timestamp": "2026-08-05T14:32:00Z", "kind": "state_change", "description": "정상 → 주의 전환" },
    { "id": "evt_2", "timestamp": "2026-08-05T09:07:00Z", "kind": "suppressed", "description": "습도 급변으로 가스 채널 승격 보류 (오경보 아님)" }
  ]
}
```
`since`는 **필수**, "이 시각 이후 전부"만 되고 끝을 자르는 파라미터(`until` 등)가 없다 — "최근 7일"처럼 끝이 있는 기간을 정확히 자르려면 응답을 받은 뒤 클라이언트에서 날짜로 한 번 더 걸러야 한다(끝 파라미터도 서버에 요청해둠).

**같은 모델 비교 조회**
```
GET /devices/{deviceId}/fleet-comparison
Authorization: Bearer <deviceToken>

→ 200
{ "fleetSize": 1284, "fleetAvgLevel": "NORMAL", "myLevel": "WATCH", "myMultiplier": 8.0 }
```

---

## ② 등록/실행

**기기 등록 (맥주소)**
```
POST /devices
{ "mac": "AA:BB:CC:DD:EE:FF" }

→ 201
{
  "deviceId": "dev_01h8xzk3q0",
  "deviceToken": "dtk_9f8e7d6c5b4a",
  "managementPhone": "01029015899"
}

→ 409 (이미 다른 계정에 등록된 맥주소)
{ "error": "already_paired", "requestId": "req_..." }

→ 422 (MAC 형식 오류 — 12~17자 범위를 벗어나는 등)
{ "detail": [{ "loc": ["body", "mac"], "msg": "...", "type": "string_too_short" }] }
```
`managementPhone`은 이 킥보드가 등록된 위치(주차장·건물)의 관리실 전화번호 — 서버가 맥주소 연결 시점에 같이 내려준다(없을 수도 있음, nullable). 앱은 이 번호를 저장해뒀다가 경보 화면 "관리실 전화" 버튼에 그대로 쓴다 — **앱에 하드코딩하지 않는다.**
`deviceToken`은 앱이 로컬에 저장하고 이후 모든 요청의 `Authorization` 헤더에 쓴다. **재조회 불가** — 등록 응답에서만 받을 수 있다.

**푸시 토큰 등록** (멱등 — 같은 토큰으로 여러 번 불러도 안전)
```
POST /devices/{deviceId}/push-token
Authorization: Bearer <deviceToken>
{ "token": "ExponentPushToken[xxxxxxx]" }

→ 200
{ "registered": true }
```

**경보 해제 요청**
```
POST /devices/{deviceId}/alarm/release
Authorization: Bearer <deviceToken>
{ "note": "현장 확인 완료" }   (선택, 최대 255자)

→ 200 (승인)
{ "released": true }

→ 403 (거부 — 사유 비공개)
{ "error": "not_allowed", "requestId": "req_..." }
```
앱은 요청만 보낸다 — **승인 여부(권한 판단)는 서버가 내부 규칙으로 결정**하고, 왜 거부됐는지 세세한 사유는 앱에 안 내려준다. 승인되면 서버가 노드에 latch 해제를 내려보내는 경로(LoRa downlink 등)는 이 문서 범위 밖.

---

## ③ 서버 발신 (푸시)

경보(ALARM) 판정 시 서버가 저장해둔 푸시 토큰으로 Expo Push API를 직접 호출한다. 앱이 요청하지 않는다 — 앱이 꺼져있어도 OS(APNs/FCM)가 전달한다.

```
서버 → Expo Push API
{ "to": "ExponentPushToken[xxxxxxx]", "title": "화재 발생 직전이에요", "body": "즉시 확인하세요", "data": { "deviceId": "dev_01h8xzk3q0", "state": "ALARM" } }
```

---

## 참고용 — 서버에는 있지만 앱이 안 쓰는 것

**서비스 상태**
```
GET /health

→ 200
{ "status": "ok", "version": "0.1.0", "revision": "a1b2c3d4e5f6", "components": { "database": {"status":"ok"}, "lora_radio": {"status":"ok"}, "push": {"status":"ok"} } }
```
모니터링/운영용 — 앱이 호출할 일은 없다.

---

## 확정된 것

| # | 결정 |
|---|---|
| 인증 | 로그인 없음, 기기 토큰만 사용 |
| 응답 형식 | 성공/실패는 HTTP 상태 코드가 1차 신호. 성공 시 바디는 리소스를 그대로 반환(래핑 없음), 실패 시 `{ "error": "code", "requestId": "..." }`(단, 422는 `{ "detail": [...] }`) |
| 상태값 | `WARMUP`/`NORMAL`/`WATCH`/`ALARM`/`FAULT` 5개, 전부 **대문자**. 앱은 `NORMAL`/`WATCH`/`ALARM`/`FAULT` 지원, `WARMUP`은 보류 |
| 원본 센서값 | **서버가 안 보낸다** — `devZ`/`slope` 같은 정규화값만 옴. 원본 수치 화면은 주석 처리 |
| [O1](planning/decisions/open-questions.md#o1) 위치 | GPS 확정 — 임베디드 모듈이 직접 측정, `location`으로 자동 전송(별도 등록 API 없음, nullable) |
| [O2](planning/decisions/open-questions.md#o2) 판단 근거 | **서버가 계산해서 제공** — `signature` 필드로 옴(단, nullable — 항상 채워지는 건 아님, 조건 확인 요청함) |
| [O4](planning/decisions/open-questions.md#o4) 기기 관리 | **단일 기기로 확정** — 1계정=1기기, 다중 기기 지원 없음 |
| [O8](planning/decisions/open-questions.md#o8) 경보 해제 | 앱은 **해제 요청만** 보낸다(§② `alarm/release`) — 승인 여부는 서버가 내부 규칙으로 판단, 그 규칙 자체는 앱이 몰라도 됨 |

> [O9](planning/decisions/open-questions.md#o9)(압력 채널 센서 종류)는 이 문서에서 뺐다 — BMP390이든 strain gauge든 클라이언트는 정규화된 `pressure` 값만 받으므로, 이건 API 계약이 아니라 임베디드 하드웨어(BOM) 결정이다.

## 참고

- 실제 서버 스펙 원본: https://api.agenthub.work/docs (OpenAPI: https://api.agenthub.work/openapi.json)
- 서버팀에 요청 중인 것: [`backend-requests.md`](backend-requests.md)
- 앱이 기대하는 값(필드별 화면 사용처): [`scooter-app/docs/interface.md`](scooter-app/docs/interface.md)
- 원 결정 문서: [`planning/decisions.md`](planning/decisions.md)
- 문서 작성 원칙 출처: [Cobinding Tech Blog — API 명세서 작성 가이드라인](https://cobinding.tistory.com/165)
