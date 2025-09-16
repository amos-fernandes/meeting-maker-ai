import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  X, 
  Crown, 
  AlertCircle, 
  MessageSquare, 
  TrendingUp,
  Lock,
  Zap
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface InAppCommunicationProps {
  userPlan: 'gratuito' | 'pro' | 'enterprise';
  leadsUsed: number;
  leadsLimit: number;
  trialDaysLeft?: number;
  onUpgrade: () => void;
}

const InAppCommunication = ({ 
  userPlan, 
  leadsUsed, 
  leadsLimit, 
  trialDaysLeft, 
  onUpgrade 
}: InAppCommunicationProps) => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([]);
  const { user } = useAuth();

  // Calcular percentual de uso
  const usagePercentage = (leadsUsed / leadsLimit) * 100;
  const isNearLimit = usagePercentage >= 85;
  const isAtLimit = leadsUsed >= leadsLimit;

  // Verificar se deve mostrar feedback modal (após 3ª busca)
  useEffect(() => {
    const showFeedbackAfterActions = async () => {
      if (leadsUsed === 3 && !showFeedbackModal) {
        // Verificar se já mostrou feedback antes
        const { data: feedbackHistory } = await supabase
          .from('campaign_knowledge')
          .select('*')
          .eq('user_id', user?.id)
          .ilike('content', '%feedback%')
          .limit(1);

        if (!feedbackHistory?.length) {
          setTimeout(() => setShowFeedbackModal(true), 2000);
        }
      }
    };

    if (user && leadsUsed > 0) {
      showFeedbackAfterActions();
    }
  }, [leadsUsed, user, showFeedbackModal]);

  const handleDismissBanner = (bannerId: string) => {
    setDismissedBanners(prev => [...prev, bannerId]);
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim() || !user) return;

    try {
      await supabase
        .from('campaign_knowledge')
        .insert({
          user_id: user.id,
          content: `Feedback do usuário: ${feedback}`,
        });
      
      setShowFeedbackModal(false);
      setFeedback("");
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
    }
  };

  const renderTrialBanner = () => {
    if (userPlan !== 'pro' || !trialDaysLeft || dismissedBanners.includes('trial')) return null;

    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary to-primary-glow text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5" />
            <span className="font-medium">
              Você está no seu teste gratuito. Faltam {trialDaysLeft} dias. 
              Faça o upgrade para desbloquear recursos avançados.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={onUpgrade}
              className="bg-white text-primary hover:bg-white/90"
            >
              Fazer Upgrade
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleDismissBanner('trial')}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderUsageBanner = () => {
    if (!isNearLimit || dismissedBanners.includes('usage')) return null;

    const bannerColor = isAtLimit ? 'bg-destructive' : 'bg-amber-500';
    const textColor = 'text-white';

    return (
      <div className={`fixed top-16 left-0 right-0 z-40 ${bannerColor} ${textColor} p-4 shadow-lg`}>
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">
              {isAtLimit 
                ? `Você atingiu seu limite de ${leadsLimit} leads este mês.`
                : `Você já usou ${leadsUsed} de ${leadsLimit} leads.`
              } {userPlan === 'gratuito' ? 'Faça o upgrade para continuar prospectando.' : 'Considere fazer upgrade para o próximo plano.'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={onUpgrade}
              className="bg-white text-primary hover:bg-white/90"
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Fazer Upgrade
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleDismissBanner('usage')}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderFeedbackModal = () => {
    if (!showFeedbackModal) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">
                Amamos ter você aqui! 🎉
              </h3>
              <p className="text-muted-foreground">
                O que podemos fazer para melhorar o Leados AI?
              </p>
            </div>
            
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Compartilhe suas ideias, sugestões ou críticas..."
              className="mb-4"
              rows={4}
            />
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowFeedbackModal(false)}
              >
                Agora Não
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSubmitFeedback}
                disabled={!feedback.trim()}
              >
                Enviar Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderUsageIndicator = () => {
    return (
      <div className="bg-card border rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Leads gerados este mês</span>
          <Badge variant={isNearLimit ? "destructive" : "secondary"}>
            {leadsUsed}/{leadsLimit}
          </Badge>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2 mb-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isAtLimit ? 'bg-destructive' : 
              isNearLimit ? 'bg-amber-500' : 
              'bg-primary'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
        
        {userPlan === 'gratuito' && (
          <div className="text-xs text-muted-foreground">
            Upgrade para o Plano Pro para ter acesso a 500 leads/mês
          </div>
        )}
      </div>
    );
  };

  const renderFreemiumRestrictions = () => {
    if (userPlan !== 'gratuito') return null;

    const restrictions = [
      { feature: "Exportar para CRM", icon: Lock },
      { feature: "Dados enriquecidos", icon: Lock },
      { feature: "Integração WhatsApp", icon: Lock },
      { feature: "Análise de tecnologias", icon: Lock }
    ];

    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-800 dark:text-amber-200">
              Recursos Premium
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            {restrictions.map((restriction, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <restriction.icon className="h-4 w-4" />
                <span>{restriction.feature}</span>
              </div>
            ))}
          </div>
          
          <Button className="w-full" onClick={onUpgrade}>
            <Zap className="h-4 w-4 mr-2" />
            Upgrade para Pro
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {renderTrialBanner()}
      {renderUsageBanner()}
      {renderFeedbackModal()}
      
      <div className="space-y-4">
        {renderUsageIndicator()}
        {renderFreemiumRestrictions()}
      </div>
    </>
  );
};

export default InAppCommunication;