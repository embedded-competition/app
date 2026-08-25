// "마지막 수신 N초 전" 같은 상대 시간 표시 — alarm.tsx·app/index.tsx가 같이 쓴다.
export function formatAgo(iso: string | null): string {
  if (!iso) return "확인 중";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}초 전`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  return `${Math.floor(seconds / 3600)}시간 전`;
}
