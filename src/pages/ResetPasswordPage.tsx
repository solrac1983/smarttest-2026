import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  MessageCircleHeart,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";

const RULES = [
  { id: "len", label: "Mínimo de 8 caracteres", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "Uma letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { id: "num", label: "Um número", test: (p: string) => /\d/.test(p) },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Troca protegida",
    text: "A redefinição preserva o caráter institucional do acesso e reduz riscos no retorno ao sistema.",
  },
  {
    icon: UsersRound,
    title: "Retomada contínua",
    text: "Depois da nova senha, a equipe volta ao fluxo de provas e revisões com menos interrupção.",
  },
  {
    icon: MessageCircleHeart,
    title: "Orientação clara",
    text: "O processo explica cada etapa para tornar a recuperação mais simples e humana.",
  },
] as const;

const trustSignals = [
  { icon: KeyRound, label: "Nova senha criada com validação" },
  { icon: Clock3, label: "Etapas rápidas e objetivas" },
  { icon: Mail, label: "Confirmação extra quando necessário" },
] as const;

function RuleList({ password }: { password: string }) {
  return (
    <ul className="space-y-1.5 text-xs">
      {RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.id} className={`flex items-center gap-2 ${ok ? "text-[#1f6f68] dark:text-[#92dfd3]" : "text-[#667085] dark:text-white/46"}`}>
            {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    const captureSessionEmail = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) setSessionEmail(data.user.email);
    };

    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setValid(true);
      void captureSessionEmail();
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValid(true);
        void captureSessionEmail();
      }
    });

    const t = setTimeout(() => setValid((v) => (v === null ? false : v)), 1000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const handleEmailConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    const typed = emailInput.trim().toLowerCase();
    if (!typed) {
      setEmailError("Informe o e-mail para continuar.");
      return;
    }
    if (sessionEmail && typed !== sessionEmail.toLowerCase()) {
      setEmailError("O e-mail informado não corresponde ao link de recuperação.");
      return;
    }
    setEmailConfirmed(true);
  };

  const allRulesOk = RULES.every((rule) => rule.test(password));
  const matches = password.length > 0 && password === confirm;
  const canSubmit = allRulesOk && matches && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!allRulesOk) {
      setError("A senha não atende a todos os requisitos.");
      return;
    }
    if (!matches) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updErr) {
      const msg = updErr.message.toLowerCase();
      if (msg.includes("pwned") || msg.includes("compromised") || msg.includes("hibp")) {
        setError("Esta senha foi exposta em vazamentos públicos. Escolha uma senha diferente.");
      } else if (msg.includes("same")) {
        setError("A nova senha precisa ser diferente da atual.");
      } else {
        setError("Não foi possível atualizar a senha. Tente novamente.");
      }
      return;
    }
    setSuccess(true);
    setTimeout(() => navigate("/login"), 2200);
  };

  if (valid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8] text-[#172033] dark:bg-[#08101b] dark:text-[#f8f3ea]">
        <Loader2 className="h-6 w-6 animate-spin text-[#667085] dark:text-white/46" />
      </div>
    );
  }

  if (!valid) {
    return (
      <AuthShell
        sideEyebrow="Links protegidos para manter o acesso institucional confiável"
        sideTitle="Este acesso de recuperação não está mais válido."
        sideDescription="Quando o link expira ou perde a validade, o ideal é solicitar um novo para garantir segurança no retorno ao sistema."
        sideFeatures={features}
        sideSignals={trustSignals}
        cardEyebrow="Link inválido"
        cardTitle="Solicite uma nova recuperação."
        cardDescription="Este link de redefinição não é mais válido. Gere um novo para continuar com segurança."
        footerNote="A recuperação de senha é feita em etapas para proteger o acesso da sua instituição."
      >
        <div className="space-y-5 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.7rem] bg-[#9f1239] text-white shadow-[0_18px_45px_rgba(159,18,57,.18)]">
            <AlertCircle className="h-8 w-8" />
          </div>

          <div className="flex flex-col gap-3">
            <Link to="/esqueci-senha">
              <Button className="group h-12 w-full rounded-2xl bg-[#172033] text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_45px_rgba(23,32,51,.24)] transition hover:-translate-y-0.5 hover:bg-[#1f6f68] dark:bg-[#f7f1e7] dark:text-[#111827] dark:hover:bg-[#92dfd3]">
                Solicitar novo link
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/login">
              <Button
                variant="outline"
                className="h-12 w-full rounded-2xl border-[#172033]/10 bg-white/55 text-sm font-bold text-[#172033] hover:-translate-y-0.5 hover:bg-white hover:shadow-lg dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao login
              </Button>
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell
        sideEyebrow="Acesso restabelecido para a rotina pedagógica"
        sideTitle="Sua nova senha já está ativa."
        sideDescription="Com a redefinição concluída, o próximo passo é voltar ao sistema e continuar o trabalho com avaliações, revisões e materiais."
        sideFeatures={features}
        sideSignals={trustSignals}
        cardEyebrow="Senha redefinida"
        cardTitle="Tudo pronto para entrar novamente."
        cardDescription="Sua senha foi atualizada com sucesso. Você será redirecionado para o login em instantes."
        footerNote="O SmartTest mantém o fluxo de recuperação mais seguro sem deixar a experiência fria ou confusa."
      >
        <div className="space-y-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.7rem] bg-[#172033] text-white shadow-[0_18px_45px_rgba(23,32,51,.18)] dark:bg-[#f7f1e7] dark:text-[#111827]">
            <CheckCircle2 className="h-8 w-8" />
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

  if (!emailConfirmed) {
    return (
      <AuthShell
        sideEyebrow="Confirmação extra para proteger a identidade da conta"
        sideTitle="Confirme o e-mail antes de criar a nova senha."
        sideDescription="Essa etapa adicional ajuda a garantir que o link está sendo usado pela pessoa certa, mantendo o fluxo institucional mais seguro."
        sideFeatures={features}
        sideSignals={trustSignals}
        cardEyebrow="Confirmação inicial"
        cardTitle="Digite o e-mail da recuperação."
        cardDescription="Antes de continuar, confirme o endereço que recebeu o link de redefinição."
        footerNote="Essa conferência evita trocas indevidas de senha em acessos compartilhados ou encaminhados por engano."
      >
        <form onSubmit={handleEmailConfirm} className="space-y-5" noValidate>
          {emailError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{emailError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirm-email" className="text-xs font-black uppercase tracking-[0.18em] text-[#48566a] dark:text-white/55">
              E-mail
            </Label>
            <Input
              id="confirm-email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
              className="h-13 rounded-2xl border-[#172033]/10 bg-white/78 px-4 text-base shadow-inner shadow-black/[0.02] transition focus-visible:ring-[#1f6f68] dark:border-white/10 dark:bg-white/[0.06]"
            />
            <p className="text-xs leading-5 text-[#667085] dark:text-white/46">
              Esta confirmação extra ajuda a garantir que é você quem está redefinindo a senha.
            </p>
          </div>

          <Button
            type="submit"
            className="group h-13 w-full rounded-2xl bg-[#172033] text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_45px_rgba(23,32,51,.28)] transition hover:-translate-y-0.5 hover:bg-[#1f6f68] dark:bg-[#f7f1e7] dark:text-[#111827] dark:hover:bg-[#92dfd3]"
          >
            Continuar
            <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      sideEyebrow="Redefina a senha e volte ao trabalho com clareza"
      sideTitle="Crie uma nova senha para seguir com a rotina."
      sideDescription="Escolha uma senha forte e finalize a recuperação para voltar a avaliações, revisões e materiais com o mínimo de atrito."
      sideFeatures={features}
      sideSignals={trustSignals}
      cardEyebrow="Nova senha"
      cardTitle="Crie sua nova senha."
      cardDescription="Use uma combinação forte e diferente da atual para concluir a recuperação com segurança."
      footerNote="A nova senha precisa ser segura o bastante para proteger o uso institucional do SmartTest."
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-black uppercase tracking-[0.18em] text-[#48566a] dark:text-white/55">
            Nova senha
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-13 rounded-2xl border-[#172033]/10 bg-white/78 px-4 pr-12 text-base shadow-inner shadow-black/[0.02] transition focus-visible:ring-[#1f6f68] dark:border-white/10 dark:bg-white/[0.06]"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-[#667085] transition hover:bg-[#172033]/5 hover:text-[#172033] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6f68] dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <RuleList password={password} />

        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-xs font-black uppercase tracking-[0.18em] text-[#48566a] dark:text-white/55">
            Confirme a nova senha
          </Label>
          <Input
            id="confirm"
            type={showPwd ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="h-13 rounded-2xl border-[#172033]/10 bg-white/78 px-4 text-base shadow-inner shadow-black/[0.02] transition focus-visible:ring-[#1f6f68] dark:border-white/10 dark:bg-white/[0.06]"
          />
          {confirm.length > 0 && !matches && (
            <p className="text-xs text-[#b42318] dark:text-[#fca5a5]">As senhas não coincidem.</p>
          )}
        </div>

        <Button
          type="submit"
          className="group h-13 w-full rounded-2xl bg-[#172033] text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_45px_rgba(23,32,51,.28)] transition hover:-translate-y-0.5 hover:bg-[#1f6f68] dark:bg-[#f7f1e7] dark:text-[#111827] dark:hover:bg-[#92dfd3]"
          disabled={!canSubmit}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Redefinir senha
          {!loading && <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />}
        </Button>
      </form>

      <div className="my-7 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#98a2b3]">
        <span className="h-px flex-1 bg-[#172033]/10 dark:bg-white/10" />
        Precisa voltar?
        <span className="h-px flex-1 bg-[#172033]/10 dark:bg-white/10" />
      </div>

      <Link
        to="/login"
        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#172033]/10 bg-white/55 text-sm font-bold text-[#172033] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6f68] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/10"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao login
      </Link>
    </AuthShell>
  );
}
