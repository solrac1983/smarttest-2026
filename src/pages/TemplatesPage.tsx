import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TemplateFolder } from "@/components/templates/TemplateFolderManager";
import { HeadersTab } from "@/components/templates/HeadersTab";
import { DocumentsTab } from "@/components/templates/DocumentsTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen, Image as ImageIcon, FileText, FileEdit,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [headerFolders, setHeaderFolders] = useState<TemplateFolder[]>([]);
  const [headerActiveFolderId, setHeaderActiveFolderId] = useState<string | null>(null);
  const [docFolders, setDocFolders] = useState<TemplateFolder[]>([]);
  const [docActiveFolderId, setDocActiveFolderId] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <PageHeader
        title="Modelos"
        badge="Recursos de Design"
        icon={BookOpen}
        description="Gerencie cabeçalhos de provas e modelos de documentos para padronização."
        actions={
          <Button 
            onClick={() => navigate("/provas/editor")} 
            variant="secondary"
            className="gap-1.5 shadow-md bg-white text-primary hover:bg-white/90 h-10 rounded-xl"
          >
            <FileEdit className="h-4 w-4" />
            Criar modelo no editor
          </Button>
        }
      />

      <Tabs defaultValue="cabecalhos" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="cabecalhos" className="gap-1.5">
            <ImageIcon className="h-3 w-3" />
            Cabeçalhos
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-1.5">
            <FileText className="h-3 w-3" />
            Modelos de Provas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cabecalhos">
          <HeadersTab
            folders={headerFolders}
            setFolders={setHeaderFolders}
            activeFolderId={headerActiveFolderId}
            setActiveFolderId={setHeaderActiveFolderId}
          />
        </TabsContent>
        <TabsContent value="documentos">
          <DocumentsTab
            folders={docFolders}
            setFolders={setDocFolders}
            activeFolderId={docActiveFolderId}
            setActiveFolderId={setDocActiveFolderId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
