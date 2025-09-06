import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Send, 
  Phone, 
  User,
  Bot,
  Activity,
  Clock,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: Date;
  type: 'incoming' | 'outgoing';
  status: 'sent' | 'delivered' | 'read';
  leadName?: string;
  phoneNumber?: string;
}

interface WhatsAppActivity {
  id: string;
  type: 'message' | 'call' | 'lead_created';
  description: string;
  timestamp: Date;
  status: 'success' | 'pending' | 'error';
}

const WhatsAppInterface = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [activities, setActivities] = useState<WhatsAppActivity[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadWhatsAppData();
      setupRealtimeSubscription();
    }
  }, [user]);

  const loadWhatsAppData = async () => {
    if (!user) return;

    try {
      // Carregar mensagens do WhatsApp (simuladas por enquanto)
      const mockMessages: WhatsAppMessage[] = [
        {
          id: '1',
          from: '+5562999887766',
          to: '+5562988776655',
          message: 'Olá! Gostaria de saber mais sobre consultoria tributária.',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          type: 'incoming',
          status: 'read',
          leadName: 'João Silva',
          phoneNumber: '+5562999887766'
        },
        {
          id: '2',
          from: '+5562988776655',
          to: '+5562999887766',
          message: 'Olá João! Posso te ajudar com consultoria tributária. Em qual área você tem mais interesse?',
          timestamp: new Date(Date.now() - 1000 * 60 * 28),
          type: 'outgoing',
          status: 'read'
        }
      ];

      const mockActivities: WhatsAppActivity[] = [
        {
          id: '1',
          type: 'message',
          description: 'Mensagem recebida de João Silva (+5562999887766)',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          status: 'success'
        },
        {
          id: '2',
          type: 'lead_created',
          description: 'Lead criado automaticamente: João Silva',
          timestamp: new Date(Date.now() - 1000 * 60 * 25),
          status: 'success'
        }
      ];

      setMessages(mockMessages);
      setActivities(mockActivities);
      setIsConnected(true);

    } catch (error) {
      console.error('Erro ao carregar dados do WhatsApp:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do WhatsApp",
        variant: "destructive"
      });
    }
  };

  const setupRealtimeSubscription = () => {
    // Aqui configuraria a subscription em tempo real
    // Por enquanto simular atividade a cada 30 segundos
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newActivity: WhatsAppActivity = {
          id: Date.now().toString(),
          type: 'message',
          description: `Nova interação detectada`,
          timestamp: new Date(),
          status: 'success'
        };
        setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
      }
    }, 30000);

    return () => clearInterval(interval);
  };

  const sendWhatsAppMessage = async () => {
    if (!newMessage.trim() || !phoneNumber.trim()) {
      toast({
        title: "Erro",
        description: "Preencha o número e a mensagem",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Simular envio via edge function WhatsApp
      const { data, error } = await supabase.functions.invoke('whatsapp-campaign', {
        body: {
          phoneNumber,
          message: newMessage,
          userId: user?.id
        }
      });

      if (error) throw error;

      const sentMessage: WhatsAppMessage = {
        id: Date.now().toString(),
        from: '+5562988776655',
        to: phoneNumber,
        message: newMessage,
        timestamp: new Date(),
        type: 'outgoing',
        status: 'sent'
      };

      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');

      // Adicionar à base de conhecimento
      await storeInteractionInKnowledge(newMessage, 'outgoing');

      toast({
        title: "Sucesso",
        description: "Mensagem enviada com sucesso!",
      });

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const storeInteractionInKnowledge = async (content: string, type: string) => {
    if (!user) return;

    try {
      const knowledgeEntry = {
        user_id: user.id,
        content: `WhatsApp ${type}: ${content}`,
        generated_at: new Date().toISOString()
      };

      await supabase
        .from('campaign_knowledge')
        .insert(knowledgeEntry);

    } catch (error) {
      console.error('Erro ao salvar na base de conhecimento:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'pending': return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'error': return <Activity className="h-3 w-3 text-red-500" />;
      default: return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageCircle className="h-4 w-4" />;
      case 'call': return <Phone className="h-4 w-4" />;
      case 'lead_created': return <User className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Status do WhatsApp */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            WhatsApp Business - Status
            <Badge variant={isConnected ? "default" : "secondary"} className="ml-auto">
              {isConnected ? "Conectado" : "Desconectado"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{messages.length}</p>
              <p className="text-sm text-muted-foreground">Mensagens</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{activities.filter(a => a.status === 'success').length}</p>
              <p className="text-sm text-muted-foreground">Interações</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{activities.filter(a => a.type === 'lead_created').length}</p>
              <p className="text-sm text-muted-foreground">Leads Criados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interface de Chat */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-green-500" />
              WhatsApp Bot - Conversa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.type === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 max-w-[80%] ${message.type === 'outgoing' ? 'flex-row-reverse' : ''}`}>
                      <div className={`p-2 rounded-full ${message.type === 'outgoing' ? 'bg-green-500' : 'bg-blue-500'}`}>
                        {message.type === 'outgoing' ? (
                          <Bot className="h-4 w-4 text-white" />
                        ) : (
                          <User className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className={`p-3 rounded-lg ${
                        message.type === 'outgoing' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-muted'
                      }`}>
                        {message.leadName && (
                          <p className="text-xs font-medium mb-1 opacity-75">{message.leadName}</p>
                        )}
                        <p className="text-sm">{message.message}</p>
                        <p className="text-xs opacity-75 mt-1">
                          {formatDistanceToNow(message.timestamp, { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <Separator />
            <div className="p-4 space-y-3">
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Número do WhatsApp (ex: +5562999887766)"
              />
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  onKeyPress={(e) => e.key === 'Enter' && sendWhatsAppMessage()}
                />
                <Button onClick={sendWhatsAppMessage} disabled={loading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Atividades em Tempo Real */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              Atividades em Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="p-2 rounded-full bg-accent/10">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    {getStatusIcon(activity.status)}
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma atividade recente</p>
                    <p className="text-sm text-muted-foreground">As interações aparecerão aqui em tempo real</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WhatsAppInterface;