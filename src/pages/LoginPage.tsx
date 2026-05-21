import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  BookOpenCheck,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  UsersRound,
  CheckCircle2,
  Clock3,
  MessageCircleHeart,
} from "lucide-react";
import { showInvokeError } from "@/lib/invokeFunction";
import { AuthShell } from "@/components/auth/AuthShell";

const features = [
  {
    icon: BookOpenCheck,
    title: "Editor completo",
    text: "Provas com fórmulas, imagens, gabaritos e paginação pensada para impressão real.",
  },
  {
    icon: UsersRound,
    title: "Fluxo humano",
    text: "Professores, coordenação e gestão acompanham o mesmo ciclo sem ruído operacional.",
  },
  {
    icon: ShieldCheck,
    title: "Controle seguro",
    text: "Permissões, revisão e histórico preservados para a rotina pedagógica da instituição.",
  },
] as const;

const trustSignals = [
  { icon: CheckCircle2, label: "Acesso institucional protegido" },
  { icon: Clock3, label: "Rotina de revisão mais ágil" },
  { icon: MessageCircleHeart, label: "Experiência pensada para a equipe escolar" },
] as const;

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      showInvokeError(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha inválidos."
          : error.message,
      );
    } else {
      navigate("/");
    }
  };

  return (
    <AuthShell
      sideEyebrow="Uma experiência mais calma para organizar o trabalho pedagógico"
      sideTitle="A rotina das avaliações com mais clareza e menos desgaste."
      sideDescription="Entre para acompanhar provas, simulados, revisões e aprovações em um ambiente pensado para escolas que precisam de organização real, comunicação fluida e acabamento profissional."
      sideFeatures={features}
      sideSignals={trustSignals}
      cardEyebrow="Acesso institucional"
      cardTitle="Bem-vindo de volta."
      cardDescription="Entre para continuar criando avaliações, revisando entregas e coordenando o fluxo pedagógico da escola."
      footerNote="Acesso destinado a instituições, professores e equipes pedagógicas autorizadas."
    >
      <form onSubmit={handleLogin} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-black uppercase tracking-[0.18em] text-[#48566a] dark:text-white/55">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="professor@escola.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-13 rounded-2xl border-[#172033]/10 bg-white/78 px-4 text-base shadow-inner shadow-black/[0.02] transition focus-visible:ring-[#1f6f68] dark:border-white/10 dark:bg-white/[0.06]"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password" className="text-xs font-black uppercase tracking-[0.18em] text-[#48566a] dark:text-white/55">
              Senha
            </Label>
            <Link
              to="/esqueci-senha"
              className="text-xs font-bold text-[#1f6f68] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline dark:text-[#92dfd3]"
            >
              Recuperar acesso
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-13 rounded-2xl border-[#172033]/10 bg-white/78 px-4 pr-12 text-base shadow-inner shadow-black/[0.02] transition focus-visible:ring-[#1f6f68] dark:border-white/10 dark:bg-white/[0.06]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-[#667085] transition hover:bg-[#172033]/5 hover:text-[#172033] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6f68] dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="group h-13 w-full rounded-2xl bg-[#172033] text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_45px_rgba(23,32,51,.28)] transition hover:-translate-y-0.5 hover:bg-[#1f6f68] dark:bg-[#f7f1e7] dark:text-[#111827] dark:hover:bg-[#92dfd3]"
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Entrar no sistema
          {!loading && <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />}
        </Button>
      </form>

      <div className="my-7 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#98a2b3]">
        <span className="h-px flex-1 bg-[#172033]/10 dark:bg-white/10" />
        Novo por aqui?
        <span className="h-px flex-1 bg-[#172033]/10 dark:bg-white/10" />
      </div>

      <Link
        to="/cadastro"
        className="flex h-12 items-center justify-center rounded-2xl border border-[#172033]/10 bg-white/55 text-sm font-bold text-[#172033] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6f68] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/10"
      >
        Criar uma conta gratuita
      </Link>
    </AuthShell>
  );
}
