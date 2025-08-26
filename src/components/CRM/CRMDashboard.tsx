import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Target, 
  Calendar, 
  TrendingUp,
  Plus,
  Download,
  Building2,
  Mail,
  Phone
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import LeadsManager from "./LeadsManager";
import ContactsManager from "./ContactsManager";
import OpportunitiesManager from "./OpportunitiesManager";
import InteractionsManager from "./InteractionsManager";

interface CRMStats {
  leads: number;
  contacts: number;
  opportunities: number;
  interactions: number;
  pipelineValue: number;
}

const CRMDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<CRMStats>({
    leads: 0,
    contacts: 0,
    opportunities: 0,
    interactions: 0,
    pipelineValue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCRMStats();
    }
  }, [user]);

  const loadCRMStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Buscar estatísticas do CRM
      const [leadsResult, contactsResult, opportunitiesResult, interactionsResult] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('contacts').select('*', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('opportunities').select('valor').eq('user_id', user.id),
        supabase.from('interactions').select('*', { count: 'exact' }).eq('user_id', user.id)
      ]);

      // Calcular valor total do pipeline
      const pipelineValue = opportunitiesResult.data?.reduce((sum, opp) => sum + (opp.valor || 0), 0) || 0;

      setStats({
        leads: leadsResult.count || 0,
        contacts: contactsResult.count || 0,
        opportunities: opportunitiesResult.data?.length || 0,
        interactions: interactionsResult.count || 0,
        pipelineValue
      });

    } catch (error) {
      console.error('Erro ao carregar estatísticas do CRM:', error);
      toast.error('Erro ao carregar dados do CRM');
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = () => {
    loadCRMStats();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando CRM...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header do CRM */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">CRM Interno</h2>
          <p className="text-muted-foreground">Gerencie leads, contatos e oportunidades</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.leads}</div>
            <p className="text-xs text-muted-foreground">leads cadastrados</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contatos</CardTitle>
            <Building2 className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.contacts}</div>
            <p className="text-xs text-muted-foreground">contatos ativos</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
            <Target className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.opportunities}</div>
            <p className="text-xs text-muted-foreground">em andamento</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              R$ {stats.pipelineValue.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground">valor total</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs do CRM */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Contatos
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Oportunidades
          </TabsTrigger>
          <TabsTrigger value="interactions" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Interações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <LeadsManager onStatsUpdate={refreshStats} />
        </TabsContent>

        <TabsContent value="contacts">
          <ContactsManager onStatsUpdate={refreshStats} />
        </TabsContent>

        <TabsContent value="opportunities">
          <OpportunitiesManager onStatsUpdate={refreshStats} />
        </TabsContent>

        <TabsContent value="interactions">
          <InteractionsManager onStatsUpdate={refreshStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CRMDashboard;