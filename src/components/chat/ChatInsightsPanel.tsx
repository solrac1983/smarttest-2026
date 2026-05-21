import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Props {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  conversationsCount: number;
  unreadCount: number;
}

export function ChatInsightsPanel({
  searchTerm,
  onSearchTermChange,
  conversationsCount,
  unreadCount,
}: Props) {
  return (
    <aside className="w-full xl:w-[320px] shrink-0">
      <Card className="rounded-[2rem] border border-border/60 bg-card/90 shadow-lg backdrop-blur sticky top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resumo do chat</CardTitle>
          <p className="text-sm text-muted-foreground">Acompanhe rapidamente conversas ativas, mensagens pendentes e use a busca global.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <StatCard label="Conversas" value={String(conversationsCount)} description="Threads ativas para acompanhamento" />
            <StatCard label="Não lidas" value={String(unreadCount)} description="Mensagens esperando resposta" />
            <StatCard label="Recursos" value="Áudio + anexos" description="Envio, transcrição e compartilhamento" />
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                placeholder="Buscar conversas, grupos ou contatos..."
                className="pl-9 h-11 rounded-xl bg-background border-border/60"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">Mensagens rápidas</Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">Busca unificada</Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">Grupos e equipes</Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">Transcrição de áudio</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

function StatCard({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
