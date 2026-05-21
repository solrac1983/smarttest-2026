import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { MessageCircle, MessageCirclePlus, Plus, Search, Users } from "lucide-react";

interface Props {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onOpenNewChat: () => void;
  onOpenCreateGroup: () => void;
  conversationsCount: number;
  unreadCount: number;
  hiddenOnMobile: boolean;
}

export function ChatPageHeader({
  searchTerm,
  onSearchTermChange,
  onOpenNewChat,
  onOpenCreateGroup,
  conversationsCount,
  unreadCount,
  hiddenOnMobile,
}: Props) {
  if (hiddenOnMobile) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Chat"
        badge="Comunicação interna"
        icon={MessageCircle}
        description="Converse com professores, coordenação e grupos da escola com mensagens, anexos, áudio e transcrição integrada."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={onOpenNewChat} className="gap-2 rounded-2xl bg-white text-primary hover:bg-white/90 shadow-lg shadow-black/10 border border-white/70">
              <MessageCirclePlus className="h-4 w-4" /> Nova conversa
            </Button>
            <Button onClick={onOpenCreateGroup} className="gap-2 rounded-2xl">
              <Plus className="h-4 w-4" /> Novo grupo
            </Button>
          </div>
        }
      />

      <div className="rounded-[1.5rem] border border-border/60 bg-card/70 p-4 shadow-md backdrop-blur">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary" className="rounded-full px-3 py-1">{conversationsCount} conversas</Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1">{unreadCount} não lidas</Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1">Áudio, anexos e transcrição</Badge>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/80 p-4 backdrop-blur">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
