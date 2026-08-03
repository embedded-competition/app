@AGENTS.md

# scooter-app

전동킥보드 배터리 **off-gas 조기경보 시스템**의 앱 파트 (Expo Router / React Native).
임베디드 노드가 배터리 캐비티의 가스 농도 변화를 감지해 화재를 사전에 알리고, 이 앱은 그 상태를 사용자에게 보여주고 스마트플러그 전원차단 등 대응을 다룬다.

기획 전체 맥락(의사결정 근거·프로토타입·용어 원칙)은 별도 레포에 있다: `../../planning` (= https://embedded-competition.github.io/planning/). **화면·데이터 관련 결정을 바꾸기 전에 반드시 그 레포의 `decisions.md`와 `decisions/app-ux.md`를 먼저 확인할 것.** 여기 CLAUDE.md는 그 내용을 앱 코드 작업에 필요한 만큼만 요약한 것이지 원본이 아니다.

**화면 코드는 [`planning/prototypes/b-live-monitor.html`](../../planning/prototypes/b-live-monitor.html)(B안 채택본)을 1:1로 옮긴 것이다.** 레이아웃·문구·수치·색을 임의로 바꾸지 말고, 바꿔야 하면 프로토타입 HTML도 같이 고치거나 왜 갈라지는지 여기 적어둘 것.

## 지금 상태 (2026-08-03 기준)

- 임베디드 전송 데이터 구조가 **아직 확정 전** — 이게 앱 필드·서버 스키마의 선행 블로커([C4](../../planning/decisions/collaboration.md#c4)). 그래서 지금 화면은 `mocks/channels.ts`의 목데이터로만 돌아간다.
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
  _layout.tsx                루트 Stack: (tabs) + detail/[channel] + alarm(fullScreenModal)
  (tabs)/
    _layout.tsx               하단 탭: 실시간·기록·통계·설정 (4탭, 프로토타입 그대로 — O5 참고)
    index.tsx                 실시간 — 지도 → 상태 리본 → 채널 카드 그리드 → 모듈 상태
    record.tsx                기록 — 요약 카드 + 이벤트 리스트
    stats.tsx                  통계 — 미설계 안내만 (O5)
    settings.tsx               설정 — 알림/자동차단/위치등록/경보해제/모듈상태
  detail/[channel].tsx        항목 상세 — 판정 → 요약 → 설명 → 게이지 → 추이 → 판단근거 → 비교 → 원본수치(접이식)
  alarm.tsx                   경보 전체화면

components/                 화면 조립용 UI 블록. 화면(app/)에서 콘텐츠를 받아 그리기만 한다
  badges/LiveBadge.tsx        상단 LIVE 펄스 배지
  dev/DevStateToggle.tsx      정상/주의/경보 전환 — 서버 없는 지금만 쓰는 개발용, 실 연동 후 삭제
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
hooks/useAppState.ts        정상/주의/경보 상태 하나를 실시간·상세·경보 화면이 공유하는 경계
```

**원칙**:
- 화면(`app/`)은 `mocks/channels.ts`의 콘텐츠를 컴포넌트에 넘기기만 하고, 판정 로직(임계값 계산 등)은 절대 클라이언트에 두지 않는다 — 판정은 노드/서버 책임([A1](../../planning/decisions/algorithm.md#a1), [C5](../../planning/decisions/collaboration.md#c5)).
- 항목 상세 화면의 게이지·차트·판단근거·비교 섹션은 **채널별이 아니라 상태(정상/주의/경보) 단위** 공통 콘텐츠다 — 프로토타입도 배터리 가스(voc) 채널 하나만 실제로 디자인했고 나머지 채널은 이름·설명·각주만 다르다. 이 구조를 임의로 채널별로 쪼개지 말 것.

## 데이터 흐름과 목데이터

서버가 아직 없다(C4). 지금 데이터 원천은 두 갈래다.

- **`mocks/channels.ts`** — 지금 화면을 실제로 그리는 데이터. 프로토타입 HTML의 `CH`(6채널)·`ST`(상태별 리본/게이지/차트/판단근거 문구)를 그대로 옮겼다. `hooks/useAppState.ts`가 정상/주의/경보 중 하나를 들고 있고, 화면은 `STATE_CONTENT[state]`·`CHANNELS[i].states[state]`를 읽어서 그린다.
- **`types/telemetry.ts`** — 실 서버 페이로드가 나왔을 때 쓸 참고용 스키마(§7 데이터 인벤토리 그대로 타입화). 아직 어떤 화면도 이 타입을 쓰지 않는다.

실 서버 API가 정해지면: `mocks/channels.ts`의 문구·수치 생성 로직을 서버 응답 매핑으로 교체하고(문구 자체는 C5에 따라 서버가 만들 가능성이 높다), `useAppState.ts`를 폴링/구독으로 바꾼다. 그 전까지 `DevStateToggle`(실시간 화면 최상단)로 세 상태를 직접 눌러보면 된다.

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
- **색은 항상 `constants/tokens.ts`를 통해서만**. raw hex를 화면 코드에 직접 쓰지 않는다.
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
- `@mj-studio/react-native-naver-map` + `expo-build-properties`(네이버 Maven 저장소 주입) + `expo-location`(위치 권한) — 네이티브 모듈이라 **여기부터 Expo Go 이탈, dev-client 필수**. 셋 다 `npx expo install`로 넣은 SDK 54 호환 버전.
- 설정 파일이 `app.json` → **`app.config.ts`**로 바뀌었다 (네이버 지도 Client ID를 `.env`에서 읽어야 해서). `app.json`을 다시 만들지 말 것 — 설정은 전부 `app.config.ts`에서 관리한다.
