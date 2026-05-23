import type {
  ViewerParams,
  ExperienceSettings,
  DashboardMessage,
  PropertyPanelData,
} from "@/types";
import { mergeWithDefaults, applySettings } from "@/settings";
import { fireEvent } from "@/analytics";
import { loadSogFile } from "@/loader";
import { PropertyPanel } from "@/components/PropertyPanel";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE_PATH = "/api";
const READY_MESSAGE_TYPE = "VIEWER_READY";
const POSTER_FADE_DURATION_MS = 600;
const POSTER_FADE_STEPS = 20;

// ---------------------------------------------------------------------------
// PlayCanvas augmentation (minimal surface we use at runtime)
// ---------------------------------------------------------------------------

// We import PlayCanvas at runtime; a lightweight declaration is sufficient.
declare global {
  interface Window {
    pc?: {
      Application: new (
        canvas: HTMLCanvasElement,
        options: Record<string, unknown>
      ) => PcApplication;
      FILLMODE_FILL_WINDOW: string;
      RESOLUTION_AUTO: string;
    };
  }
}

interface PcApplication {
  setCanvasFillMode(mode: string): void;
  setCanvasResolution(mode: string): void;
  start(): void;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export class App {
  private readonly params: ViewerParams;
  private settings: ExperienceSettings | null = null;
  private pcApp: PcApplication | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private posterEl: HTMLElement | null = null;

  constructor(params: ViewerParams) {
    this.params = params;
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async init(): Promise<void> {
    const container = document.getElementById("app");
    if (container === null) {
      throw new Error("Elemento #app não encontrado no DOM.");
    }

    this.showPoster(container);
    await this.loadSettings();
    this.setupCanvas(container);
    await this.loadContent();
    await this.hidePoster();

    if (!this.params.isPreview) {
      this.setupPropertyPanel(container);
    }

    this.setupAnalytics();

    if (this.params.isPreview) {
      window.parent.postMessage({ type: READY_MESSAGE_TYPE }, "*");
    }

    window.addEventListener("message", (event: MessageEvent) => {
      this.handleDashboardMessage(event);
    });

    fireEvent("viewer_loaded", { tourId: this.params.tourId });
  }

  // -------------------------------------------------------------------------
  // Private — poster / loading screen
  // -------------------------------------------------------------------------

  private showPoster(container: HTMLElement): void {
    const poster = document.createElement("div");
    poster.id = "viewer-poster";
    poster.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 24px;
      background: #1a1a26;
      transition: opacity ${POSTER_FADE_DURATION_MS}ms ease;
    `;

    if (this.params.posterUrl !== undefined) {
      const img = document.createElement("img");
      img.src = this.params.posterUrl;
      img.alt = "Carregando tour virtual…";
      img.style.cssText =
        "max-width: 100%; max-height: 70%; object-fit: cover; border-radius: 8px;";
      poster.appendChild(img);
    }

    const loadingBar = this.buildLoadingBar();
    poster.appendChild(loadingBar);

    container.appendChild(poster);
    this.posterEl = poster;

    window.addEventListener("loading-progress", (event: Event) => {
      const customEvent = event as CustomEvent<{ progress: number }>;
      loadingBar.querySelector("div")?.setAttribute(
        "style",
        `height: 100%; width: ${customEvent.detail.progress}%; background: #7c6af7; border-radius: 4px; transition: width 200ms linear;`
      );
    });
  }

  private buildLoadingBar(): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.style.cssText =
      "width: 240px; height: 4px; background: rgba(255,255,255,0.12); border-radius: 4px; overflow: hidden;";
    const bar = document.createElement("div");
    bar.style.cssText =
      "height: 100%; width: 0%; background: #7c6af7; border-radius: 4px; transition: width 200ms linear;";
    wrapper.appendChild(bar);
    return wrapper;
  }

  private async hidePoster(): Promise<void> {
    if (this.posterEl === null) return;
    const poster = this.posterEl;
    poster.style.opacity = "0";
    await new Promise<void>((resolve) => {
      let steps = 0;
      const interval = setInterval(() => {
        steps++;
        if (steps >= POSTER_FADE_STEPS) {
          clearInterval(interval);
          poster.remove();
          this.posterEl = null;
          resolve();
        }
      }, POSTER_FADE_DURATION_MS / POSTER_FADE_STEPS);
    });
  }

  // -------------------------------------------------------------------------
  // Private — settings
  // -------------------------------------------------------------------------

  private async loadSettings(): Promise<void> {
    let raw: Partial<ExperienceSettings> = {};

    const url =
      this.params.settingsUrl ??
      `${API_BASE_PATH}/tours/${this.params.tourId}/settings`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(
          `[viewer] Não foi possível buscar settings (${response.status}); usando padrões.`
        );
      } else {
        raw = (await response.json()) as Partial<ExperienceSettings>;
      }
    } catch (error) {
      console.warn("[viewer] Erro ao buscar settings; usando padrões.", error);
    }

    this.settings = mergeWithDefaults(raw);
    applySettings(this.settings);
  }

  // -------------------------------------------------------------------------
  // Private — PlayCanvas canvas setup
  // -------------------------------------------------------------------------

  private setupCanvas(container: HTMLElement): void {
    const canvas = document.createElement("canvas");
    canvas.id = "viewer-canvas";
    canvas.style.cssText = "width: 100%; height: 100%; display: block;";
    container.appendChild(canvas);
    this.canvas = canvas;

    // PlayCanvas is loaded as an external script in production; in the dev
    // build it may be imported. We attempt to initialise here but guard
    // gracefully if window.pc is not available yet.
    if (typeof window.pc !== "undefined") {
      const pcApp = new window.pc.Application(canvas, {
        mouse: {} as Record<string, unknown>,
        touch: {} as Record<string, unknown>,
        keyboard: {} as Record<string, unknown>,
      });
      pcApp.setCanvasFillMode(window.pc.FILLMODE_FILL_WINDOW);
      pcApp.setCanvasResolution(window.pc.RESOLUTION_AUTO);
      pcApp.start();
      this.pcApp = pcApp;
    }
  }

  // -------------------------------------------------------------------------
  // Private — content loading
  // -------------------------------------------------------------------------

  private async loadContent(): Promise<void> {
    if (this.params.contentUrl === undefined) {
      // No content URL provided — nothing to load (e.g. empty preview)
      return;
    }

    try {
      await loadSogFile(this.params.contentUrl);
      // TODO: pass the ArrayBuffer into PlayCanvas GSplat asset pipeline
    } catch (error) {
      console.error("[viewer] Falha ao carregar conteúdo .sog:", error);
    }
  }

  // -------------------------------------------------------------------------
  // Private — property panel
  // -------------------------------------------------------------------------

  private setupPropertyPanel(container: HTMLElement): void {
    // Property panel data is embedded in the settings JSON. If we have no
    // price / address info we skip rendering the panel entirely.
    const panelData = this.extractPanelData();

    const hasData =
      panelData.price !== undefined ||
      (panelData.address !== undefined && panelData.address.length > 0) ||
      panelData.area !== undefined;

    if (!hasData) return;

    const panel = new PropertyPanel(container, panelData, this.params.tourId);
    panel.render();
  }

  private extractPanelData(): PropertyPanelData {
    // Panel data is injected via the settings URL as query params or stored
    // inside an extended settings object. We expose known fields.
    const params = new URLSearchParams(window.location.search);
    const priceRaw = params.get("price");
    const areaRaw = params.get("area");
    const addressRaw = params.get("address");
    const phoneRaw = params.get("phone");

    const data: PropertyPanelData = {};
    if (priceRaw !== null) data.price = parseFloat(priceRaw);
    if (addressRaw !== null) data.address = addressRaw;
    if (phoneRaw !== null) data.phone = phoneRaw;
    if (areaRaw !== null) data.area = parseFloat(areaRaw);
    return data;
  }

  // -------------------------------------------------------------------------
  // Private — analytics
  // -------------------------------------------------------------------------

  private setupAnalytics(): void {
    // Walk-mode tracking: listen to custom DOM event fired by PlayCanvas scene
    window.addEventListener("walk-mode-started", () => {
      fireEvent("walk_mode_started", { tourId: this.params.tourId });
    });

    // Annotation click tracking
    window.addEventListener("annotation-clicked", (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string; label: string }>;
      fireEvent("annotation_clicked", {
        tourId: this.params.tourId,
        annotationId: customEvent.detail.id,
        annotationLabel: customEvent.detail.label,
      });
    });
  }

  // -------------------------------------------------------------------------
  // Private — dashboard messaging
  // -------------------------------------------------------------------------

  private handleDashboardMessage(event: MessageEvent): void {
    // Only trust messages from the parent frame in preview mode
    if (this.params.isPreview && event.source !== window.parent) return;

    const message = event.data as unknown;

    if (
      message === null ||
      typeof message !== "object" ||
      !("type" in message)
    ) {
      return;
    }

    const typed = message as { type: unknown; settings?: unknown };

    if (typed.type === "UPDATE_SETTINGS" && typed.settings !== undefined) {
      const incoming = typed.settings as Partial<ExperienceSettings>;
      this.settings = mergeWithDefaults(incoming);
      applySettings(this.settings);
    }
  }
}
