// utils/hashrate.ts

// H/s -> kH/s -> MH/s
export const formatHashrate = (value: number): string => {
  if (value > 1_000_000) return (value / 1_000_000).toFixed(1) + " MH/s";
  if (value > 1_000) return (value / 1_000).toFixed(1) + " kH/s";
  return value.toFixed(0) + " H/s";
};

// Datumsformat "11PM", "12AM", "1AM" …
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
  });
};

export const formatDateTime = (value: string) => {
  const d = new Date(value);
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};