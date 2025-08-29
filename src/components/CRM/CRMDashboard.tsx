import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Users, 
  Target, 
  TrendingUp,
  Calendar,
  DollarSign,
  Plus,
  Download
} from "lucide-react";
import LeadsManager from "./LeadsManager";
import ContactsManager from "./ContactsManager";
import OpportunitiesManager from "./OpportunitiesManager";
import InteractionsManager from "./InteractionsManager";
import SalesFunnel from "./SalesFunnel";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CRMDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalContacts: 0,
    totalOpportunities: 0,
    totalInteractions: 0,
    conversionRate: 0,
    pipelineValue: 0
  });

  const loadStats = async () => {
    if (!user) return;

    try {
      // Carregar leads
      const { data: leads } = await supabase
        .from('leads')
        .select('status')
        .eq('user_id', user.id);

      // Carregar contatos
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', user.id);

      // Carregar oportunidades
      const { data: opportunities } = await supabase
        .from('opportunities')
        .select('valor, estagio')
        .eq('user_id', user.id);

      // Carregar interações
      const { data: interactions } = await supabase
        .from('interactions')
        .select('id')
        .eq('user_id', user.id);

      const totalLeads = leads?.length || 0;
      const qualifiedLeads = leads?.filter(l => l.status === 'qualificado').length || 0;
      const closedOpportunities = opportunities?.filter(o => o.estagio === 'fechamento').length || 0;
      const conversionRate = totalLeads > 0 ? (closedOpportunities / totalLeads) * 100 : 0;
      const pipelineValue = opportunities?.reduce((sum, opp) => sum + (opp.valor || 0), 0) || 0;

      setStats({
        totalLeads,
        totalContacts: contacts?.length || 0,
        totalOpportunities: opportunities?.length || 0,
        totalInteractions: interactions?.length || 0,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        pipelineValue
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CRM Dashboard</h1>
          <p className="text-muted-foreground">
            Hub de prospecção inteligente com qualificação automática
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground">leads cadastrados</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contatos</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.totalContacts}</div>
            <p className="text-xs text-muted-foreground">contatos ativos</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.totalOpportunities}</div>
            <p className="text-xs text-muted-foreground">em andamento</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interações</CardTitle>
            <Calendar className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{stats.totalInteractions}</div>
            <p className="text-xs text-muted-foreground">realizadas</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
            <BarChart3 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">taxa de fechamento</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              R$ {stats.pipelineValue.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground">valor total</p>
          </CardContent>
        </Card>
      </div>

      {/* Funil de Vendas */}
      <SalesFunnel onStatsUpdate={loadStats} />

      {/* Tabs para gerenciar diferentes aspectos do CRM */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
          <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
          <TabsTrigger value="interactions">Interações</TabsTrigger>
        </TabsList>
        
        <TabsContent value="leads">
          <LeadsManager onStatsUpdate={loadStats} />
        </TabsContent>
        
        <TabsContent value="contacts">
          <ContactsManager onStatsUpdate={loadStats} />
        </TabsContent>
        
        <TabsContent value="opportunities">
          <OpportunitiesManager onStatsUpdate={loadStats} />
        </TabsContent>
        
        <TabsContent value="interactions">
          <InteractionsManager onStatsUpdate={loadStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CRMDashboard;