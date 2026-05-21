import { ReactNode } from "react";
import { LucideIcon, Moon, Sparkles, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export interface AuthShellFeature {
  icon: LucideIcon;
  title: string;
  text: string;
}

export interface AuthShellSignal {
  icon: LucideIcon;
  label: string;
}

interface AuthShellProps {
  sideEyebrow: string;
  sideTitle: string;
  sideDescription: string;
  sideTag?: string;
  sideFeatures?: readonly AuthShellFeature[];
  sideSignals?: readonly AuthShellSignal[];
  cardEyebrow: string;
  cardTitle: string;
  cardDescription?: string;
  children: ReactNode;
  footerNote?: ReactNode;
}

export function AuthShell({
  sideEyebrow,
  sideTitle,
  sideDescription,
  sideTag = "Portal docente",
  sideFeatures = [],
  sideSignals = [],
  cardEyebrow,
  cardTitle,
  cardDescription,
  children,
  footerNote,
}: AuthShellProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f1e8] text-[#172033] dark:bg-[#08101b] dark:text-[#f8f3ea]">
      <div className="relative min-h-screen">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,170,84,0.28),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(31,111,104,0.22),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(56,88,168,0.16),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(217,170,84,0.12),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(31,111,104,0.18),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(74,110,214,0.14),transparent_30%)]" />
          <div className="absolute inset-0 opacity-[0.16] dark:opacity-[0.08] bg-[linear-gradient(90deg,rgba(23,32,51,.14)_1px,transparent_1px),linear-gradient(rgba(23,32,51,.10)_1px,transparent_1px)] bg-[size:52px_52px]" />
          <div className="absolute inset-0 opacity-[0.12] mix-blend-multiply dark:mix-blend-screen dark:opacity-[0.03] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.7px,transparent_0.7px)] [background-size:18px_18px]" />
          <div className="absolute -left-32 top-[-16rem] h-[34rem] w-[34rem] rounded-full bg-[#d8a44c]/25 blur-3xl dark:bg-[#d8a44c]/8" />
          <div className="absolute right-[-8rem] top-24 h-[26rem] w-[26rem] rounded-full bg-[#1f6f68]/20 blur-3xl dark:bg-[#1f6f68]/16" />
          <div className="absolute bottom-[-13rem] left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-[#4b63b6]/15 blur-3xl dark:bg-[#4b63b6]/12" />
        </div>

        <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
          <section className="hidden min-h-screen flex-col justify-between border-r border-[#172033]/10 px-10 py-8 lg:flex xl:px-14 dark:border-white/10">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/50 bg-white/75 shadow-[0_20px_70px_rgba(23,32,51,.12)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
                  <img src="/logo.png" alt="SmartTest" className="h-8 w-8 object-contain" />
                </div>
                <div>
                  <p className="font-display text-[1.35rem] font-black tracking-[-0.05em]">SmartTest</p>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#667085] dark:text-white/40">
                    Sistema de provas
                  </p>
                </div>
              </div>

              <div className="rounded-full border border-[#172033]/10 bg-white/55 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#1f6f68] shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-[#92dfd3]">
                {sideTag}
              </div>
            </div>

            <div className="max-w-[720px] pb-10 pt-6">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#172033]/10 bg-[#fff8ea]/70 px-3 py-2 text-xs font-bold text-[#3d4a5f] shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-white/72">
                <Sparkles className="h-3.5 w-3.5 text-[#c68b26]" />
                {sideEyebrow}
              </div>

              <h1 className="max-w-[12ch] font-display text-[clamp(3.3rem,6vw,6.6rem)] font-black leading-[0.9] tracking-[-0.08em] text-[#121b2d] dark:text-[#fff8ed]">
                {sideTitle}
              </h1>

              <p className="mt-8 max-w-[54ch] text-lg leading-8 text-[#556276] dark:text-white/62">
                {sideDescription}
              </p>

              {sideFeatures.length > 0 && (
                <div className="mt-10 grid gap-4 lg:grid-cols-3">
                  {sideFeatures.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <article
                        key={feature.title}
                        className="rounded-[1.7rem] border border-[#172033]/10 bg-white/58 p-4 shadow-[0_22px_60px_rgba(23,32,51,.10)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07]"
                      >
                        <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#172033] text-white dark:bg-[#f6efe3] dark:text-[#111827]">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <h2 className="font-display text-lg font-black tracking-[-0.04em] text-[#172033] dark:text-[#fff8ed]">
                          {feature.title}
                        </h2>
                        <p className="mt-2 text-[13px] leading-6 text-[#667085] dark:text-white/46">
                          {feature.text}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}

              {sideSignals.length > 0 && (
                <div className="mt-8 rounded-[1.8rem] border border-[#172033]/10 bg-[#172033] px-5 py-5 text-white shadow-[0_26px_80px_rgba(15,23,42,.24)] dark:border-white/10 dark:bg-white/[0.08] dark:text-[#fff8ed]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/55 dark:text-white/44">
                    O que muda no dia a dia
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {sideSignals.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="flex items-start gap-3 rounded-2xl bg-white/8 px-3 py-3 dark:bg-white/6">
                          <Icon className="mt-0.5 h-4 w-4 text-[#f0c36c]" />
                          <span className="text-sm leading-6 text-white/82 dark:text-white/76">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-[#667085] dark:text-white/38">
              <span>© SmartTest</span>
              <span>Organização, revisão e impressão em um só fluxo</span>
            </div>
          </section>

          <section className="flex min-h-screen flex-col px-5 py-5 sm:px-8 lg:px-10">
            <div className="flex items-center justify-between lg:justify-end">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-lg dark:bg-white/10">
                  <img src="/logo.png" alt="SmartTest" className="h-7 w-7 object-contain" />
                </div>
                <span className="font-display text-xl font-black tracking-[-0.04em]">SmartTest</span>
              </div>

              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[#172033]/10 bg-white/60 px-4 text-xs font-black uppercase tracking-[0.16em] text-[#334155] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6f68] dark:border-white/10 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15"
                aria-label="Alternar tema"
                type="button"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="hidden sm:inline">{isDark ? "Claro" : "Escuro"}</span>
              </button>
            </div>

            <div className="flex flex-1 items-center justify-center py-10">
              <div className="w-full max-w-[480px]">
                <div className="relative rounded-[2.35rem] border border-white/70 bg-[#fffdf9]/82 p-5 shadow-[0_35px_120px_rgba(23,32,51,.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0e1623]/78 dark:shadow-[0_35px_120px_rgba(0,0,0,.42)] sm:p-7">
                  <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#d7a84f]/80 to-transparent" />

                  <header className="mb-8 rounded-[1.7rem] border border-[#172033]/10 bg-[#f8efdc]/72 p-5 dark:border-white/10 dark:bg-white/[0.05]">
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.26em] text-[#1f6f68] dark:text-[#92dfd3]">
                      {cardEyebrow}
                    </p>
                    <h2 className="font-display text-[2.45rem] font-black leading-none tracking-[-0.07em] text-[#121b2d] dark:text-[#fff8ed]">
                      {cardTitle}
                    </h2>
                    {cardDescription && (
                      <p className="mt-4 text-sm leading-6 text-[#667085] dark:text-white/50">
                        {cardDescription}
                      </p>
                    )}
                  </header>

                  {children}
                </div>

                {footerNote ? (
                  <div className="mx-auto mt-6 max-w-sm rounded-[1.4rem] border border-[#172033]/10 bg-white/40 px-4 py-3 text-center text-xs leading-5 text-[#667085] shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.05] dark:text-white/40">
                    {footerNote}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
