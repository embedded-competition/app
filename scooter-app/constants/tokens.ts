// 디자인 토큰. planning/prototypes/b-live-monitor.html(B안 채택본)의 CSS 커스텀 프로퍼티를 그대로 이식.
// raw hex를 화면 코드에 직접 쓰지 말고 항상 이 토큰을 통해서만 참조한다 (U1~U6 결정 원칙).
export interface ColorTokens {
  bgNormal: string;
  bgAlt: string;
  bgElev: string;
  labelStrong: string;
  labelNormal: string;
  labelNeutral: string;
  labelAlt: string;
  labelAssist: string;
  lineNormal: string;
  lineWeak: string;
  lineSolid: string;
  fillNormal: string;
  fillAlt: string;
  fillStrong: string;
  primary: string;
  primaryStrong: string;
  positive: string;
  cautionary: string;
  negative: string;
  accGreen: string;
  accOrange: string;
  accRed: string;
  accCyan: string;
}

export const colors: Record<"light" | "dark", ColorTokens> = {
  light: {
    bgNormal: "#ffffff",
    bgAlt: "#f7f7f8",
    bgElev: "#ffffff",
    labelStrong: "#000000",
    labelNormal: "#171719",
    labelNeutral: "#2e2f33e0",
    labelAlt: "#37383c9c",
    labelAssist: "#37383c47",
    lineNormal: "#70737c38",
    lineWeak: "#70737c14",
    lineSolid: "#e1e2e4",
    fillNormal: "#70737c14",
    fillAlt: "#70737c0d",
    fillStrong: "#70737c29",
    primary: "#0066ff",
    primaryStrong: "#005eeb",
    positive: "#00bf40",
    cautionary: "#ff9200",
    negative: "#ff4242",
    accGreen: "#009632",
    accOrange: "#d17600",
    accRed: "#e52222",
    accCyan: "#0098b2",
  },
  dark: {
    bgNormal: "#1b1c1e",
    bgAlt: "#0f0f10",
    bgElev: "#212225",
    labelStrong: "#ffffff",
    labelNormal: "#f7f7f8",
    labelNeutral: "#c2c4c8e0",
    labelAlt: "#aeb0b69c",
    labelAssist: "#aeb0b647",
    lineNormal: "#70737c52",
    lineWeak: "#70737c38",
    lineSolid: "#37383c",
    fillNormal: "#70737c38",
    fillAlt: "#70737c1f",
    fillStrong: "#70737c47",
    primary: "#3385ff",
    primaryStrong: "#1a75ff",
    positive: "#1ed45a",
    cautionary: "#ffa938",
    negative: "#ff6363",
    accGreen: "#1ed45a",
    accOrange: "#ff9200",
    accRed: "#ff6363",
    accCyan: "#00bdde",
  },
};

export type ColorScheme = keyof typeof colors;

export const radius = { s: 12, m: 14, l: 16, xl: 20 } as const;

// 경보 명멸 연출 (U2). prefers-reduced-motion 사용자는 고정 톤으로 대체할 것.
export const alarmPulse = {
  ALARM: { periodMs: 1050, minOpacity: 0.12, maxOpacity: 0.9 },
  WATCH: { periodMs: 2600, minOpacity: 0.06, maxOpacity: 0.42 },
} as const;
