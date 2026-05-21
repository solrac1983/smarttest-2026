import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  MessageCircleHeart,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { showInvokeError } from "@/lib/invokeFunction";
import { AuthShell } from "@/components/auth/AuthShell";

const features = [
  {
    icon: BookOpenCheck,
    title: "Estrutura pronta",
    text: "Cadastre sua equipe e comece com um ambiente já preparado para avaliações, revisões e impressão.",
  },
  {
    icon: UsersRound,
    title: "Entrada em equipe",
    text: "Professores, coordenação e gestão compartilham o mesmo fluxo desde o primeiro acesso.",
  },
  {
    icon: ShieldCheck,
    title: "Base segura",
    text: "Perfis, permissões e dados institucionais organizados desde a criação da conta.",
  },
] as const;

const trustSignals = [
  { icon: CheckCircle2, label: "Ativação guiada por e-mail" },
  { icon: Clock3, label: "Primeiros passos mais rápidos" },
  { icon: MessageCircleHeart, label: "Experiência pensada para escolas" },
] as const;

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showInvokeError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (error) {
      showInvokeError(error.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <AuthShell
        sideEyebrow="Entrada estruturada para a rotina escolar"
        sideTitle="Seu espaço no SmartTest já está sendo preparado."
        sideDescription="A confirmação por e-mail garante um início mais seguro para a escola e ajuda a manter o acesso institucional organizado desde o primeiro passo."
        sideFeatures={features}
        sideSignals={trustSignals}
        cardEyebrow="Conta criada"
        cardTitle="Verifique seu e-mail."
        cardDescription={`Enviamos um link de confirmação para ${email}. Ative a conta para começar a usar o SmartTest.`}
        footerNote="Depois da confirmação, você poderá entrar e começar a organizar provas, revisões e materiais da equipe."
      >
        <div className="space-y-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.7rem] bg-[#172033] text-white shadow-[0_18px_45px_rgba(23,32,51,.18)] dark:bg-[#f7f1e7] dark:text-[#111827]">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="rounded-[1.7rem] border border-[#172033]/10 bg-white/55 px-4 py-4 text-sm leading-6 text-[#556276] shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white/60">
            Se não encontrar a mensagem, verifique a caixa de spam ou promoções antes de tentar novamente.
          </div>

          <Link to="/login">
            <Button className="group h-12 w-full rounded-2xl bg-[#172033] text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_45px_rgba(23,32,51,.24)] transition hover:-translate-y-0.5 hover:bg-[#1f6f68] dark:bg-[#f7f1e7] dark:text-[#111827] dark:hover:bg-[#92dfd3]">
              Ir para o login
              <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      sideEyebrow="Uma entrada mais simples para começar com segurança"
      sideTitle="Crie a conta da sua rotina pedagógica."
      sideDescription="Cadastre-se para centralizar avaliações, simulados, revisões e materiais em um ambiente mais organizado, humano e preparado para o trabalho escolar real."
      sideFeatures={features}
      sideSignals={trustSignals}
      cardEyebrow="Primeiro acesso"
      cardTitle="Criar conta."
      cardDescription="Preencha os dados iniciais para ativar o seu acesso e começar a usar o sistema com a sua equipe."
      footerNote="Depois da ativação por e-mail, sua conta ficará pronta para entrar no fluxo institucional do SmartTest."
    >
      <form onSubmit={handleSignup} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs font-black uppercase tracking-[0.18em] text-[#48566a] dark:text-white/55">
            Nome completo
          </Label>
          <Input
            id="name"
            placeholder="Seu nome"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="h-13 rounded-2xl border-[#172033]/10 bg-white/78 px-4 text-base shadow-inner shadow-black/[0.02] transition focus-visible:ring-[#1f6f68] dark:border-white/10 dark:bg-white/[0.06]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-black uppercase tracking-[0.18em] text-[#48566a] dark:text-white/55">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
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
            <span className="text-[11px] font-bold text-[#667085] dark:text-white/40">Mínimo de 6 caracteres</span>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Crie uma senha segura"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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
          Criar conta
          {!loading && <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />}
        </Button>
      </form>

      <div className="my-7 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#98a2b3]">
        <span className="h-px flex-1 bg-[#172033]/10 dark:bg-white/10" />
        Já faz parte da equipe?
        <span className="h-px flex-1 bg-[#172033]/10 dark:bg-white/10" />
      </div>

      <Link
        to="/login"
        className="flex h-12 items-center justify-center rounded-2xl border border-[#172033]/10 bg-white/55 text-sm font-bold text-[#172033] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6f68] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/10"
      >
        Entrar com uma conta existente
      </Link>
    </AuthShell>
  );
}
