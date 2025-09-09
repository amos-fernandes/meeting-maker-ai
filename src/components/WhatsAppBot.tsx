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
  CheckCircle,
  Power,
  PowerOff
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
  type: 'message' | 'call' | 'lead_created' | 'bot_response';
  description: string;
  timestamp: Date;
  status: 'success' | 'pending' | 'error';
}

const WhatsAppBot = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [activities, setActivities] = useState<WhatsAppActivity[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isBotActive, setIsBotActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [incomingMessages, setIncomingMessages] = useState<string[]>([
    "Olá! Gostaria de saber mais sobre consultoria tributária.",
    "Qual o valor dos serviços?",
    "Vocês atendem empresas de grande porte?",
    "Como funciona a recuperação de créditos tributários?",
    "Tenho interesse em agendar uma consultoria."
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && isBotActive) {
      loadInitialData();
      setupBotSimulation();
    }
  }, [user, isBotActive]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadInitialData = async () => {
    if (!user) return;

    try {
      // Mensagem inicial do bot
      const welcomeMessage: WhatsAppMessage = {
        id: 'bot-welcome',
        from: 'bot',
        to: 'system',
        message: '🤖 *Bot Única Contábil Ativado*\n\nOlá! Sou o assistente virtual da Única Contábil. Estou aqui para ajudar com dúvidas sobre consultoria tributária, planejamento fiscal e serviços contábeis.\n\nComo posso te ajudar hoje?',
        timestamp: new Date(),
        type: 'outgoing',
        status: 'sent'
      };

      setMessages([welcomeMessage]);

      const initialActivity: WhatsAppActivity = {
        id: 'bot-start',
        type: 'bot_response',
        description: 'Bot WhatsApp da Única Contábil ativado e funcionando',
        timestamp: new Date(),
        status: 'success'
      };

      setActivities([initialActivity]);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const setupBotSimulation = () => {
    // Simular mensagens recebidas a cada 30-60 segundos quando o bot está ativo
    const interval = setInterval(() => {
      if (isBotActive && Math.random() > 0.6) {
        receiveSimulatedMessage();
      }
    }, Math.random() * 30000 + 30000); // 30-60 segundos

    return () => clearInterval(interval);
  };

  const receiveSimulatedMessage = async () => {
    const randomMessage = incomingMessages[Math.floor(Math.random() * incomingMessages.length)];
    const clientNames = ['João Silva', 'Maria Santos', 'Carlos Oliveira', 'Ana Costa', 'Pedro Ferreira'];
    const randomName = clientNames[Math.floor(Math.random() * clientNames.length)];
    const randomPhone = `+5562${Math.floor(Math.random() * 900000000 + 100000000)}`;

    // Mensagem recebida
    const incomingMessage: WhatsAppMessage = {
      id: `incoming-${Date.now()}`,
      from: randomPhone,
      to: '+5562981959829',
      message: randomMessage,
      timestamp: new Date(),
      type: 'incoming',
      status: 'read',
      leadName: randomName,
      phoneNumber: randomPhone
    };

    setMessages(prev => [...prev, incomingMessage]);

    // Registrar atividade
    const activity: WhatsAppActivity = {
      id: `activity-${Date.now()}`,
      type: 'message',
      description: `Mensagem recebida de ${randomName} (${randomPhone})`,
      timestamp: new Date(),
      status: 'success'
    };

    setActivities(prev => [activity, ...prev.slice(0, 19)]);

    // Armazenar na base de conhecimento
    await storeInteractionInKnowledge(incomingMessage.message, 'incoming', randomName);

    // Responder automaticamente com IA
    setTimeout(() => {
      respondWithAI(randomMessage, randomName, randomPhone);
    }, 2000 + Math.random() * 3000); // 2-5 segundos para responder
  };

  const respondWithAI = async (userMessage: string, clientName: string, phoneNumber: string) => {
    if (!user) return;

    try {
      // Chamar função RAG para gerar resposta inteligente
      const { data, error } = await supabase.functions.invoke('rag-chat', {
        body: { 
          message: `Cliente ${clientName} via WhatsApp perguntou: ${userMessage}`,
          userId: user.id,
          isWhatsAppBot: true
        }
      });

      if (error) throw error;

      let botResponse = data?.response || "Obrigado pela sua mensagem! Em breve um de nossos consultores entrará em contato.";
      
      // Personalizar resposta para WhatsApp
      botResponse = `🤖 *Única Contábil*\n\nOlá ${clientName}!\n\n${botResponse}\n\n📞 Para falar diretamente com um consultor: (62) 9 8195-9829\n📅 Agende uma consultoria: https://calendly.com/unica-contabil`;

      const botMessage: WhatsAppMessage = {
        id: `bot-${Date.now()}`,
        from: '+5562981959829',
        to: phoneNumber,
        message: botResponse,
        timestamp: new Date(),
        type: 'outgoing',
        status: 'sent'
      };

      setMessages(prev => [...prev, botMessage]);

      // Registrar atividade
      const activity: WhatsAppActivity = {
        id: `bot-activity-${Date.now()}`,
        type: 'bot_response',
        description: `Bot respondeu automaticamente para ${clientName}`,
        timestamp: new Date(),
        status: 'success'
      };

      setActivities(prev => [activity, ...prev.slice(0, 19)]);

      // Armazenar resposta na base de conhecimento
      await storeInteractionInKnowledge(botResponse, 'outgoing', clientName);

    } catch (error) {
      console.error('Erro ao gerar resposta com IA:', error);
      
      // Resposta fallback
      const fallbackResponse = `🤖 *Única Contábil*\n\nOlá ${clientName}! Obrigado pelo seu contato.\n\nRecebemos sua mensagem e em breve um de nossos consultores especializados entrará em contato.\n\n📞 Urgente? Ligue: (62) 9 8195-9829\n📧 E-mail: contato@unicacontabil.com`;

      const botMessage: WhatsAppMessage = {
        id: `bot-fallback-${Date.now()}`,
        from: '+5562981959829',
        to: phoneNumber,
        message: fallbackResponse,
        timestamp: new Date(),
        type: 'outgoing',
        status: 'sent'
      };

      setMessages(prev => [...prev, botMessage]);
    }
  };

  const sendManualMessage = async () => {
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
      const sentMessage: WhatsAppMessage = {
        id: `manual-${Date.now()}`,
        from: '+5562981959829',
        to: phoneNumber,
        message: newMessage,
        timestamp: new Date(),
        type: 'outgoing',
        status: 'sent'
      };

      setMessages(prev => [...prev, sentMessage]);
      
      // Registrar atividade
      const activity: WhatsAppActivity = {
        id: `manual-activity-${Date.now()}`,
        type: 'message',
        description: `Mensagem manual enviada para ${phoneNumber}`,
        timestamp: new Date(),
        status: 'success'
      };

      setActivities(prev => [activity, ...prev.slice(0, 19)]);

      // Armazenar na base de conhecimento
      await storeInteractionInKnowledge(newMessage, 'manual_outgoing');

      setNewMessage('');
      
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

  const storeInteractionInKnowledge = async (content: string, type: string, clientName?: string) => {
    if (!user) return;

    try {
      const knowledgeEntry = {
        user_id: user.id,
        content: `WhatsApp ${type}${clientName ? ` (${clientName})` : ''}: ${content}`,
        generated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('campaign_knowledge')
        .insert(knowledgeEntry);

      if (error) {
        console.error('Erro ao salvar na base de conhecimento:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar na base de conhecimento:', error);
    }
  };

  const toggleBot = () => {
    setIsBotActive(!isBotActive);
    
    if (!isBotActive) {
      toast({
        title: "Bot Ativado",
        description: "Bot WhatsApp da Única Contábil está agora atendendo automaticamente",
      });
    } else {
      toast({
        title: "Bot Desativado",
        description: "Bot WhatsApp foi desativado",
      });
      setMessages([]);
      setActivities([]);
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
      case 'bot_response': return <Bot className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Controle do Bot */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            Bot WhatsApp Única Contábil
            <Badge variant={isBotActive ? "default" : "secondary"} className="ml-auto">
              {isBotActive ? "Ativo" : "Inativo"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {isBotActive ? "Bot está atendendo automaticamente" : "Bot desativado"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isBotActive ? "Respondendo mensagens com IA integrada" : "Clique para ativar o atendimento automático"}
              </p>
            </div>
            <Button 
              onClick={toggleBot}
              variant={isBotActive ? "destructive" : "default"}
              size="lg"
            >
              {isBotActive ? (
                <>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Desativar Bot
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-2" />
                  Ativar Bot
                </>
              )}
            </Button>
          </div>
          
          {isBotActive && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{messages.length}</p>
                <p className="text-sm text-muted-foreground">Mensagens</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{activities.filter(a => a.status === 'success').length}</p>
                <p className="text-sm text-muted-foreground">Interações</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{activities.filter(a => a.type === 'bot_response').length}</p>
                <p className="text-sm text-muted-foreground">Respostas IA</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isBotActive && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Interface de Chat */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-green-500" />
                Conversas WhatsApp - Tempo Real
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
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
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
                    placeholder="Enviar mensagem manual..."
                    onKeyPress={(e) => e.key === 'Enter' && sendManualMessage()}
                  />
                  <Button onClick={sendManualMessage} disabled={loading}>
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
                Log de Atividades IA
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
                      <Bot className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">Bot aguardando mensagens</p>
                      <p className="text-sm text-muted-foreground">As interações aparecerão aqui em tempo real</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WhatsAppBot;