import { ImageResponse } from "next/og";

/** Renders the PersoDash mark as a PNG app icon (PWA, home screen). */
export function renderAppIcon(size: number) {
  // Mark occupies the inner ~45% so it survives maskable-icon cropping.
  const mark = Math.round(size * 0.45);
  const stroke = Math.max(2, Math.round(size * 0.028));
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, background: "#0b0c0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={mark} height={mark} viewBox="0 0 16 16" fill="none">
          <path d="M1.5 6V1.5H6M14.5 10v4.5H10" stroke="#e7e7e5" strokeWidth={(stroke / mark) * 16} strokeLinecap="square" />
          <rect x="7" y="7" width="2" height="2" fill="#e7e7e5" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
