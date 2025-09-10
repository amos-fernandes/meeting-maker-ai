import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Send, 
  Phone, 
  Mail, 
  MessageSquare, 
  CheckCircle, 
  Clock,
  Eye,
  TrendingUp
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  target_companies: string[];
  created_at: string;
}

interface CampaignScript {
  id: string;
  empresa: string;
  roteiro_ligacao: string;
  modelo_email: string;
  assunto_email: string;
  status: string;
  whatsapp_sent: boolean;
  email_sent: boolean;
  call_made: boolean;
}

const CampaignManager = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignScripts, setCampaignScripts] = useState<CampaignScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleLaunchCampaign = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!user) return;

    try {
      setActionLoading('launch');
      
      const { data, error } = await supabase.functions.invoke('launch-campaign', {
        body: { userId: user.id }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        loadCampaigns();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erro ao disparar campanha:', error);
      toast.error(error.message || "Erro ao disparar campanha");
    } finally {
      setActionLoading(null);
    }
  };

  const loadCampaigns = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      toast.error("Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignScripts = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaign_scripts')
        .select('*')
        .eq('campaign_id', campaignId);

      if (error) throw error;
      setCampaignScripts(data || []);
    } catch (error) {
      console.error('Erro ao carregar roteiros:', error);
      toast.error("Erro ao carregar roteiros da campanha");
    }
  };

  const handleTriggerEmails = async (campaignId: string) => {
    setActionLoading('email');
    try {
      const { data, error } = await supabase.functions.invoke('email-campaign', {
        body: { campaignId, userId: user?.id }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`E-mails enviados para ${data.sentCount} empresas`);
        loadCampaignScripts(campaignId);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erro ao enviar e-mails:', error);
      toast.error("Erro ao enviar e-mails da campanha");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerWhatsAppPromo = async (campaignId: string) => {
    setActionLoading('whatsapp-promo');
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-promo', {
        body: { campaignId, userId: user?.id, promoType: 'consultoria' }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Promo-campanha WhatsApp enviada! ${data.sentCount} mensagens preparadas para ${data.atendimentoNumber}`);
        loadCampaignScripts(campaignId);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erro ao enviar promo WhatsApp:', error);
      toast.error("Erro ao enviar promo-campanha WhatsApp");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerWhatsApp = async (campaignId: string) => {
    setActionLoading('whatsapp');
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-campaign', {
        body: { campaignId, userId: user?.id }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`WhatsApp enviado para ${data.sentCount} empresas`);
        loadCampaignScripts(campaignId);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      toast.error("Erro ao enviar mensagens WhatsApp");
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [user]);

  useEffect(() => {
    if (selectedCampaign) {
      loadCampaignScripts(selectedCampaign.id);
    }
  }, [selectedCampaign]);

  const getStatusBadge = (status: string) => {
    const variants = {
      'ativa': 'default',
      'pausada': 'secondary',
      'concluida': 'destructive'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getProgressStats = (scripts: CampaignScript[]) => {
    const total = scripts.length;
    const whatsappSent = scripts.filter(s => s.whatsapp_sent).length;
    const emailsSent = scripts.filter(s => s.email_sent).length;
    const callsMade = scripts.filter(s => s.call_made).length;
    
    return { total, whatsappSent, emailsSent, callsMade };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary">Carregando campanhas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Gerenciador de Campanhas</h2>
          <p className="text-muted-foreground">
            Campanhas de prospecção com WhatsApp, e-mail e acompanhamento IA
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={(e) => handleLaunchCampaign(e)}
            disabled={actionLoading === 'launch'}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            type="button"
          >
            <Send className="h-4 w-4 mr-2" />
            {actionLoading === 'launch' ? 'Disparando...' : 'Disparar Campanha'}
          </Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma campanha encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Clique em "Disparar Campanha" no topo da página para criar sua primeira campanha
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Campanhas */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Suas Campanhas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedCampaign?.id === campaign.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{campaign.name}</h4>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {campaign.target_companies.length} empresas
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Detalhes da Campanha */}
          <div className="lg:col-span-2">
            {selectedCampaign ? (
              <div className="space-y-6">
                {/* Stats da Campanha */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      {selectedCampaign.name}
                    </CardTitle>
                    <p className="text-muted-foreground">
                      {selectedCampaign.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {campaignScripts.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(() => {
                          const stats = getProgressStats(campaignScripts);
                          return (
                            <>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-primary">{stats.total}</div>
                                <div className="text-sm text-muted-foreground">Total</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-success">{stats.whatsappSent}</div>
                                <div className="text-sm text-muted-foreground">WhatsApp</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-info">{stats.emailsSent}</div>
                                <div className="text-sm text-muted-foreground">E-mails</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-warning">{stats.callsMade}</div>
                                <div className="text-sm text-muted-foreground">Ligações</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleTriggerWhatsApp(selectedCampaign.id)}
                        disabled={actionLoading === 'whatsapp'}
                        size="sm"
                        className="bg-success hover:bg-success/90"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {actionLoading === 'whatsapp' ? 'Enviando...' : 'Enviar WhatsApp'}
                      </Button>
                      <Button
                        onClick={() => handleTriggerWhatsAppPromo(selectedCampaign.id)}
                        disabled={actionLoading === 'whatsapp-promo'}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {actionLoading === 'whatsapp-promo' ? 'Enviando...' : 'Promo WhatsApp'}
                      </Button>
                      <Button
                        onClick={() => handleTriggerEmails(selectedCampaign.id)}
                        disabled={actionLoading === 'email'}
                        size="sm"
                        variant="outline"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {actionLoading === 'email' ? 'Enviando...' : 'Enviar E-mails'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabela de Roteiros */}
                <Card>
                  <CardHeader>
                    <CardTitle>Roteiros de Prospecção</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>WhatsApp</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Ligação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaignScripts.map((script) => (
                          <TableRow key={script.id}>
                            <TableCell className="font-medium">{script.empresa}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{script.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {script.whatsapp_sent ? (
                                <CheckCircle className="h-4 w-4 text-success" />
                              ) : (
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell>
                              {script.email_sent ? (
                                <CheckCircle className="h-4 w-4 text-success" />
                              ) : (
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell>
                              {script.call_made ? (
                                <CheckCircle className="h-4 w-4 text-success" />
                              ) : (
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Selecione uma campanha</h3>
                  <p className="text-muted-foreground">
                    Clique em uma campanha à esquerda para ver os detalhes
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManager;