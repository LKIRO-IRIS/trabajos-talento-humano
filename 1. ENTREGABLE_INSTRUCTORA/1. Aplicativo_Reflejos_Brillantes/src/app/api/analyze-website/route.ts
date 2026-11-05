import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AnalyzeResponse {
  name: string;
  tagline: string;
  logo: string; // data URL or ""
  primaryColor: string; // hex with #
  accentColor: string; // hex with #
}

interface AnalyzeError {
  error: string;
}

const UA =
  "Mozilla/5.0 (compatible; TH-Analyzer/1.0; +https://sigth.local/analyze-website)";

function complementaryHex(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return "#92D050";
  const num = parseInt(m[1], 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  // RGB → HSL
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  // Rotate 180° for complementary
  h = (h + 180) % 360;
  // HSL → RGB
  const c = (1 - Math.abs(2 * l - 1)) * d;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m2 = l - c / 2;
  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const rr = Math.round((r1 + m2) * 255);
  const gg = Math.round((g1 + m2) * 255);
  const bb = Math.round((b1 + m2) * 255);
  return (
    "#" +
    [rr, gg, bb].map((c) => c.toString(16).padStart(2, "0")).join("")
  );
}

function getMeta(html: string, prop: string): string | null {
  // Soporta <meta property="og:..." content="..."> y <meta name="..." content="...">
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<AnalyzeResponse | AnalyzeError>> {
  try {
    const body = await req.json().catch(() => null);
    const url: unknown =
      body && typeof body === "object"
        ? (body as { url?: unknown }).url
        : undefined;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL requerida" }, { status: 400 });
    }
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json(
        { error: "La URL debe comenzar con http:// o https://" },
        { status: 400 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,*/*" },
        redirect: "follow",
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeout);
      throw new Error(
        `No se pudo acceder al sitio: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    clearTimeout(timeout);
    if (!res.ok) {
      return NextResponse.json(
        { error: `No se pudo acceder al sitio (HTTP ${res.status})` },
        { status: 502 },
      );
    }
    const html = await res.text();
    if (!html || html.length < 50) {
      return NextResponse.json(
        { error: "La página está vacía o no se pudo leer su contenido." },
        { status: 422 },
      );
    }

    // Título y descripción
    const ogTitle = getMeta(html, "og:title");
    const ogSiteName = getMeta(html, "og:site_name");
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const name =
      (ogTitle || "").trim() ||
      (ogSiteName || "").trim() ||
      (titleTag ? titleTag[1].trim() : "");
    if (!name) {
      return NextResponse.json(
        { error: "No se pudo extraer el nombre de la empresa desde la página." },
        { status: 422 },
      );
    }
    const description =
      (getMeta(html, "og:description") || "").trim() ||
      (getMeta(html, "description") || "").trim();

    // Logo
    let logoUrl: string | null =
      getMeta(html, "og:image") || getMeta(html, "og:logo");
    if (!logoUrl) {
      const linkIcon = html.match(
        /<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i,
      );
      if (linkIcon) logoUrl = linkIcon[1];
    }
    if (!logoUrl) {
      const favicon = html.match(
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:icon|shortcut icon)["']/i,
      );
      if (favicon) logoUrl = favicon[1];
    }

    // Descarga el logo y extrae color dominante
    let logoDataUrl = "";
    let primaryColor = "#2C3E50";
    if (logoUrl) {
      try {
        const absoluteUrl = new URL(logoUrl, url).href;
        const imgController = new AbortController();
        const imgTimeout = setTimeout(() => imgController.abort(), 15000);
        const imgRes = await fetch(absoluteUrl, {
          headers: { "User-Agent": UA, Accept: "image/*,*/*" },
          redirect: "follow",
          signal: imgController.signal,
        });
        clearTimeout(imgTimeout);
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer());
          if (buf.length > 0 && buf.length < 1_500_000) {
            const mime = imgRes.headers.get("content-type") || "image/png";
            logoDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
            try {
              const { data, info } = await sharp(buf)
                .resize(60, 60, { fit: "cover" })
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });
              const colorCount: Record<string, number> = {};
              for (let i = 0; i < data.length; i += info.channels) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = info.channels >= 4 ? data[i + 3] : 255;
                if (a < 32) continue; // transparente
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                if (max - min < 30) continue; // gris
                if (r > 240 && g > 240 && b > 240) continue; // blanco
                if (r < 30 && g < 30 && b < 30) continue; // negro
                const rq = Math.round(r / 16) * 16;
                const gq = Math.round(g / 16) * 16;
                const bq = Math.round(b / 16) * 16;
                const key = `${rq},${gq},${bq}`;
                colorCount[key] = (colorCount[key] || 0) + 1;
              }
              const sorted = Object.entries(colorCount).sort(
                (a, b) => b[1] - a[1],
              );
              if (sorted[0]) {
                const [r, g, b] = sorted[0][0]
                  .split(",")
                  .map((n) => Number(n));
                primaryColor = `#${r
                  .toString(16)
                  .padStart(2, "0")}${g
                  .toString(16)
                  .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
              }
            } catch (err) {
              console.warn(
                "sharp falló al analizar el logo:",
                err instanceof Error ? err.message : err,
              );
            }
          }
        }
      } catch (err) {
        console.warn(
          "fetch del logo falló:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    const accentColor = complementaryHex(primaryColor);

    const response: AnalyzeResponse = {
      name,
      tagline: description,
      logo: logoDataUrl,
      primaryColor,
      accentColor,
    };
    return NextResponse.json(response);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
