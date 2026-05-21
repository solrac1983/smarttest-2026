import { useEffect, useMemo, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { FileText, Ruler, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createPageLayoutEngineFromSettings, parsePageCssLength } from "./core/PageLayoutEngine";

export type PaperSize = "a4" | "a3" | "letter" | "legal" | "custom";

export interface PageBorders {
  enabled: boolean;
  style: "solid" | "dashed" | "dotted" | "double";
  thicknessPx: number;
  color: string;
}

export interface PageSettings {
  paper: PaperSize;
  orientation: "portrait" | "landscape";
  customWidthMm: number;
  customHeightMm: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  pageGapPx: number;
  viewMode: "print_layout" | "continuous_scroll";
  borders: PageBorders;
}

const PAPER_DIMENSIONS: Record<string, { w: string; h: string; label: string }> = {
  a4: { w: "210mm", h: "297mm", label: "A4 (210 × 297 mm)" },
  a3: { w: "297mm", h: "420mm", label: "A3 (297 × 420 mm)" },
  letter: { w: "216mm", h: "279mm", label: "Carta (216 × 279 mm)" },
  legal: { w: "216mm", h: "356mm", label: "Ofício (216 × 356 mm)" },
  custom: { w: "210mm", h: "297mm", label: "Personalizado" },
};

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  paper: "a4",
  orientation: "portrait",
  customWidthMm: 210,
  customHeightMm: 297,
  marginTopMm: 15,
  marginBottomMm: 15,
  marginLeftMm: 20,
  marginRightMm: 20,
  pageGapPx: 24,
  viewMode: "print_layout",
  borders: {
    enabled: false,
    style: "solid",
    thicknessPx: 1,
    color: "#000000"
  }
};

const MARGIN_PRESETS: Record<string, { label: string; values: Pick<PageSettings, "marginTopMm" | "marginBottomMm" | "marginLeftMm" | "marginRightMm"> & Partial<PageSettings> }> = {
  abnt: { label: "ABNT (3/2/3/2 cm)", values: { paper: "a4", orientation: "portrait", marginTopMm: 30, marginBottomMm: 20, marginLeftMm: 30, marginRightMm: 20 } },
  normal: { label: "Normal (2 cm)", values: { marginTopMm: 20, marginBottomMm: 20, marginLeftMm: 25, marginRightMm: 25 } },
  estreita: { label: "Estreita (1.2 cm)", values: { marginTopMm: 12, marginBottomMm: 12, marginLeftMm: 12, marginRightMm: 12 } },
  moderada: { label: "Moderada", values: { marginTopMm: 25, marginBottomMm: 25, marginLeftMm: 19, marginRightMm: 19 } },
};

const mmToPx = (mm: number) => parsePageCssLength(`${mm}mm`);

export function getPageSettingsKey(scopeId?: string | null) {
  return `page-settings:${scopeId || "global"}`;
}

export function loadPageSettings(scopeId?: string | null): PageSettings {
  try {
    const raw = localStorage.getItem(getPageSettingsKey(scopeId));
    if (raw) return { ...DEFAULT_PAGE_SETTINGS, ...JSON.parse(raw) };
    const userRaw = localStorage.getItem(getPageSettingsKey("user-default"));
    if (userRaw) return { ...DEFAULT_PAGE_SETTINGS, ...JSON.parse(userRaw) };
  } catch {}
  return DEFAULT_PAGE_SETTINGS;
}

export async function loadPageSettingsFromDB(scopeId?: string | null): Promise<PageSettings> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return loadPageSettings(scopeId);
    const { data } = await supabase
      .from("page_settings" as any)
      .select("scope_id, settings")
      .eq("user_id", user.id)
      .in("scope_id", [scopeId ?? "__user_default__", "__user_default__"]);
    const rows = (data as any[]) || [];
    const scoped = rows.find((r) => r.scope_id === (scopeId ?? "__user_default__"));
    const fallback = rows.find((r) => r.scope_id === "__user_default__");
    const chosen = scoped?.settings || fallback?.settings;
    if (chosen) {
      try { localStorage.setItem(getPageSettingsKey(scopeId), JSON.stringify(chosen)); } catch {}
      return { ...DEFAULT_PAGE_SETTINGS, ...chosen };
    }
  } catch {}
  return loadPageSettings(scopeId);
}

async function savePageSettingsToDB(scopeId: string | null | undefined, settings: PageSettings, asUserDefault = false) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const scope = asUserDefault ? "__user_default__" : (scopeId ?? "__user_default__");
  const { error } = await supabase
    .from("page_settings" as any)
    .upsert({ user_id: user.id, scope_id: scope, settings: settings as any, updated_at: new Date().toISOString() } as any, { onConflict: "user_id,scope_id" });
  return !error;
}

let pageSettingsObserver: MutationObserver | null = null;
let lastAppliedSettings: PageSettings | null = null;

function applySettingsToElement(el: HTMLElement, s: PageSettings) {
  const vars = createPageLayoutEngineFromSettings({
    paper: s.paper,
    orientation: s.orientation,
    customWidthMm: s.customWidthMm,
    customHeightMm: s.customHeightMm,
    marginTopMm: s.marginTopMm,
    marginRightMm: s.marginRightMm,
    marginBottomMm: s.marginBottomMm,
    marginLeftMm: s.marginLeftMm,
    pageGapPx: s.pageGapPx,
    columns: 1,
    columnGapPx: 24,
  }).toCSSVars();

  Object.entries(vars).forEach(([key, value]) => {
    el.style.setProperty(key, value);
  });

  el.style.setProperty("--page-gap", `${s.pageGapPx}px`);
  el.style.setProperty("--page-border-width", s.borders.enabled ? `${s.borders.thicknessPx}px` : "0px");
  el.style.setProperty("--page-border-style", s.borders.enabled ? s.borders.style : "none");
  el.style.setProperty("--page-border-color", s.borders.color);
}

export function applyPageSettings(s: PageSettings) {
  const vars = createPageLayoutEngineFromSettings({
    paper: s.paper,
    orientation: s.orientation,
    customWidthMm: s.customWidthMm,
    customHeightMm: s.customHeightMm,
    marginTopMm: s.marginTopMm,
    marginRightMm: s.marginRightMm,
    marginBottomMm: s.marginBottomMm,
    marginLeftMm: s.marginLeftMm,
    pageGapPx: s.pageGapPx,
    columns: 1,
    columnGapPx: 24,
  }).toCSSVars();

  const gap = `${s.pageGapPx}px`;
  const borderThickness = s.borders.enabled ? `${s.borders.thicknessPx}px` : "0px";
  const borderStyle = s.borders.enabled ? s.borders.style : "none";
  const borderColor = s.borders.color;

  const targets = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".exam-page, .editor-page-shell, .tiptap, .ProseMirror, .editor-desk",
    ),
  );
  if (targets.length === 0) return;

  targets.forEach((target) => {
    Object.entries(vars).forEach(([key, value]) => {
      target.style.setProperty(key, value);
    });
    target.style.setProperty("--page-gap", gap);
    target.style.setProperty("--page-border-width", borderThickness);
    target.style.setProperty("--page-border-style", borderStyle);
    target.style.setProperty("--page-border-color", borderColor);
  });

  document.querySelectorAll<HTMLElement>(".exam-page").forEach((page) => {
    page.style.width = vars["--page-w"];
    page.style.minHeight = vars["--page-h"];
    page.style.height = "auto";
  });
  document.querySelectorAll<HTMLElement>(".editor-page-shell").forEach((shell) => {
    shell.style.width = vars["--page-w"];
  });
  document.querySelectorAll<HTMLElement>(".tiptap, .ProseMirror").forEach((editor) => {
    editor.style.width = "100%";
    editor.style.maxWidth = "100%";
    editor.style.minHeight = vars["--page-h"];
    editor.style.paddingTop = vars["--page-pad-top"];
    editor.style.paddingRight = vars["--page-pad-right"];
    editor.style.paddingBottom = vars["--page-pad-bottom"];
    editor.style.paddingLeft = vars["--page-pad-left"];
  });

  // Store last applied settings for observer
  lastAppliedSettings = s;

  // Set up MutationObserver to apply settings to newly created page elements
  if (pageSettingsObserver) {
    pageSettingsObserver.disconnect();
  }
  
  const applyToNewElements = () => {
    if (!lastAppliedSettings) return;
    
    const allNewElements = document.querySelectorAll<HTMLElement>(
      ".page-break-widget, .blank-page-spacer, .page-trailing-spacer, .hard-page-break"
    );
    
    allNewElements.forEach((el) => {
      if (!el.style.getPropertyValue("--page-w")) {
        applySettingsToElement(el, lastAppliedSettings!);
      }
    });
  };
  
  pageSettingsObserver = new MutationObserver((mutations) => {
    const needsUpdate = mutations.some((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (
              node.classList.contains("page-break-widget") ||
              node.classList.contains("blank-page-spacer") ||
              node.classList.contains("page-trailing-spacer") ||
              node.classList.contains("hard-page-break") ||
              node.tagName === "HR"
            ) {
              return true;
            }
            // Check children
            if (node.querySelector && (
              node.querySelector(".page-break-widget") ||
              node.querySelector(".blank-page-spacer") ||
              node.querySelector(".page-trailing-spacer")
            )) {
              return true;
            }
          }
        }
      }
      return false;
    });
    
    if (needsUpdate) {
      requestAnimationFrame(applyToNewElements);
    }
  });

  // Observe the editor container for new page elements
  const editorContainer = document.querySelector(".editor-desk, .tiptap, .ProseMirror, .exam-page");
  if (editorContainer) {
    pageSettingsObserver.observe(editorContainer, { childList: true, subtree: true });
  }

  // Also apply to existing elements immediately
  applyToNewElements();

  window.dispatchEvent(new CustomEvent("editor-margins-change", {
    detail: {
      top: mmToPx(s.marginTopMm),
      bottom: mmToPx(s.marginBottomMm),
      left: mmToPx(s.marginLeftMm),
      right: mmToPx(s.marginRightMm),
    },
  }));
  
  // Dispatch event for mode change
  window.dispatchEvent(new CustomEvent("editor-viewmode-change", {
    detail: { mode: s.viewMode }
  }));
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scopeId?: string | null;
}

const MARGIN_FIELDS: ReadonlyArray<readonly [string, keyof PageSettings]> = [
  ["Superior", "marginTopMm"],
  ["Inferior", "marginBottomMm"],
  ["Esquerda", "marginLeftMm"],
  ["Direita", "marginRightMm"],
] as const;

function PaperPreview({ settings }: { settings: PageSettings }) {
  const dim = PAPER_DIMENSIONS[settings.paper] || PAPER_DIMENSIONS.a4;
  const portrait = settings.orientation === "portrait";
  const wMm = settings.paper === "custom" ? settings.customWidthMm : parseInt(portrait ? dim.w : dim.h, 10);
  const hMm = settings.paper === "custom" ? settings.customHeightMm : parseInt(portrait ? dim.h : dim.w, 10);
  
  // Responsive scale to fit the preview box
  const maxDim = Math.max(wMm, hMm);
  const scale = 150 / maxDim; // Fit within 150px
  
  const w = wMm * scale;
  const h = hMm * scale;
  const pt = settings.marginTopMm * scale;
  const pb = settings.marginBottomMm * scale;
  const pl = settings.marginLeftMm * scale;
  const pr = settings.marginRightMm * scale;
  
  return (
    <div className="flex items-center justify-center rounded-md border bg-muted/30 p-3 h-[200px]">
      <div
        className="relative bg-background shadow-sm"
        style={{ 
          width: `${w}px`, 
          height: `${h}px`,
          borderWidth: settings.borders.enabled ? `${settings.borders.thicknessPx}px` : '1px',
          borderStyle: settings.borders.enabled ? settings.borders.style : 'solid',
          borderColor: settings.borders.enabled ? settings.borders.color : 'hsl(var(--border))'
        }}
        aria-hidden
      >
        <div
          className="absolute border border-dashed border-primary/40"
          style={{ top: pt, bottom: pb, left: pl, right: pr }}
        />
      </div>
    </div>
  );
}

export function PageSettingsPanel({ open, onOpenChange, scopeId }: Props) {
  const [settings, setSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
  const [tab, setTab] = useState("paper");

  useEffect(() => {
    if (!open) return;
    setSettings(loadPageSettings(scopeId));
    loadPageSettingsFromDB(scopeId).then((s) => {
      setSettings(s);
      applyPageSettings(s);
    });
  }, [open, scopeId]);

  const update = useCallback(<K extends keyof PageSettings>(k: K, v: PageSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [k]: v };
      applyPageSettings(next);
      return next;
    });
  }, []);

  const applyPreset = useCallback((preset: string) => {
    const p = MARGIN_PRESETS[preset]?.values;
    if (!p) return;
    setSettings((prev) => {
      const next = { ...prev, ...p } as PageSettings;
      applyPageSettings(next);
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    try {
      localStorage.setItem(getPageSettingsKey(scopeId), JSON.stringify(settings));
      applyPageSettings(settings);
      const ok = await savePageSettingsToDB(scopeId, settings, false);
      toast.success(ok ? "Configurações salvas" : "Salvas localmente (sem conexão)");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar");
    }
  }, [settings, scopeId, onOpenChange]);

  const saveAsUserDefault = useCallback(async () => {
    try {
      localStorage.setItem(getPageSettingsKey("user-default"), JSON.stringify(settings));
      const ok = await savePageSettingsToDB(scopeId, settings, true);
      toast.success(ok ? "Padrão do usuário definido" : "Padrão salvo localmente");
    } catch {
      toast.error("Falha ao salvar padrão");
    }
  }, [settings, scopeId]);

  const reset = useCallback(() => {
    setSettings(DEFAULT_PAGE_SETTINGS);
    applyPageSettings(DEFAULT_PAGE_SETTINGS);
  }, []);

  const summary = useMemo(() => {
    const dim = PAPER_DIMENSIONS[settings.paper];
    const orient = settings.orientation === "portrait" ? "Retrato" : "Paisagem";
    return `${dim.label} · ${orient}`;
  }, [settings.paper, settings.orientation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="editor-page-settings-dialog max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurações de Página</DialogTitle>
          <DialogDescription>
            {summary} · Salvo {scopeId ? "para esta prova" : "globalmente"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full h-auto min-h-10">
              <TabsTrigger value="paper" className="gap-1.5 px-2 text-xs"><FileText className="h-3.5 w-3.5" />Papel</TabsTrigger>
              <TabsTrigger value="margins" className="gap-1.5 px-2 text-xs"><Ruler className="h-3.5 w-3.5" />Margens</TabsTrigger>
              <TabsTrigger value="borders" className="gap-1.5 px-2 text-xs"><LayoutGrid className="h-3.5 w-3.5" />Bordas</TabsTrigger>
              <TabsTrigger value="layout" className="gap-1.5 px-2 text-xs"><LayoutGrid className="h-3.5 w-3.5" />Layout</TabsTrigger>
            </TabsList>

            <TabsContent value="paper" className="space-y-3 pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Tamanho do papel</Label>
                <Select value={settings.paper} onValueChange={(v) => update("paper", v as PaperSize)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(PAPER_DIMENSIONS) as [PaperSize, typeof PAPER_DIMENSIONS[PaperSize]][]).map(([k, info]) => (
                      <SelectItem key={k} value={k}>{info.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {settings.paper === "custom" && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-md border border-border/50">
                  <div className="space-y-1">
                    <Label className="text-xs">Largura (mm)</Label>
                    <Input 
                      type="number" 
                      min={50} max={1000} 
                      value={settings.customWidthMm}
                      onChange={(e) => update("customWidthMm", Number(e.target.value) || 210)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Altura (mm)</Label>
                    <Input 
                      type="number" 
                      min={50} max={1000} 
                      value={settings.customHeightMm}
                      onChange={(e) => update("customHeightMm", Number(e.target.value) || 297)}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-1">
                <Label className="text-xs">Orientação</Label>
                <Select value={settings.orientation} onValueChange={(v) => update("orientation", v as "portrait" | "landscape")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Retrato</SelectItem>
                    <SelectItem value="landscape">Paisagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="margins" className="space-y-3 pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Predefinições</Label>
                <Select value="" onValueChange={applyPreset}>
                  <SelectTrigger><SelectValue placeholder="Escolha uma predefinição" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MARGIN_PRESETS).map(([k, p]) => (
                      <SelectItem key={k} value={k}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                {MARGIN_FIELDS.map(([label, key]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">{label} (mm)</span>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={settings[key] as number}
                      onChange={(e) => update(key, Math.max(0, Math.min(60, Number(e.target.value) || 0)) as PageSettings[typeof key])}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="borders" className="space-y-3 pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Ativar Bordas na Página</Label>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={settings.borders.enabled}
                    onChange={(e) => update("borders", { ...settings.borders, enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>
              </div>
              
              {settings.borders.enabled && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-md border border-border/50">
                  <div className="space-y-1">
                    <Label className="text-xs">Estilo</Label>
                    <Select 
                      value={settings.borders.style} 
                      onValueChange={(v) => update("borders", { ...settings.borders, style: v as PageBorders["style"] })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Sólida</SelectItem>
                        <SelectItem value="dashed">Tracejada</SelectItem>
                        <SelectItem value="dotted">Pontilhada</SelectItem>
                        <SelectItem value="double">Dupla</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Espessura (px)</Label>
                      <Input
                        type="number"
                        min={1} max={20}
                        value={settings.borders.thicknessPx}
                        onChange={(e) => update("borders", { ...settings.borders, thicknessPx: Number(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cor</Label>
                      <div className="flex gap-2 h-9 items-center border rounded-md px-2 bg-background">
                        <input
                          type="color"
                          value={settings.borders.color}
                          onChange={(e) => update("borders", { ...settings.borders, color: e.target.value })}
                          className="h-6 w-6 rounded border-0 p-0"
                        />
                        <span className="text-xs font-mono">{settings.borders.color}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="layout" className="space-y-3 pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Modo de Visualização</Label>
                <Select 
                  value={settings.viewMode} 
                  onValueChange={(v) => update("viewMode", v as "print_layout" | "continuous_scroll")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="print_layout">Layout de Impressão</SelectItem>
                    <SelectItem value="continuous_scroll">Rolagem Contínua</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Layout de Impressão mostra as folhas separadas. Rolagem contínua esconde as quebras visuais.
                </p>
              </div>

              <Separator />

              <div className="space-y-1">
                <Label className="text-xs">Espaçamento entre páginas (px)</Label>
                <Input
                  type="number"
                  min={0}
                  max={80}
                  value={settings.pageGapPx}
                  onChange={(e) => update("pageGapPx", Math.max(0, Math.min(80, Number(e.target.value) || 0)))}
                  disabled={settings.viewMode === "continuous_scroll"}
                />
                <p className="text-[10px] text-muted-foreground">Apenas visual no editor — não afeta o PDF exportado.</p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="hidden md:block">
            <Label className="text-xs mb-1 block">Pré-visualização</Label>
            <PaperPreview settings={settings} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={reset}>Restaurar</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveAsUserDefault}>Salvar como meu padrão</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
