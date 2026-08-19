# 진행 상황 (앱 파트)

**최종 갱신: 2026-08-05.** 앱 개발자·서버 개발자·임베디드 개발자가 같이 보는 상태판. 자세한 근거는 [`CLAUDE.md`](CLAUDE.md)(코드 작업 기준)·[`api-spec.md`](api-spec.md)(서버 API)·[`scooter-app/docs/interface.md`](scooter-app/docs/interface.md)(앱-서버 데이터 계약) 참고 — 여기는 그걸 한눈에 보는 요약.

## 한 줄 요약

**서버(Orca Backend)는 실제로 있지만 앱은 아직 안 붙었다.** 앱 화면·플로우는 전부 만들어져 있고 목데이터로 돌아간다. 백엔드가 2026-08-12에 한 번 더 크게 개편돼서(엔드포인트·상태 모델·인증 전부 변경) `api-spec.md`는 구버전 — 최신 대조는 [`scooter-app/docs/interface.md`](scooter-app/docs/interface.md) §2·§3·§6, 백엔드팀에 확인 요청한 것은 [`backend-requests.md`](backend-requests.md)(gitignore, 내부용).

## 화면별 상태

| 화면 | 상태 | 비고 |
|---|---|---|
| 기기 등록(페어링) | ✅ 완료 | 맥주소 입력 → 로컬 저장. **2026-08-12 확인: 실제 서버엔 등록 엔드포인트·인증(deviceToken)이 아예 없다** — 지금의 로컬 저장 방식이 임시 스텁이 아니라 최종 형태에 가까울 수 있음(interface.md §6). `managementPhone` 소스는 아직 서버팀 확인 중. 2026-08-19: 개발용 우회 코드("0000") 삭제 — 실제 사용자 흐름과 동일하게 진짜 맥주소만 등록됨 |
| 실시간(지도·상태·채널) | ✅ 완료(목데이터) | 지도는 아직 폰 GPS로 대체 중 — 서버가 GPS 좌표 주기 시작하면 전환 필요 |
| 항목 상세 | ✅ 완료(목데이터) | |
| 경보 화면 | ✅ 완료 | 119/관리실 전화 연결됨(관리실 번호는 기기 등록 시 서버가 내려준 값, 하드코딩 아님), 해제 요청 버튼 있음(서버 없어서 항상 실패 응답) |
| 기록 탭 | ✅ 완료(목데이터) | 통계 탭에서 날짜 넘어오면 그 날짜만 필터링 |
| 통계 탭 | ✅ 완료(목데이터) | 날짜 이동/달력, 이상유무 요약, 센서별 일별 그래프, "이 날짜 기록 보기" |
| 설정 탭 | ✅ 완료 | 기기 등록 변경, 테마, 경보 해제 요청 |
| 다크모드 | ✅ 완료 | 시스템/라이트/다크 설정 가능 |
| 네이버 지도 SDK | ✅ 연동 완료 | dev-client 빌드로 확인 가능(Expo Go 불가) |
| 푸시 알림 | 🟡 설계만 완료 | 앱에 토큰 등록 화면·API 호출 아직 구현 안 함 |

## 확정된 결정 (더 이상 논의 불필요)

| 항목 | 결정 |
|---|---|
| 위치 소스 (O1) | GPS — 임베디드 모듈이 직접 측정해서 전송 |
| 판단 근거 (O2) | 서버가 raw 데이터로 계산해서 제공 (노드가 계산 안 함) |
| 기기 관리 (O4) | 단일 기기 (1계정=1기기), 다중 기기 지원 없음 |
| 탭 구성 (O5) | 4탭 확정(실시간·기록·통계·설정), 통계 탭 내용도 확정 |
| 압력 센서 종류 (O9) | 임베디드 하드웨어 결정 — 앱/API와 무관 |
| 경보 해제 (O8) | 앱은 요청만 보냄, 승인(권한 판단)은 서버 내부 규칙 |
| 인증 | 로그인 없음 — 2026-08-12 확인: `deviceToken` 발급 절차 자체가 없어짐. 맥주소만으로 URL 경로에서 바로 조회(`securitySchemes` 비어있음). 접근 제어를 서버가 따로 하는지는 확인 요청 중(backend-requests.md §2.1) |
| 서버 통신 방식 | HTTP 요청 폴링만 (WebSocket/SSE 안 씀) |

## 아직 안 정해진 것

- 게이트웨이(임베디드) 쪽 인증 방식 — 앱 인증과 별개, 아직 미정
- 푸시 알림 인프라(Expo Push) 서버 연동 시점
- 오경보 차단 기록 노출 여부(O3)

## 서버 팀이 봐야 할 것

1. [`api-spec.md`](api-spec.md)는 **구버전**(2026-08-12 개편 전 스펙) — 지금은 실제 배포된 스펙(`https://api.agenthub.work/openapi.json`)이 기준. 앱 쪽 최신 대조는 [`scooter-app/docs/interface.md`](scooter-app/docs/interface.md) §2·§3
2. 확인·요청 사항은 [`backend-requests.md`](backend-requests.md)(레포 최상위, gitignore돼서 직접 전달 필요) — 모듈 상태 API 중 "센서 점검"(`GET /v1/devices/{mac}`)은 2026-08-19에 추가돼서 앱에도 연결 완료, 배터리·RSSI 등 나머지는 아직 대기. 그 외(fleet 비교·실시간 온습도·managementPhone·status/stage 매핑 등)도 회신 대기

## 임베디드 팀이 봐야 할 것

1. 전송 포맷이 이 문서 체인(api-spec.md §2 수집 스키마)의 선행 블로커 — 포맷 확정되면 api-spec.md·`scooter-app/types/telemetry.ts` 갱신
2. GPS 좌표를 페이로드에 포함해서 보내야 함(O1 확정)

## 다음에 할 일 (앱 쪽)

- [x] `types/telemetry.ts`를 2026-08-12 실제 스펙 기준으로 재작성, `services/deriveAppState.ts`(서버 status/stage/conditions → 화면 AppState 매핑) 추가 — 단 아직 어디서도 호출 안 함
- [ ] `services/telemetrySource.ts`에 실제 HTTP 폴링 구현체 추가(`GET /v1/devices/{mac}/telemetry/current` 반복 호출 + `deriveAppState()` 연결)
- [ ] `DeviceMap.tsx`를 폰 GPS 추종 → 서버가 준 좌표(`GET /v1/devices/{mac}/location`) 기반으로 전환 (서버 연동 후)
- [ ] 푸시 토큰 등록 훅(`hooks/usePushNotifications.ts`)은 만들어뒀지만 `services/pushToken.ts`는 아직 실제 HTTP 호출 없음(`POST /v1/devices/{mac}/push-token`)
- [x] `services/alarmRelease.ts`를 실제 HTTP 구현체(`POST /v1/devices/{mac}/alarm/release`)로 교체 완료
- [x] `services/telemetrySource.ts`(실시간 상태 5초 폴링)·`services/events.ts`(기록) 실 API 연동 완료 — `app/_layout.tsx`의 `TelemetryBridge`가 페어링된 맥주소로 자동 폴링
- [ ] **⚠️ 웹 배포(Oracle 서버)에서 실 API 호출이 CORS로 막힘** — 백엔드가 `Access-Control-Allow-Origin` 헤더를 안 줘서 브라우저가 응답을 차단함(curl로는 정상 응답 확인됨, 브라우저 fetch만 막힘). 네이티브 앱(dev-client/preview APK)은 영향 없음. `backend-requests.md`에 요청 추가함
- [ ] `DeviceMap.tsx`를 폰 GPS 추종 → 서버 좌표(`GET /v1/devices/{mac}/location`) 기반으로 전환 — 아직 안 함(구조 변경 필요, 사용자 확인 대기)
- [x] 센서 점검(`GET /v1/devices/{mac}`) 실 API 연동 완료 — 앱 최초의 실 HTTP 호출(`services/sensorCheck.ts`+`hooks/useSensorCheck.ts`)
- [ ] 모듈 상태 중 배터리·RSSI·SNR은 여전히 API 없어서 `SettingsPanel`에 목데이터로 남음 — 추가되면 연동
