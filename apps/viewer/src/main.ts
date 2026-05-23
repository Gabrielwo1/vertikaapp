import type { ViewerParams } from "@/types";
import { App } from "@/app";

// ---------------------------------------------------------------------------
// URL parsing helpers
// ---------------------------------------------------------------------------

/**
 * Extracts tourId from either:
 *  - pathname: /tour/:tourId[/...]
 *  - query param: ?tour=:tourId
 */
function parseTourId(): string | null {
  const { pathname, searchParams } = new URL(window.location.href);

  const pathMatch = /^\/tour\/([^/]+)/.exec(pathname);
  if (pathMatch !== null) {
    return pathMatch[1] ?? null;
  }

  return searchParams.get("tour");
}

function buildViewerParams(): ViewerParams | null {
  const searchParams = new URL(window.location.href).searchParams;

  const tourId = parseTourId();
  if (tourId === null || tourId.length === 0) {
    return null;
  }

  const isPreview = searchParams.get("preview") === "1";
  const params: ViewerParams = { tourId, isPreview };

  const settingsUrl = searchParams.get("settings");
  const contentUrl = searchParams.get("content");
  const collisionUrl = searchParams.get("collision");
  const posterUrl = searchParams.get("poster");

  if (settingsUrl !== null) params.settingsUrl = settingsUrl;
  if (contentUrl !== null) params.contentUrl = contentUrl;
  if (collisionUrl !== null) params.collisionUrl = collisionUrl;
  if (posterUrl !== null) params.posterUrl = posterUrl;

  return params;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

(async () => {
  const params = buildViewerParams();

  if (params === null) {
    const app = document.getElementById("app");
    if (app !== null) {
      app.innerHTML = `
        <div style="
          display:flex; align-items:center; justify-content:center;
          height:100%; color:#f87171; font-family:system-ui,sans-serif; font-size:16px;
          flex-direction:column; gap:12px;
        ">
          <p>Tour não encontrado.</p>
          <p style="font-size:13px; color:rgba(255,255,255,0.4);">
            Verifique o link e tente novamente.
          </p>
        </div>`;
    }
    return;
  }

  const viewer = new App(params);

  try {
    await viewer.init();
  } catch (error) {
    console.error("[viewer] Falha ao inicializar o visualizador:", error);
  }
})();
