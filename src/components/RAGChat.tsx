import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bot, 
  Send, 
  User, 
  Database, 
  Zap,
  Calendar,
  Phone,
  Mail,
  Building2
} from "lucide-react";
import { performRAGSearch, TARGETS } from "@/data/knowledgeBase";
import { saveLeadToCSV } from "@/utils/csvExport";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  sources?: string[];
  crmAction?: 'create_lead' | 'schedule_meeting' | 'update_contact';
}

interface CRMData {
  leads: number;
  opportunities: number;
  meetings: number;
}

const RAGChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Olá! Sou seu assistente SDR com IA. Posso ajudar com prospecção, análise de leads e integração com Salesforce. Como posso ajudá-lo hoje?',
      timestamp: new Date(),
      sources: ['knowledge_base', 'crm_integration']
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [crmConnected, setCrmConnected] = useState(false);
  const [crmData, setCrmData] = useState<CRMData>({ leads: 0, opportunities: 0, meetings: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simular conexão CRM (substituir por integração real)
  const connectCRM = async () => {
    setIsLoading(true);
    // Aqui seria a integração real com Salesforce via Supabase Edge Function
    setTimeout(() => {
      setCrmConnected(true);
      setCrmData({ leads: 47, opportunities: 12, meetings: 8 });
      addAIMessage('✅ Conectado ao Salesforce! Agora posso acessar seus dados de CRM e criar leads automaticamente.', ['salesforce_api']);
      setIsLoading(false);
    }, 2000);
  };

  const addAIMessage = (content: string, sources?: string[], crmAction?: any) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content,
      timestamp: new Date(),
      sources,
      crmAction
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const processRAGQuery = async (query: string) => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addAIMessage("Você precisa estar logado para usar o assistente RAG.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('rag-chat', {
        body: { 
          message: query,
          userId: user.id
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const response = data.response || "Desculpe, não consegui processar sua solicitação.";
      const sources = ["Base de Conhecimento RAG", "CRM Database"];
      let crmAction = null;

      // Detectar se uma ação foi executada
      if (data.actionExecuted) {
        switch (data.actionExecuted) {
          case 'generate_prospects':
            crmAction = "create_prospects";
            break;
          case 'qualify_leads':
            crmAction = "qualify_leads";
            break;
          case 'create_leads':
            crmAction = "create_leads";
            break;
          case 'create_campaign':
            crmAction = "create_campaign";
            break;
        }
      }

      // Atualizar estatísticas do CRM se disponíveis
      if (data.crmStats) {
        setCrmData(prev => ({
          ...prev,
          leads: data.crmStats.leads,
          opportunities: data.crmStats.opportunities,
          meetings: data.crmStats.contacts
        }));
      }

      addAIMessage(response, sources, crmAction);
    } catch (error) {
      console.error('Erro no processamento RAG:', error);
      addAIMessage("Desculpe, ocorreu um erro ao processar sua consulta. Verifique sua conexão e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const query = inputMessage;
    setInputMessage('');

    await processRAGQuery(query);
  };

  const handleCRMAction = (action: string) => {
    switch (action) {
      case 'create_lead':
        addAIMessage('✅ Lead criado no Salesforce com sucesso! ID: SF-2024-001', ['salesforce_api']);
        setCrmData(prev => ({ ...prev, leads: prev.leads + 1 }));
        break;
      case 'schedule_meeting':
        addAIMessage('📅 Reunião agendada no Salesforce para próxima terça-feira às 10h!', ['calendar_integration']);
        setCrmData(prev => ({ ...prev, meetings: prev.meetings + 1 }));
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* CRM Status */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Status Integração CRM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
            <Badge variant={crmConnected ? "default" : "secondary"}>
              {crmConnected ? "CRM Local Conectado" : "CRM Disponível"}
            </Badge>
              {crmConnected && (
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Leads: {crmData.leads}</span>
                  <span>Oportunidades: {crmData.opportunities}</span>
                  <span>Reuniões: {crmData.meetings}</span>
                </div>
              )}
            </div>
            {!crmConnected && (
              <Button onClick={connectCRM} disabled={isLoading}>
                <Zap className="h-4 w-4 mr-2" />
                Conectar CRM
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* RAG Chat Interface */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent" />
            Chat RAG - Assistente SDR IA
            <Badge variant="outline" className="ml-auto">
              <Database className="h-3 w-3 mr-1" />
              RAG Ativo
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-96 p-6">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="space-y-2">
                  <div className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`p-2 rounded-full ${message.type === 'user' ? 'bg-primary' : 'bg-accent'}`}>
                        {message.type === 'user' ? (
                          <User className="h-4 w-4 text-white" />
                        ) : (
                          <Bot className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className={`p-4 rounded-lg ${
                        message.type === 'user' 
                          ? 'bg-primary text-white' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.sources && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {message.sources.map((source, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {source}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {message.crmAction && (
                          <div className="mt-3 pt-2 border-t">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleCRMAction(message.crmAction!)}
                              className="text-xs"
                            >
                              {message.crmAction === 'create_lead' && <User className="h-3 w-3 mr-1" />}
                              {message.crmAction === 'schedule_meeting' && <Calendar className="h-3 w-3 mr-1" />}
                              {message.crmAction === 'update_contact' && <Phone className="h-3 w-3 mr-1" />}
                              {message.crmAction === 'create_lead' && 'Criar Lead'}
                              {message.crmAction === 'schedule_meeting' && 'Agendar Reunião'}
                              {message.crmAction === 'update_contact' && 'Atualizar Contato'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="p-2 rounded-full bg-accent">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-accent rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <Separator />
          <div className="p-6">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Digite sua pergunta sobre prospecção, leads ou CRM..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isLoading}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={isLoading || !inputMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Experimente: "Criar prospects", "Qualificar leads", "Criar campanhas", "Analisar pipeline"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RAGChat;