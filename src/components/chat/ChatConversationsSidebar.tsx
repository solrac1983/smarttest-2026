import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatConversation, UserStatus } from "@/hooks/useChat";

interface ContactItem {
  id: string;
  name: string;
  role: string;
}

interface Props {
  hiddenOnMobile: boolean;
  isMobile: boolean;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  groupConversations: ChatConversation[];
  filteredContacts: ContactItem[];
  activeConversationId: string | null;
  unreadByConversation: Record<string, number>;
  groupParticipants: Record<string, string[]>;
  userId: string;
  getContactName: (id: string) => string;
  getContactRole: (id: string) => string;
  getInitials: (name: string) => string;
  openGroupConversation: (id: string) => void;
  openConversation: (contactId: string) => void;
  setActivePartnerIdState: (id: string) => void;
  contactStatuses: Record<string, UserStatus>;
  statusDot: (status: UserStatus, size?: "sm" | "md") => React.ReactNode;
  getConversationForContact: (contactId: string) => ChatConversation | undefined;
}

export function ChatConversationsSidebar({
  hiddenOnMobile,
  isMobile,
  searchTerm,
  onSearchTermChange,
  groupConversations,
  filteredContacts,
  activeConversationId,
  unreadByConversation,
  groupParticipants,
  userId,
  getContactName,
  getContactRole,
  getInitials,
  openGroupConversation,
  openConversation,
  setActivePartnerIdState,
  contactStatuses,
  statusDot,
  getConversationForContact,
}: Props) {
  if (hiddenOnMobile) return null;

  return (
    <div className={cn("border-r flex flex-col bg-card/90 backdrop-blur", isMobile ? "w-full" : "w-[360px]") }>
      <div className="p-4 border-b bg-muted/20 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder="Buscar no chat..."
            className="pl-9 h-10 rounded-xl bg-background border-border/60"
          />
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.16em]">
          <span>Conversas</span>
          <Badge variant="outline" className="rounded-full px-2 py-0">{groupConversations.length + filteredContacts.length}</Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {groupConversations.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.18em] px-2">Grupos</p>
              {groupConversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                const memberCount = (groupParticipants[conversation.id] ?? []).length;
                const unreadCount = unreadByConversation[conversation.id] ?? 0;

                return (
                  <button
                    key={conversation.id}
                    onClick={() => openGroupConversation(conversation.id)}
                    className={cn(
                      "w-full rounded-2xl border px-3 py-3 text-left transition-all duration-200",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "border-border/60 bg-background hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", isActive ? "bg-white/15" : "bg-primary/10 text-primary") }>
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold">{conversation.group_name || "Grupo"}</p>
                          {unreadCount > 0 && <Badge className={cn("rounded-full px-2", isActive ? "bg-white/20 text-white" : "bg-primary text-white")}>{unreadCount > 99 ? "99+" : unreadCount}</Badge>}
                        </div>
                        <p className={cn("text-xs mt-1", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>{memberCount} participante(s)</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            {filteredContacts.length > 0 && <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.18em] px-2">Contatos</p>}
            {filteredContacts.map((contact) => {
              const conversation = getConversationForContact(contact.id);
              const isActive = conversation?.id === activeConversationId;
              const status = contactStatuses[contact.id] || "offline";
              const unreadCount = conversation ? (unreadByConversation[conversation.id] ?? 0) : 0;

              return (
                <button
                  key={contact.id}
                  onClick={() => { setActivePartnerIdState(contact.id); openConversation(contact.id); }}
                  className={cn(
                    "w-full rounded-2xl border px-3 py-3 text-left transition-all duration-200",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "border-border/60 bg-background hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-11 w-11 rounded-2xl border border-border/50">
                        <AvatarFallback className={cn("rounded-2xl font-bold", isActive ? "bg-white/15 text-white" : "bg-primary/10 text-primary")}>{getInitials(contact.name)}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5">{statusDot(status)}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold">{contact.name}</p>
                        {unreadCount > 0 && <Badge className={cn("rounded-full px-2", isActive ? "bg-white/20 text-white" : "bg-primary text-white")}>{unreadCount > 99 ? "99+" : unreadCount}</Badge>}
                      </div>
                      <p className={cn("text-xs mt-1 truncate", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>{getContactRole(contact.id) || contact.role || "Contato"}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredContacts.length === 0 && groupConversations.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center">
              <Search className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold">Nada encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">Tente buscar por outro nome, grupo ou palavra-chave.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
