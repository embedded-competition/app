@AGENTS.md

# scooter-app

전동킥보드 배터리 **off-gas 조기경보 시스템**의 앱 파트 (Expo Router / React Native).
임베디드 노드가 배터리 캐비티의 가스 농도 변화를 감지해 화재를 사전에 알리고, 이 앱은 그 상태를 사용자에게 보여주고 스마트플러그 전원차단 등 대응을 다룬다.

기획 전체 맥락(의사결정 근거·프로토타입·용어 원칙)은 별도 레포에 있다: `../../planning` (= https://embedded-competition.github.io/planning/). **화면·데이터 관련 결정을 바꾸기 전에 반드시 그 레포의 `decisions.md`와 `decisions/app-ux.md`를 먼저 확인할 것.** 여기 CLAUDE.md는 그 내용을 앱 코드 작업에 필요한 만큼만 요약한 것이지 원본이 아니다.

**화면 코드는 [`planning/prototypes/b-live-monitor.html`](../../planning/prototypes/b-live-monitor.html)(B안 채택본)을 1:1로 옮긴 것이다.** 레이아웃·문구·수치·색을 임의로 바꾸지 말고, 바꿔야 하면 프로토타입 HTML도 같이 고치거나 왜 갈라지는지 여기 적어둘 것.

## 지금 상태 (2026-08-04 기준)

- 임베디드 전송 데이터 구조가 **아직 확정 전** — 이게 앱 필드·서버 스키마의 선행 블로커([C4](../../planning/decisions/collaboration.md#c4)). 그래서 지금 화면은 `mocks/channels.ts`의 목데이터로만 돌아간다.
- 앱 진입 시 **기기 등록(맥주소 페어링)이 선행 게이트**다 — 등록 전에는 탭 화면 자체가 안 뜨고 `PairingForm`만 보인다. 서버가 없어서 지금은 로컬 저장 + 무조건 성공 처리하는 스텁(`services/deviceRegistry.ts`)이다.
- 로드맵: ~8/10 1차 개발+QA(앱·서버·펌웨어) 목표. 시간 여유가 크지 않다.
- 화면 UX는 **B안으로 확정**됐지만([U1](../../planning/decisions/app-ux.md#u1)), 데이터 모델에 영향을 주는 8가지는 아직 미정이다 → 아래 "열린 결정" 참고.

## 브랜치 전략

기능 단위로 브랜치를 나눠서 작업한다 — main에 직접 커밋하지 않는다.

- 브랜치명: `feature/<짧은-기능-슬러그>` (예: `feature/app-scaffold`, `feature/naver-map`)
- 새 기능/화면/연동을 시작할 때마다 `main`(또는 아직 안 합쳐진 관련 작업 브랜치)에서 새 `feature/*` 브랜치를 판다
- 작업 단위가 끝나면 GitHub PR로 올린다 (`gh pr create`) — 이 레포는 `origin` = `https://github.com/embedded-competition/app`
- 커밋 메시지는 `feat(scope): 요약` 형태를 따른다 (예: `feat(scooter-app): ...`)

## 폴더 구조

```
app/                        expo-router 파일 기반 라우팅 (화면만, 로직은 두지 않는다)
  _layout.tsx                루트 Stack: 기기 미등록이면 PairingForm만, 등록됐으면 (tabs) + detail/[channel] + alarm + pairing
  pairing.tsx                 기기 등록/변경 (설정 탭에서 재진입용 — 최초 게이트는 _layout.tsx가 라우팅 없이 직접 띄움)
  (tabs)/
    _layout.tsx               하단 탭: 실시간·기록·통계·설정 (4탭, 프로토타입 그대로 — O5 참고)
    index.tsx                 실시간 — 지도 → 상태 리본 → 채널 카드 그리드 → 모듈 상태
    record.tsx                기록 — 요약 카드 + 이벤트 리스트
    stats.tsx                  통계 — 미설계 안내만 (O5)
    settings.tsx               설정 — 기기등록/테마/알림/자동차단/위치등록/경보해제
  detail/[channel].tsx        항목 상세 — 판정 → 요약 → 설명 → 게이지 → 추이 → 판단근거 → 비교 → 원본수치(접이식)
  alarm.tsx                   경보 전체화면

components/                 화면 조립용 UI 블록. 화면(app/)에서 콘텐츠를 받아 그리기만 한다
  badges/LiveBadge.tsx        상단 연결 상태 배지 — live(LIVE 펄스)/preview(목데이터)/offline(연결 안 됨) 3단
  dev/DevStateToggle.tsx      미리보기 중 정상/주의/경보 전환 — 서버 없는 지금만 쓰는 개발용, 실 연동 후 삭제
  dev/NoDataState.tsx         state===null(연결된 기기 없음)일 때 보여주는 빈 화면 + 미리보기 진입 버튼
  pairing/PairingForm.tsx     맥주소 입력 폼. 최초 게이트와 설정 탭 재등록 화면이 같이 씀
  map/DeviceMap.tsx           네이버 지도(NaverMapView) + 위치 추적(Follow) + 주소 오버레이 — 네이티브 전용
  map/DeviceMap.web.tsx       웹 전용 폴백. SVG 개략도 지도 + 핀 halo 펄스 (Metro가 웹 빌드에서 자동으로 이 파일을 씀)
  ribbon/StatusRibbon.tsx     상태 문구 + 위험도 바(그라데이션+커서) + 5단 스테퍼
  channel/ChannelCard.tsx     실시간 화면의 원형 링 배지 카드
  channel/ChannelGauge.tsx    평소/주의/위험 게이지(트랙+노브+말풍선)
  channel/RawValuesDisclosure.tsx  "센서 원본 수치 보기" 접이식
  chart/TrendChart.tsx        최근 1분 추이 (영역+선+점선 기준선, react-native-svg)
  detail/SignatureRow.tsx     판단 근거 3요소(급변/지속/무회복) 박스
  detail/CompareRow.tsx       같은 모델 비교 2열 박스
  alarm/AlarmPulseOverlay.tsx  경보 화면 상하 명멸 그라데이션
  common/RichText.tsx         `**볼드**` 마크만 지원하는 최소 리치텍스트 (프로토타입 <b> 이식용)

constants/tokens.ts         디자인 토큰(색·radius·경보 명멸 주기). b-live-monitor.html의 CSS 변수를 그대로 이식
types/telemetry.ts          실 서버 페이로드가 정해졌을 때를 위한 참고용 타입(§7 데이터 인벤토리). 아직 화면에서 안 씀
mocks/channels.ts           화면을 실제로 그리는 데이터 원천 — 6개 채널 × normal/watch/alarm 3상태 콘텐츠, 프로토타입 JS(CH·ST)를 그대로 이식
services/telemetrySource.ts  앱이 서버로부터 상태를 "받는" 경계. 지금은 아무 것도 보내지 않는 기본 구현만 있음
services/deviceRegistry.ts   기기 등록(맥주소 페어링)의 서버 경계. MAC 정규화(normalizeMac)와 개발용 우회 코드(DEV_BYPASS_CODE="0000", `__DEV__`로 감싸져 있어 프로덕션엔 안 남음)도 여기 있음. 지금은 로컬 저장만 하고 무조건 성공 처리하는 스텁
contexts/AppStateContext.tsx  telemetrySource를 구독해서 앱 전체가 공유하는 상태 하나(`AppState | null`). null = 분류할 데이터 없음 — "정상"으로 기본값을 깔지 않는다. 실 데이터가 없을 때만 DevStateToggle 로컬 오버라이드를 씀 (isLive로 구분) — 예전엔 화면마다 useState로 따로 들고 있어서 화면 간 상태가 안 맞는 버그가 있었다
contexts/DeviceContext.tsx   페어링된 기기(맥주소) 하나. null이면 app/_layout.tsx가 탭 화면 대신 PairingForm을 띄운다 — 텔레메트리보다 앞선 게이트
contexts/ThemeModeContext.tsx  테마 설정(시스템/라이트/다크). AsyncStorage에 저장, `useScheme()`이 실제 적용될 라이트/다크 값을 돌려준다
docs/interface.md           앱 ↔ 서버 인터페이스 명세 (서버·임베디드 팀 전달용) — 필드별 상태·화면 사용처, 기기 등록 API 계약 정리
```

**원칙**:
- 화면(`app/`)은 `mocks/channels.ts`의 콘텐츠를 컴포넌트에 넘기기만 하고, 판정 로직(임계값 계산 등)은 절대 클라이언트에 두지 않는다 — 판정은 노드/서버 책임([A1](../../planning/decisions/algorithm.md#a1), [C5](../../planning/decisions/collaboration.md#c5)). 상태는 항상 `services/telemetrySource.ts`를 통해서만 "받고", 클라이언트가 raw 값으로 계산하지 않는다.
- 항목 상세 화면의 게이지·차트·판단근거·비교 섹션은 **채널별이 아니라 상태(정상/주의/경보) 단위** 공통 콘텐츠다 — 프로토타입도 배터리 가스(voc) 채널 하나만 실제로 디자인했고 나머지 채널은 이름·설명·각주만 다르다. 이 구조를 임의로 채널별로 쪼개지 말 것.
- 서버 연동 계약(필드별 상태·화면 사용처·문구 생성 책임 문제)은 [`docs/interface.md`](docs/interface.md)에 따로 정리했다 — 서버/임베디드 팀과 논의할 때는 이 문서를 기준으로 한다.

## 데이터 흐름과 목데이터

서버가 아직 없다(C4). 지금 데이터 원천은 세 갈래다.

- **`services/telemetrySource.ts`** — 앱이 상태를 "받는" 유일한 경계(`TelemetrySource.subscribe`). 지금은 `noTelemetrySource`(아무 것도 방출 안 함)만 있다. `contexts/AppStateContext.tsx`가 이걸 구독해서 **앱 전체가 공유하는** 상태 하나(`AppState | null`)를 만든다.
  - `state === null` — 데이터도 없고 미리보기도 안 고른 상태. 화면은 `NoDataState`("연결된 기기가 없어요" + 미리보기 버튼)를 보여줘야 한다. **절대 "정상"을 기본값으로 깔지 말 것** — 분류 안 된 걸 정상 판정처럼 보여주면 안 된다.
  - `state !== null && !isLive` — 개발자가 `NoDataState`/`DevStateToggle`로 미리보기를 고른 상태. `LiveBadge status="preview"`("목데이터")로 정직하게 표시.
  - `isLive === true` — 실 데이터. `LiveBadge status="live"`.

  **새 화면에서 상태를 쓸 땐 항상 `useAppState()`(from `@/contexts/AppStateContext`)를 쓰고, `state`가 `null`일 수 있다는 걸 화면 진입점에서 먼저 처리할 것** — 화면마다 따로 로컬 상태를 만들거나 `STATE_CONTENT[state]`를 null 체크 없이 바로 인덱싱하지 말 것.
- **`mocks/channels.ts`** — 지금 화면을 실제로 그리는 콘텐츠. 프로토타입 HTML의 `CH`(6채널)·`ST`(상태별 리본/게이지/차트/판단근거 문구)를 그대로 옮겼다. 화면은 `STATE_CONTENT[state]`·`CHANNELS[i].states[state]`를 읽어서 그린다.
- **`types/telemetry.ts`** — 실 서버 페이로드가 나왔을 때 쓸 참고용 스키마(§7 데이터 인벤토리 그대로 타입화). 아직 어떤 화면도 이 타입을 쓰지 않는다.

실 서버 API가 정해지면 [`docs/interface.md`](docs/interface.md)의 계약대로: `telemetrySource.ts`에 실제 구현체(REST/WebSocket)를 추가하고, `mocks/channels.ts`의 문구·수치 생성 로직을 서버 응답 매핑으로 교체한다(문구 자체를 서버가 내려줄지는 interface.md §3.1 참고 — 아직 미정).

## 지도 설정 (네이버 지도 SDK)

`@mj-studio/react-native-naver-map`을 쓴다. 킥보드를 타고 이동하면 카메라가 실시간으로 따라가야 해서
정적 지도 이미지 API 대신 네이티브 SDK로 갔다 — 다만 이건 **폰 자체 GPS를 킥보드 위치의 대역으로 쓰는 것**이다.
실제로는 킥보드에 탑재된 모듈의 GPS/게이트웨이 위치를 서버가 내려줘야 하는데 그 방식 자체가 O1 미확정이라,
O1이 정해지면 `DeviceMap.tsx`를 서버가 준 좌표 기반 `camera`(controlled prop)로 바꿔야 한다.

**네이티브 모듈이라 Expo Go로는 안 뜬다.** 아래 순서로 dev-client 빌드가 먼저 필요하다.

1. 네이버 클라우드 플랫폼에서 AI·NAVER API(Maps) Client ID 발급 — Application 등록 시 iOS Bundle ID / Android Package Name을 실제 값과 정확히 맞춰야 한다
2. `scooter-app/.env.example`을 `.env`로 복사하고 `NAVER_MAP_CLIENT_ID`에 발급받은 값을 채운다 (`.env`는 gitignore됨 — 커밋 금지)
3. `npx expo prebuild` — 네이티브 `ios/`·`android/` 프로젝트 생성 (Client ID는 `app.config.ts`의 config plugin이 자동으로 심어줌)
4. `npx expo run:ios` / `npx expo run:android` (로컬 빌드) 또는 `eas build --profile development` (클라우드 빌드)
5. 이후 개발 서버는 `npx expo start --dev-client`로 띄운다 — 이 시점부터 `npm run web` 말고 이 명령을 쓸 것

웹(`npm run web`)에서는 `DeviceMap.web.tsx`(SVG 플레이스홀더)가 대신 뜬다 — 지도 자체를 확인하려면 반드시 실기기/시뮬레이터 dev-client 빌드가 필요하다.

## 앱·UX 핵심 원칙 (어길 때 반드시 이유가 있어야 함)

- **전문용어 금지**([U3](../../planning/decisions/app-ux.md#u3)). 아래 용어표 밖의 말(VOC, z-score, ppm 등)을 사용자 화면에 그대로 노출하지 않는다.
- **값이 아니라 변화 속도가 우선**([U5](../../planning/decisions/app-ux.md#u5)). "26,412"가 아니라 "평소의 24배 속도". 게이지도 평소/주의/위험 3단만.
- **원본 수치는 접이식으로만**([U4](../../planning/decisions/app-ux.md#u4)). 개발·디버깅·심사 질의응답용으로 완전히 지우지는 않는다.
- **경보는 화면 전체가 명멸**([U2](../../planning/decisions/app-ux.md#u2)). ALARM 1.05초 강하게, WATCH 2.6초 은은하게. reduce-motion 사용자는 고정 톤 — 이 대응은 아직 미구현(`AlarmPulseOverlay`에 TODO로 표시).
- **상태가 ALARM으로 바뀌는 순간 자동으로 경보 화면을 띄운다** — 어느 탭에 있든 상관없이 떠야 해서 `app/_layout.tsx`(루트)에서 `state`를 감시하다가 `"alarm"`으로 처음 바뀔 때만(rising edge) `router.push("/alarm")`을 부른다. 계속 ALARM 상태라고 반복해서 밀어넣지는 않는다 — 사용자가 "닫기"로 나가면 그 상태로 둔다. `StatusRibbon`의 신고 버튼(`onReportPress`)도 danger 상태일 때 같은 화면으로 이동한다 — 리본의 버튼 색만 바뀌고 아무 동작도 없는 상태로 두지 말 것.
- **색은 항상 `constants/tokens.ts`를 통해서만**. raw hex를 화면 코드에 직접 쓰지 않는다.
- **다크모드는 설정 탭에서 시스템/라이트/다크 중 고를 수 있다** — `contexts/ThemeModeContext.tsx`(`ThemeModeProvider`)가 선택값을 AsyncStorage에 저장하고, 실제 적용될 라이트/다크 값(`ColorScheme`)을 계산한다. **화면 코드는 `react-native`의 `useColorScheme()`을 직접 쓰지 말고 항상 `useScheme()`(from `@/contexts/ThemeModeContext`)을 쓸 것** — 그래야 사용자가 고른 값이 반영된다. 탭바·헤더 같은 네비게이션 크롬은 `app/_layout.tsx`의 `ThemeProvider`가 이 값을 받아서 처리한다. `colors.light`/`colors.dark`를 하드코딩하지 말 것(예외: `alarm.tsx`처럼 배경 자체가 고정 색인 화면도 텍스트·보조색은 `useScheme()`을 따라가게 했다).
- **ALARM은 자동 해제 없음**([A7](../../planning/decisions/algorithm.md#a7)). 해제 버튼을 만들 때 "그냥 누르면 꺼지는" 동작을 넣지 말 것 — 지금은 경로 자체가 미설계라 비활성 상태로 둔다([O8](../../planning/decisions/open-questions.md#o8)).

### 용어 매핑 (화면 표기 ↔ 원래 용어)

| 화면 표기 | 원래 용어 |
|---|---|
| 배터리 가스 | 전해액 증기 (VOC · SGP40) — PRIMARY |
| 과충전 가스 | 수소 (H₂ · MQ-8) |
| 타는 가스 | 일산화탄소 (CO · MQ-7) — 센서 미도입 |
| 배터리 온도 | 팩 표면 온도 (SHT4x) — 미착수 |
| 부풀어 오름 | 팩 내압·셀 팽창 — 미착수, 킥보드에선 거의 안 움직임 |
| 물·누액 | 침수·전해액 누출 — 계획 |
| 평소의 N배 / 빠르게 늘어남 | dev(z) · slope(z/min) |
| 갑자기 늘었나 / 계속 이어지나 / 안 사라지나 | 급변 / 지속 / 무회복 |

전체 표는 [`../../planning/decisions/app-ux.md`](../../planning/decisions/app-ux.md#u3) 참고.

## 앱에 영향을 주는 열린 결정 (아직 미팅에서 안 정해짐)

지금 코드에서 임시로 어떻게 처리해뒀는지 같이 적는다. 확정되면 여기부터 고칠 것.

| # | 질문 | 지금 임시 처리 |
|---|---|---|
| [O1](../../planning/decisions/open-questions.md#o1) | 위치를 어떻게 잡나 (GPS/등록위치/게이트웨이) | `DeviceMap`이 **폰 자체 GPS**로 카메라를 추적(`setLocationTrackingMode("Follow")`) — 킥보드 모듈의 실제 위치 소스가 아니라 임시 대역. O1 확정되면 서버 좌표 기반 controlled `camera`로 교체 |
| [O2](../../planning/decisions/open-questions.md#o2) | 노드가 판단 근거(dev·slope·시그니처)를 전송할지 | 판단 근거 3요소를 `mocks/channels.ts`에 목데이터로 채워둠 — 실전송 여부에 따라 항목 상세 화면 하단 구조가 바뀔 수 있음 |
| [O4](../../planning/decisions/open-questions.md#o4) | 기기 여러 대 관리 (개인 1대 vs 관리실 다중) | `DeviceContext`가 맥주소 1개만 저장 — 계정당 기기 1:1 전제. 다중 기기로 가면 `services/deviceRegistry.ts`·`DeviceContext`를 계정↔기기 목록 구조로 바꿔야 함 |
| [O5](../../planning/decisions/open-questions.md#o5) | 하단 탭 3개 vs 4개(+통계) | 프로토타입과 동일하게 4탭 구현, `stats.tsx`는 안내 문구만. 3탭으로 확정되면 `(tabs)/_layout.tsx`·`stats.tsx` 정리 |
| [O8](../../planning/decisions/open-questions.md#o8) | 경보 해제 권한/경로 | `alarm.tsx`의 해제 버튼은 비활성 상태로만 존재 |
| [O9](../../planning/decisions/open-questions.md#o9) | 압력 채널 센서(BMP390/strain gauge) | `pres` 채널은 목데이터로만 존재, 실측 연동 없음 |

## 명령어

```
npm run start           # expo start (Expo Go 대상 — 네이버 지도 화면은 안 뜬다, DeviceMap.web.tsx만 해당 안 됨에 주의)
npm run web               # 웹으로 빠르게 확인 (지도는 DeviceMap.web.tsx 플레이스홀더로 대체됨)
npx expo start --dev-client  # 네이버 지도 포함 전체 화면 확인 — prebuild + dev-client 빌드 이후에만 가능 (위 "지도 설정" 참고)
npm run lint               # eslint (expo config)
npx tsc --noEmit           # 타입체크. app-example/ 아래 에러는 기존 템플릿 백업 폴더라 무시해도 됨
```

`app-example/`은 `expo reset-project` 스크립트가 만든 원본 템플릿 백업이다. 참고용으로만 보고 앱 코드로 쓰지 않는다 — 더 이상 필요 없다고 판단되면 지워도 된다.

## 의존성 메모

- `react-native-svg`(차트·웹 지도 폴백)와 `expo-linear-gradient`(위험도 바·경보 명멸) — 둘 다 순수 JS/네이티브 뷰라 Expo Go에서도 동작.
- `@mj-studio/react-native-naver-map` + `expo-build-properties`(네이버 Maven 저장소 주입) + `expo-location`(위치 권한) + `expo-dev-client`(dev-client 빌드용) — 네이티브 모듈이라 **여기부터 Expo Go 이탈, dev-client 필수**. `npx expo install`로 넣은 SDK 54 호환 버전.
- `@react-native-async-storage/async-storage` — 테마 설정 저장용. 웹도 자체 구현으로 지원해서 `.web.ts` 분기 없이 그대로 쓴다.
- 설정 파일이 `app.json` → **`app.config.ts`**로 바뀌었다 (네이버 지도 Client ID를 `.env`에서 읽어야 해서). `app.json`을 다시 만들지 말 것 — 설정은 전부 `app.config.ts`에서 관리한다.
