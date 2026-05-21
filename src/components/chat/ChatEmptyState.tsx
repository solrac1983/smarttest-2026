import { Button } from "@/components/ui/button";
import { MessageCirclePlus, Plus, Sparkles } from "lucide-react";

interface Props {
  onOpenNewChat: () => void;
  onOpenCreateGroup: () => void;
}

export function ChatEmptyState({ onOpenNewChat, onOpenCreateGroup }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_26%)]">
      <div className="max-w-xl w-full rounded-[2rem] border border-border/60 bg-card/90 backdrop-blur px-6 py-8 md:px-10 md:py-12 shadow-2xl shadow-primary/5 text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary/10 text-primary shadow-inner">
          <Sparkles className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black tracking-tight text-foreground">Suas conversas começam aqui</h3>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
            Selecione um contato, abra um grupo existente ou inicie uma nova conversa para trocar mensagens, anexos, áudios e orientações com sua equipe.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 text-left">
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground mb-2">Conversa direta</p>
            <p className="text-sm font-semibold text-foreground">Fale com professores e coordenação</p>
            <p className="text-xs text-muted-foreground mt-1">Abra um contato para enviar mensagens rápidas, arquivos e orientações pontuais.</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground mb-2">Trabalho em grupo</p>
            <p className="text-sm font-semibold text-foreground">Organize equipes e setores</p>
            <p className="text-xs text-muted-foreground mt-1">Crie grupos para turmas, coordenação, revisão de provas ou comunicação institucional.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" className="gap-2 rounded-2xl px-5 h-11" onClick={onOpenNewChat}>
            <MessageCirclePlus className="h-4 w-4" /> Nova Conversa
          </Button>
          <Button className="gap-2 rounded-2xl px-5 h-11" onClick={onOpenCreateGroup}>
            <Plus className="h-4 w-4" /> Criar Grupo
          </Button>
        </div>
      </div>
    </div>
  );
}
