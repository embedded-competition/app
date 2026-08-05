// 통계 탭용 날짜별 목데이터. 실 서버의 "날짜별 센서값 조회"(api-spec.md — 시간당 1개 ×
// 센서 4종, 이상 기록 포함)를 흉내낸다. 날짜 문자열을 시드로 결정적인 값을 만들어서
// 같은 날짜를 다시 조회해도 항상 같은 그래프가 나오게 한다 — 매번 랜덤이면 화면 확인할 때마다
// 값이 바뀌어서 디버깅하기 어렵다.
export interface HourlySample {
  hour: string; // "00:00".."23:00"
  gasDevZ: number;
  h2Mv: number;
  coMv: number;
  presDev: number;
}

export interface DailyHistoryEvent {
  time: string;
  description: string;
}

export interface DailyHistory {
  date: string; // YYYY-MM-DD
  samples: HourlySample[];
  events: DailyHistoryEvent[];
}

function seedFromDate(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) h = (h * 31 + date.charCodeAt(i)) >>> 0;
  return h;
}

function pseudoRandom(seed: number, i: number): number {
  return ((seed + i * 97) % 100) / 100;
}

export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getDailyHistory(date: string): DailyHistory {
  const seed = seedFromDate(date);

  const samples: HourlySample[] = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, "0")}:00`,
    gasDevZ: Math.round((0.2 + pseudoRandom(seed, hour) * 0.6) * 10) / 10,
    h2Mv: Math.round(2220 + pseudoRandom(seed, hour + 24) * 30),
    coMv: Math.round(405 + pseudoRandom(seed, hour + 48) * 15),
    presDev: 0,
  }));

  // 데모용: 오늘 날짜에만 이상 기록 하나를 끼워 넣는다.
  const isToday = date === toDateString(new Date());
  const events: DailyHistoryEvent[] = isToday
    ? [{ time: "14:32", description: "정상 → 주의 전환" }]
    : [];

  return { date, samples, events };
}

export function hasAnomaly(history: DailyHistory): boolean {
  return history.events.length > 0;
}
