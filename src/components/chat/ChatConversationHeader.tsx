import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MoreVertical, Search, Users } from "lucide-react";
import type { ChatConversation, UserStatus } from "@/hooks/useChat";

interface Props {
  isMobile: boolean;
  isGroupConv: boolean;
  activeConv?: ChatConversation;
  resolvedOtherId: string | null;
  getContactName: (id: string) => string;
  getInitials: (name: string) => string;
  activeGroupMembers: string[];
  userId: string;
  getContactRole: (id: string) => string;
  contactStatuses: Record<string, UserStatus>;
  statusDot: (status: UserStatus, size?: "sm" | "md") => React.ReactNode;
  onBackMobile: () => void;
  msgSearchOpen: boolean;
  onToggleSearch: () => void;
  onManageMembers: () => void;
  onStartMultiForward: () => void;
}

export function ChatConversationHeader({
  isMobile,
  isGroupConv,
  activeConv,
  resolvedOtherId,
  getContactName,
  getInitials,
  activeGroupMembers,
  getContactRole,
  contactStatuses,
  statusDot,
  onBackMobile,
  msgSearchOpen,
  onToggleSearch,
  onManageMembers,
  onStartMultiForward,
}: Props) {
  const conversationName = isGroupConv ? activeConv?.group_name || "Grupo" : getContactName(resolvedOtherId || "");
  const conversationStatus = !isGroupConv && resolvedOtherId ? contactStatuses[resolvedOtherId] || "offline" : null;
  const membersPreview = activeGroupMembers.slice(0, 3).map((id) => getContactName(id)).join(", ");
  const membersSuffix = activeGroupMembers.length > 3 ? ` +${activeGroupMembers.length - 3}` : "";

  return (
    <div className="h-[84px] border-b border-border/60 flex items-center justify-between px-4 md:px-6 bg-card/90 backdrop-blur shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        {isMobile && (
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl text-muted-foreground -ml-1" onClick={onBackMobile}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="relative shrink-0">
          <Avatar className="h-12 w-12 rounded-2xl border border-border/60 shadow-sm">
            <AvatarFallback className="rounded-2xl text-xs font-bold bg-primary/10 text-primary">
              {isGroupConv ? <Users className="h-5 w-5" /> : getInitials(conversationName)}
            </AvatarFallback>
          </Avatar>
          {!isGroupConv && conversationStatus && (
            <div className="absolute -bottom-0.5 -right-0.5">{statusDot(conversationStatus)}</div>
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm md:text-base font-bold truncate text-foreground">{conversationName}</p>
            {isGroupConv ? (
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px]">Grupo</Badge>
            ) : (
              conversationStatus && <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px]">{conversationStatus}</Badge>
            )}
          </div>
          <p className="text-[11px] md:text-xs text-muted-foreground truncate">
            {isGroupConv
              ? `${activeGroupMembers.length} participante(s): ${membersPreview || "Somente você"}${membersSuffix}`
              : `${getContactRole(resolvedOtherId || "") || "Contato"}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="icon" aria-label="Alternar busca na conversa" aria-expanded={msgSearchOpen} className={msgSearchOpen ? "h-10 w-10 rounded-2xl text-primary bg-primary/10" : "h-10 w-10 rounded-2xl text-muted-foreground"} onClick={onToggleSearch}>
          <Search className="h-4 w-4" />
        </Button>
        {isGroupConv && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl text-muted-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onManageMembers} className="gap-2">
                <Users className="h-4 w-4" /> Gerenciar membros
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onStartMultiForward} className="gap-2">
                Encaminhar em lote
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
