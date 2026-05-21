import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, CreditCard, Building2, CalendarClock, TrendingUp, Plus, Pencil, Trash2,
  AlertTriangle, CheckCircle2, Clock, Loader2, Search, X, BarChart3, Wallet,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import PaymentMethodsSection from "@/components/financeiro/PaymentMethodsSection";
import InvoicesSection from "@/components/financeiro/InvoicesSection";
import FinancialOverview from "@/components/financeiro/FinancialOverview";
import DueAlertsSection from "@/components/financeiro/DueAlertsSection";
import { FinanceiroSkeleton } from "@/components/PageSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";

export default function FinanceiroPage() {
  const { role, loading: authLoading } = useAuth();

  if (authLoading) return <FinanceiroSkeleton />;
  if (role !== "super_admin") return null;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Financeiro"
        badge="Gestão Financeira"
        icon={DollarSign}
        description="Gerencie pagamentos, vencimentos e a saúde financeira das empresas parceiras com mais clareza e espaço para leitura."
        className="shadow-xl shadow-primary/10"
      />

      <div className="surface-elevated rounded-[2rem] p-5 md:p-6 shadow-md space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Leitura financeira</p>
          <h2 className="text-2xl md:text-[2rem] font-black tracking-tight text-foreground mt-2">Pagamentos, alertas e meios de cobrança no mesmo fluxo</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
            Navegue pelas abas para acompanhar panorama financeiro, vencimentos críticos e a estrutura de cobrança com um layout mais amplo e limpo.
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-2 flex-wrap h-auto gap-2 bg-secondary/40 p-1.5 rounded-2xl">
          <TabsTrigger value="overview" className="gap-1.5 rounded-xl">
            <TrendingUp className="h-3 w-3" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5 rounded-xl">
            <Wallet className="h-3 w-3" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5 rounded-xl">
            <AlertTriangle className="h-3 w-3" />
            Vencimentos
          </TabsTrigger>
          <TabsTrigger value="methods" className="gap-1.5 rounded-xl">
            <CreditCard className="h-3 w-3" />
            Meios de Pagamento
          </TabsTrigger>
        </TabsList>

          <TabsContent value="overview"><FinancialOverview /></TabsContent>
          <TabsContent value="invoices"><InvoicesSection /></TabsContent>
          <TabsContent value="alerts"><DueAlertsSection /></TabsContent>
          <TabsContent value="methods"><PaymentMethodsSection /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
