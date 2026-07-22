const KOREAN_DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const KOREAN_MONTH_DAY_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
});

function kstMidnight(date) {
  return new Date(`${date}T00:00:00+09:00`);
}

export function formatKoreanDate(date) {
  return KOREAN_DATE_FORMATTER.format(kstMidnight(date));
}

export function formatKoreanMonthDay(date) {
  return KOREAN_MONTH_DAY_FORMATTER.format(kstMidnight(date));
}
