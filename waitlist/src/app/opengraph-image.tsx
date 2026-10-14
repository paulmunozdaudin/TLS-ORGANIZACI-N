import { ImageResponse } from "next/og";
import { BRAND } from "@/config/site";
import { hero } from "@/content/landing";

export const alt = `${BRAND}: ${hero.title.join(" ")}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f7f5ef",
          color: "#1d1b17",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, width: 760 }}>
          <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>{BRAND}</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 92, fontWeight: 600, letterSpacing: -4, lineHeight: 1 }}>
            {hero.title.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
          <div style={{ fontSize: 28, color: "#5d594f" }}>Lista de espera abierta</div>
        </div>
        <div style={{ display: "flex", flex: 1, background: "#3f4a26" }} />
      </div>
    ),
    size,
  );
}
