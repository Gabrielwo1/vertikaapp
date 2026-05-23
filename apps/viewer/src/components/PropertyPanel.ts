import type { PropertyPanelData } from "@/types";
import { fireEvent } from "@/analytics";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCHEDULE_API_PATH = "/api/schedule";
const WHATSAPP_BASE_URL = "https://wa.me/";
const PANEL_TRANSITION_MS = 280;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatArea(value: number): string {
  return `${value.toLocaleString("pt-BR")} m²`;
}

// ---------------------------------------------------------------------------
// PropertyPanel
// ---------------------------------------------------------------------------

export class PropertyPanel {
  private readonly container: HTMLElement;
  private readonly data: PropertyPanelData;
  private panel: HTMLElement | null = null;
  private isVisible = true;
  private tourId: string;

  constructor(container: HTMLElement, data: PropertyPanelData, tourId = "") {
    this.container = container;
    this.data = data;
    this.tourId = tourId;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  render(): void {
    if (this.panel !== null) {
      this.panel.remove();
    }

    this.panel = this.buildPanel();
    this.container.appendChild(this.panel);
  }

  show(): void {
    if (this.panel === null) return;
    this.isVisible = true;
    this.panel.style.transform = "translateX(0)";
    this.panel.setAttribute("aria-hidden", "false");
  }

  hide(): void {
    if (this.panel === null) return;
    this.isVisible = false;
    // Slide panel off-screen to the right
    this.panel.style.transform = "translateX(calc(100% + 16px))";
    this.panel.setAttribute("aria-hidden", "true");
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  // -------------------------------------------------------------------------
  // DOM construction
  // -------------------------------------------------------------------------

  private buildPanel(): HTMLElement {
    const panel = document.createElement("aside");
    panel.id = "property-panel";
    panel.setAttribute("aria-label", "Informações do imóvel");
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      right: 16px;
      transform: translateY(-50%);
      width: 280px;
      background: rgba(18, 18, 28, 0.92);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      color: #f0f0f0;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      transition: transform ${PANEL_TRANSITION_MS}ms ease;
      z-index: 100;
      overflow: hidden;
    `;

    panel.appendChild(this.buildHeader());
    panel.appendChild(this.buildBody());

    // Toggle button (visible even when panel is hidden)
    const toggleBtn = this.buildToggleButton(panel);
    this.container.appendChild(toggleBtn);

    return panel;
  }

  private buildHeader(): HTMLElement {
    const header = document.createElement("header");
    header.style.cssText = `
      padding: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const logo = document.createElement("span");
    logo.textContent = "VirtualTour";
    logo.style.cssText = `
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #7c6af7;
      text-transform: uppercase;
    `;

    header.appendChild(logo);
    return header;
  }

  private buildBody(): HTMLElement {
    const body = document.createElement("div");
    body.style.cssText = "padding: 16px; display: flex; flex-direction: column; gap: 12px;";

    if (this.data.price !== undefined) {
      body.appendChild(this.buildField("Valor", formatCurrency(this.data.price)));
    }

    if (this.data.address !== undefined && this.data.address.length > 0) {
      body.appendChild(this.buildField("Endereço", this.data.address));
    }

    if (this.data.area !== undefined) {
      body.appendChild(this.buildField("Área", formatArea(this.data.area)));
    }

    const actionsEl = this.buildActions();
    body.appendChild(actionsEl);

    return body;
  }

  private buildField(label: string, value: string): HTMLElement {
    const wrapper = document.createElement("div");

    const labelEl = document.createElement("p");
    labelEl.textContent = label;
    labelEl.style.cssText = "font-size: 11px; color: rgba(255,255,255,0.45); margin-bottom: 2px;";

    const valueEl = document.createElement("p");
    valueEl.textContent = value;
    valueEl.style.cssText = "font-size: 14px; font-weight: 600; color: #f0f0f0;";

    wrapper.appendChild(labelEl);
    wrapper.appendChild(valueEl);
    return wrapper;
  }

  private buildActions(): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display: flex; flex-direction: column; gap: 8px; margin-top: 4px;";

    if (this.data.phone !== undefined && this.data.phone.length > 0) {
      const whatsappBtn = this.buildButton(
        "Falar com Corretor",
        "#25d366",
        "#1a9e50"
      );
      whatsappBtn.addEventListener("click", () => {
        fireEvent("cta_whatsapp");
        window.open(`${WHATSAPP_BASE_URL}${this.data.phone ?? ""}`, "_blank", "noopener");
      });
      wrapper.appendChild(whatsappBtn);
    }

    const scheduleSection = this.buildScheduleSection();
    wrapper.appendChild(scheduleSection);

    return wrapper;
  }

  private buildButton(
    label: string,
    bgColor: string,
    hoverColor: string
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.style.cssText = `
      width: 100%;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      background: ${bgColor};
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 160ms ease;
    `;
    btn.addEventListener("mouseenter", () => {
      btn.style.background = hoverColor;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = bgColor;
    });
    return btn;
  }

  private buildScheduleSection(): HTMLElement {
    const section = document.createElement("div");

    const scheduleBtn = this.buildButton("Agendar Visita", "#7c6af7", "#6355d4");
    section.appendChild(scheduleBtn);

    const form = this.buildScheduleForm();
    form.style.display = "none";
    section.appendChild(form);

    scheduleBtn.addEventListener("click", () => {
      const hidden = form.style.display === "none";
      form.style.display = hidden ? "flex" : "none";
      scheduleBtn.textContent = hidden ? "Cancelar" : "Agendar Visita";
    });

    return section;
  }

  private buildScheduleForm(): HTMLElement {
    const form = document.createElement("form");
    form.style.cssText = `
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    `;

    const nameInput = this.buildInput("text", "Nome completo");
    const phoneInput = this.buildInput("tel", "Telefone (ex: 11999999999)");

    const feedback = document.createElement("p");
    feedback.style.cssText = "font-size: 12px; min-height: 18px; color: #7c6af7;";

    const submitBtn = this.buildButton("Confirmar Agendamento", "#7c6af7", "#6355d4");
    submitBtn.type = "submit";

    form.appendChild(nameInput);
    form.appendChild(phoneInput);
    form.appendChild(submitBtn);
    form.appendChild(feedback);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.submitSchedule(nameInput.value, phoneInput.value, feedback, form);
    });

    return form;
  }

  private buildInput(type: string, placeholder: string): HTMLInputElement {
    const input = document.createElement("input");
    input.type = type;
    input.placeholder = placeholder;
    input.required = true;
    input.style.cssText = `
      width: 100%;
      padding: 9px 12px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      color: #f0f0f0;
      font-size: 13px;
      outline: none;
    `;
    input.addEventListener("focus", () => {
      input.style.borderColor = "#7c6af7";
    });
    input.addEventListener("blur", () => {
      input.style.borderColor = "rgba(255,255,255,0.12)";
    });
    return input;
  }

  private async submitSchedule(
    name: string,
    phone: string,
    feedback: HTMLElement,
    form: HTMLElement
  ): Promise<void> {
    feedback.style.color = "#7c6af7";
    feedback.textContent = "Enviando…";

    try {
      const response = await fetch(SCHEDULE_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourId: this.tourId, name, phone }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      fireEvent("cta_schedule");
      feedback.style.color = "#25d366";
      feedback.textContent = "Agendamento confirmado!";
      form.querySelectorAll("input").forEach((input) => {
        (input as HTMLInputElement).value = "";
      });
    } catch (error) {
      feedback.style.color = "#f87171";
      feedback.textContent =
        error instanceof Error ? error.message : "Erro ao agendar. Tente novamente.";
    }
  }

  private buildToggleButton(panel: HTMLElement): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.setAttribute("aria-label", "Mostrar / ocultar painel de informações");
    btn.style.cssText = `
      position: fixed;
      top: 50%;
      right: 16px;
      transform: translateY(-50%) translateX(calc(-280px - 8px));
      width: 32px;
      height: 48px;
      background: rgba(18, 18, 28, 0.92);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px 0 0 8px;
      color: #f0f0f0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 101;
      font-size: 16px;
      transition: background 160ms ease;
    `;
    btn.textContent = "›";

    btn.addEventListener("click", () => {
      this.toggle();
      btn.textContent = this.isVisible ? "›" : "‹";
      if (this.isVisible) {
        panel.style.transform = "translateY(-50%) translateX(0)";
        btn.style.transform = "translateY(-50%) translateX(calc(-280px - 8px))";
      } else {
        panel.style.transform = "translateY(-50%) translateX(calc(100% + 16px))";
        btn.style.transform = "translateY(-50%) translateX(0)";
      }
    });

    // Override panel transform to account for vertical centering
    panel.style.transform = "translateY(-50%)";

    return btn;
  }
}
