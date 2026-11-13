import { ImageResponse } from "next/og";

/** Square app icon: a coriander leaf stamped on paper. */
export function appIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#17331f",
        }}
      >
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 100 100" fill="none" stroke="#8cc63f" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M50 96V58" />
          <path d="M50 60c-9 1-17-2-22-8-6 2-12-2-12-9s6-10 10-9c-3-6 1-13 8-13 3 0 6 2 7 4 1-7 5-12 9-12s8 5 9 12c1-2 4-4 7-4 7 0 11 7 8 13 4-1 10 2 10 9s-6 11-12 9c-5 6-13 9-22 8Z" fill="#2f7a3e" />
          <path d="M50 58V26M50 46l-14-10M50 46l14-10" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
