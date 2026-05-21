import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Compass, Loader2, MessageSquareText, Send, Sparkles, User } from "lucide-react";
import { invokeFunction } from "@/lib/invokeFunction";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const quickPrompts = [
  "Como criar uma nova avaliação?",
  "Como funciona o fluxo de simulados?",
  "Como lançar notas e frequência?",
  "Como exportar provas e relatórios?",
];

export function HelpChatbot() {
  const { role } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou o assistente de ajuda do SmartTest. Posso explicar rotas, fluxos e boas práticas de uso do sistema.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const { data, error } = await invokeFunction<{ reply?: string }>("help-assistant", {
      body: {
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        userRole: role,
      },
      silent: true,
    });
    if (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Ocorreu um erro ao processar sua pergunta. Tente novamente." },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data?.reply || "Desculpe, não consegui processar sua pergunta." },
      ]);
    }
    setLoading(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    await sendMessage(text);
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const { data, error } = await invokeFunction<{ reply?: string }>("help-assistant", {
      body: {
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        userRole: role,
      },
      silent: true,
    });
    if (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Ocorreu um erro ao processar sua pergunta. Tente novamente." },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data?.reply || "Desculpe, não consegui processar sua pergunta." },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[420px]">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Assistente SmartTest</p>
            <p className="text-[11px] text-muted-foreground">Respostas guiadas sobre módulos, fluxos e tarefas reais do sistema</p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Sparkles className="h-3 w-3" /> IA
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {quickPrompts.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            className="justify-start h-auto whitespace-normal text-left text-xs py-2.5 rounded-xl"
            onClick={() => sendMessage(prompt)}
            disabled={loading}
          >
            <Compass className="h-3.5 w-3.5 mr-2 shrink-0" />
            {prompt}
          </Button>
        ))}
      </div>

      <ScrollArea className="flex-1 pr-3" ref={scrollRef as any}>
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
              )}
              <div
                className={`rounded-xl px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="h-3 w-3" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-3 w-3 text-primary" />
              </div>
              <div className="bg-muted rounded-xl px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 mt-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte algo sobre o sistema..."
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
