import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ImageIcon, Mic, Paperclip, Pencil, Send, X } from "lucide-react";

interface Props {
  editingText?: string | null;
  text: string;
  sending: boolean;
  isRecording: boolean;
  recordingTime: string;
  onTextChange: (value: string) => void;
  onSend: () => void;
  onCancelEdit: () => void;
  onOpenImage: () => void;
  onOpenFile: () => void;
  onStartRecording: () => void;
  onCancelRecording: () => void;
  onStopRecording: () => void;
}

export function ChatComposer({
  editingText,
  text,
  sending,
  isRecording,
  recordingTime,
  onTextChange,
  onSend,
  onCancelEdit,
  onOpenImage,
  onOpenFile,
  onStartRecording,
  onCancelRecording,
  onStopRecording,
}: Props) {
  return (
    <div className="border-t border-border/60 p-4 bg-card/90 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto">
        {editingText && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-2xl border border-primary/15 bg-primary/5">
            <Pencil className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <p className="text-xs text-foreground truncate flex-1">Editando: {editingText}</p>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-xl" onClick={onCancelEdit}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {isRecording ? (
          <div className="flex items-center gap-3 rounded-[1.5rem] px-4 py-3 border border-destructive/20 bg-destructive/10">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl text-destructive hover:text-destructive" onClick={onCancelRecording}>
              <X className="h-4 w-4" />
            </Button>
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <span className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-mono font-semibold text-destructive shrink-0">{recordingTime}</span>
              <div className="flex-1 h-10 rounded-2xl bg-destructive/10 border border-destructive/10 flex items-center gap-1 px-2 overflow-hidden">
                {Array.from({ length: 18 }).map((_, index) => (
                  <div key={index} className="w-1 rounded-full bg-destructive/40" style={{ height: `${(index % 6) * 5 + 10}px` }} />
                ))}
              </div>
            </div>
            <Button size="sm" className="rounded-2xl px-4 h-10 bg-primary" onClick={onStopRecording}>
              <Send className="h-4 w-4 mr-1.5" /> Enviar
            </Button>
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-border/60 bg-background/90 shadow-sm px-3 py-3 flex items-center gap-2">
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" aria-label="Enviar imagem" className="h-10 w-10 rounded-2xl text-muted-foreground hover:text-primary" onClick={onOpenImage} disabled={sending}>
                <ImageIcon className="h-[18px] w-[18px]" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Anexar arquivo" className="h-10 w-10 rounded-2xl text-muted-foreground hover:text-primary" onClick={onOpenFile} disabled={sending}>
                <Paperclip className="h-[18px] w-[18px]" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Gravar áudio" className="h-10 w-10 rounded-2xl text-muted-foreground hover:text-primary" onClick={onStartRecording} disabled={sending}>
                <Mic className="h-[18px] w-[18px]" />
              </Button>
            </div>
            <div className="flex-1 min-w-0">
              <Input
                placeholder={editingText ? "Editar mensagem..." : "Escreva uma mensagem, orientação ou atualização..."}
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
                className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0 px-2"
                disabled={sending}
              />
            </div>
            <Button
              size="icon"
              className={cn(
                "h-11 w-11 rounded-2xl shrink-0 transition-all shadow-md",
                text.trim()
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-muted text-muted-foreground shadow-none"
              )}
              onClick={onSend}
              disabled={!text.trim() || sending}
            >
              {editingText ? <Pencil className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
