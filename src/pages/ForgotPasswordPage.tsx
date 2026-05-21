import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MessageCircleHeart,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";

const features = [
  {
    icon: ShieldCheck,
    title: "Recuperação protegida",
    text: "O processo de redefinição mantém o acesso institucional mais seguro para a equipe escolar.",
  },
  {
    icon: UsersRound,
    title: "Continuidade do fluxo",
    text: "Professores e coordenação retomam rapidamente a rotina sem perder o contexto do trabalho.",
  },
  {
    icon: MessageCircleHeart,
    title: "Orientação clara",
    text: "Cada etapa explica o que acontece para reduzir dúvidas durante a recuperação do acesso.",
  },
] as const;

const trustSignals = [
  { icon: CheckCircle2, label: "Link seguro enviado por e-mail" },
  { icon: Clock3, label: "Recuperação mais rápida" },
  { icon: Mail, label: "Confirmação pensada para o uso institucional" },
] as const;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(
        resetError.message.toLowerCase().includes("rate")
          ? "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."
          : "Não foi possível enviar o e-mail. Verifique o endereço e tente novamente."
      );
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <AuthShell
        sideEyebrow="Um retorno mais seguro para a sua rotina"
        sideTitle="O caminho de volta ao sistema já foi enviado."
        sideDescription="Se a conta existir, o SmartTest encaminha um link protegido para redefinir a senha sem quebrar o contexto institucional do acesso."
        sideFeatures={features}
        sideSignals={trustSignals}
        cardEyebrow="E-mail enviado"
        cardTitle="Verifique sua caixa de entrada."
        cardDescription={`Se existir uma conta para ${email}, enviamos um link para redefinir sua senha.`}
        footerNote="Caso não encontre a mensagem, vale conferir spam e promoções antes de solicitar um novo envio."
      >
        <div className="space-y-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.7rem] bg-[#172033] text-white shadow-[0_18px_45px_rgba(23,32,51,.18)] dark:bg-[#f7f1e7] dark:text-[#111827]">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="rounded-[1.7rem] border border-[#172033]/10 bg-white/55 px-4 py-4 text-sm leading-6 text-[#556276] shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white/60">
            Se não chegar em alguns minutos, tente novamente com atenção ao endereço informado.
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="h-12 rounded-2xl border-[#172033]/10 bg-white/55 text-sm font-bold text-[#172033] hover:-translate-y-0.5 hover:bg-white hover:shadow-lg dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/10"
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
            >
              Enviar para outro e-mail
            </Button>
            <Link to="/login">
              <Button className="group h-12 w-full rounded-2xl bg-[#172033] text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_45px_rgba(23,32,51,.24)] transition hover:-translate-y-0.5 hover:bg-[#1f6f68] dark:bg-[#f7f1e7] dark:text-[#111827] dark:hover:bg-[#92dfd3]">
                Voltar ao login
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      sideEyebrow="Recupere o acesso sem perder o ritmo da escola"
      sideTitle="Volte para o SmartTest com segurança."
      sideDescription="Informe o e-mail cadastrado para receber um link de recuperação e retomar provas, revisões e materiais com menos atrito."
      sideFeatures={features}
      sideSignals={trustSignals}
      cardEyebrow="Recuperar acesso"
      cardTitle="Esqueceu a senha?"
      cardDescription="Informe o e-mail cadastrado e enviaremos um link seguro para você criar uma nova senha."
      footerNote="Este acesso é destinado a instituições, professores e equipes pedagógicas autorizadas."
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-black uppercase tracking-[0.18em] text-[#48566a] dark:text-white/55">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-13 rounded-2xl border-[#172033]/10 bg-white/78 px-4 text-base shadow-inner shadow-black/[0.02] transition focus-visible:ring-[#1f6f68] dark:border-white/10 dark:bg-white/[0.06]"
          />
        </div>
        <Button
          type="submit"
          className="group h-13 w-full rounded-2xl bg-[#172033] text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_45px_rgba(23,32,51,.28)] transition hover:-translate-y-0.5 hover:bg-[#1f6f68] dark:bg-[#f7f1e7] dark:text-[#111827] dark:hover:bg-[#92dfd3]"
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Enviar link de recuperação
          {!loading && <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />}
        </Button>
      </form>

      <div className="my-7 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#98a2b3]">
        <span className="h-px flex-1 bg-[#172033]/10 dark:bg-white/10" />
        Lembrou da senha?
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
