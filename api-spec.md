# 서버 API — 간단 정리 (Draft)

**상태: 제안.** 배경: [`planning`](planning) 레포, 앱이 기대하는 값: [`scooter-app/docs/interface.md`](scooter-app/docs/interface.md). 문서 작성 원칙은 [`CLAUDE.md`](CLAUDE.md#api-specmd-작성-원칙) 참고 — 요약: HTTP 상태 코드로 성공/실패를 먼저 판단하고, 공통 에러는 한 곳에 모아둔다.

## 인증

로그인 없음. 맥주소 등록 시 발급되는 **기기 토큰**만 쓴다 — "이 폰이 이 킥보드에 접근 자격이 있다"는 증명. 이후 모든 요청에 `Authorization: Bearer <deviceToken>`.

- **토큰은 만료 없이 유지된다.** 로그인 자체가 없어서 "재로그인으로 새 토큰 받기" 흐름을 만들 수 없다 — 만료시키면 오히려 막다른 길이 된다.
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
기록·기간별 요약·fleet 비교 조회는 이 순서와 무관하게 화면 진입 시 아무 때나 부르면 된다.

## 공통 에러

**모든 인증된 요청(§ 인증 헤더 필요한 것 전부)에 공통으로 적용** — 아래 API별 설명에는 그 API만의 특이 케이스만 적는다.

| 상태 코드 | 의미 | 바디 |
|---|---|---|
| `401 Unauthorized` | `deviceToken` 없음/유효하지 않음 | `{ "error": "unauthorized" }` |
| `404 Not Found` | `deviceId`가 존재하지 않음 | `{ "error": "device_not_found" }` |
| `500 Internal Server Error` | 서버 오류 | `{ "error": "internal_error" }` |

성공은 항상 `200`/`201`/`202` 중 하나 — 바디는 리소스를 그대로 반환한다(별도 래핑 없음).

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
  "gas": { "sraw": 26158, "devZ": 3.1, "slope": 2.4 },
  "h2": { "mv": 2251, "slope": 0.1 },
  "signature": { "rise": true, "hold": false, "noRecover": true, "holdS": 18 },
  "location": { "lat": 37.5573, "lon": 127.0329 },
  "module": { "nodeId": "0x0A31", "battMv": 3960, "rssi": -74, "lastSeen": "2026-08-05T00:00:10Z" }
}
```
`signature`(판단 근거 3요소)는 서버가 raw 데이터로 계산해서 항상 채워 보낸다 — 노드가 직접 계산해서 보내는 게 아니다.

**날짜별 센서값 조회** (통계 탭)
```
GET /devices/{deviceId}/telemetry/history?date=2026-08-05
Authorization: Bearer <deviceToken>

→ 200
{
  "date": "2026-08-05",
  "samples": [
    { "hour": "00:00", "state": "NORMAL", "gas": { "devZ": 0.4 }, "h2": { "mv": 2234 }, "co": { "mv": 412 }, "pressure": { "presDev": 0 } },
    { "hour": "01:00", "state": "NORMAL", "gas": { "devZ": 0.3 }, "h2": { "mv": 2230 }, "co": { "mv": 410 }, "pressure": { "presDev": 0 } }
  ],
  "events": [
    { "time": "14:32", "description": "정상 → 주의 전환" }
  ]
}
```
시간당 1개 × 센서 4종 = 하루 96개 정도라 항상 하루치를 통째로 반환한다(압축 파라미터 없음). 하루짜리 조회("오늘")에만 쓴다 — 여러 날짜를 볼 때는 아래 "기간별 요약 조회"를 쓴다.

**기간별 요약 조회** ("최근 7일"·"기간 선택" — 여러 날짜를 한 번에 볼 때)
```
GET /devices/{deviceId}/telemetry/period-summary?from=2026-08-04&to=2026-08-10
Authorization: Bearer <deviceToken>

→ 200
{
  "from": "2026-08-04",
  "to": "2026-08-10",
  "state": "WATCH",
  "peakAt": "2026-08-07T14:32:00Z",
  "channels": {
    "gas": { "state": "WATCH", "peakDevZ": 3.1, "peakSlope": 2.4 },
    "h2": { "state": "NORMAL" },
    "co": { "state": "NORMAL" },
    "pressure": { "state": "NORMAL" }
  },
  "dailyPeaks": [
    { "date": "2026-08-04", "gas": { "devZ": 0.4 }, "h2": { "mv": 2234 } },
    { "date": "2026-08-07", "gas": { "devZ": 3.1 }, "h2": { "mv": 2251 } }
  ]
}
```
날짜별 상세(시간당 96개)를 며칠치씩 그대로 다 내려보내면 프론트가 그중 "며칠 몇 시에 뭐가 얼마나 튀었는지"를 직접 계산해야 한다 — 판정 로직은 서버 책임([A1](planning/decisions/algorithm.md#a1))이라 그건 안 된다. 그래서 이 API는 처음부터 **하루 단위로 이미 집계된 최고치**(`state`/`peakDevZ` 등)와 **기간 전체에서 언제·어느 채널이 가장 심했는지**(`state`/`peakAt`/`channels`)를 서버가 계산해서 내려준다 — `dailyPeaks`는 상세보기의 날짜별 추이 그래프용, 나머지는 리본·채널 카드용. `channels`/`dailyPeaks` 안의 필드명은 "현재 상태 조회"(`telemetry/latest`)와 맞춘다.

**기록(이벤트) 조회**
```
GET /devices/{deviceId}/events?since=2026-08-04T00:00:00Z&until=2026-08-10T23:59:59Z
Authorization: Bearer <deviceToken>

→ 200
{
  "items": [
    { "id": "evt_1", "timestamp": "2026-08-07T14:32:00Z", "kind": "state_change", "description": "정상 → 주의 전환" },
    { "id": "evt_2", "timestamp": "2026-08-05T09:07:00Z", "kind": "suppressed", "description": "습도 급변으로 가스 채널 승격 보류 (오경보 아님)" }
  ]
}
```
`until`은 선택 — 생략하면 지금까지("최근 기록" 같은 열린 조회). "최근 7일"·"기간 선택"처럼 범위가 정해진 조회는 `since`+`until` 둘 다 넘긴다.

**같은 모델 비교 조회**
```
GET /devices/{deviceId}/fleet-comparison
Authorization: Bearer <deviceToken>

→ 200
{ "fleetSize": 1284, "fleetAvgLevel": "ok", "myLevel": "watch", "myMultiplier": 8 }
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
{ "error": "already_paired" }
```
`managementPhone`은 이 킥보드가 등록된 위치(주차장·건물)의 관리실 전화번호 — 서버가 맥주소 연결 시점에 같이 내려준다. 앱은 이 번호를 저장해뒀다가 경보 화면 "관리실 전화" 버튼에 그대로 쓴다 — **앱에 하드코딩하지 않는다.**
`deviceToken`은 앱이 로컬에 저장하고 이후 모든 요청의 `Authorization` 헤더에 쓴다.

**푸시 토큰 등록**
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
{ "note": "현장 확인 완료" }   (선택)

→ 200 (승인)
{ "released": true }

→ 403 (거부)
{ "error": "not_allowed" }
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

## 확정된 것

| # | 결정 |
|---|---|
| 인증 | 로그인 없음, 기기 토큰만 사용 |
| 응답 형식 | 성공/실패는 HTTP 상태 코드가 1차 신호. 성공 시 바디는 리소스를 그대로 반환(래핑 없음), 실패 시 `{ "error": "code" }` |
| [O1](planning/decisions/open-questions.md#o1) 위치 | GPS 확정 — 임베디드 모듈이 직접 측정, `location`으로 자동 전송(별도 등록 API 없음) |
| [O2](planning/decisions/open-questions.md#o2) 판단 근거 | **서버가 계산해서 제공** — `signature`는 항상 응답에 포함(§① 예시 참고) |
| [O4](planning/decisions/open-questions.md#o4) 기기 관리 | **단일 기기로 확정** — 1계정=1기기, 다중 기기 지원 없음 |
| [O8](planning/decisions/open-questions.md#o8) 경보 해제 | 앱은 **해제 요청만** 보낸다(§② `alarm/release`) — 승인 여부는 서버가 내부 규칙으로 판단, 그 규칙 자체는 앱이 몰라도 됨 |

> [O9](planning/decisions/open-questions.md#o9)(압력 채널 센서 종류)는 이 문서에서 뺐다 — BMP390이든 strain gauge든 클라이언트는 정규화된 `pressure` 값만 받으므로, 이건 API 계약이 아니라 임베디드 하드웨어(BOM) 결정이다.

## 참고

- 앱이 기대하는 값(필드별 화면 사용처): [`scooter-app/docs/interface.md`](scooter-app/docs/interface.md)
- 원 결정 문서: [`planning/decisions.md`](planning/decisions.md)
- 문서 작성 원칙 출처: [Cobinding Tech Blog — API 명세서 작성 가이드라인](https://cobinding.tistory.com/165)
