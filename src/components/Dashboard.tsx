import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatsCard from "./StatsCard";
import { 
  Users, 
  Calendar, 
  Target, 
  TrendingUp, 
  Phone, 
  Mail,
  MessageSquare,
  Plus,
  Bot
} from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "Prospects Ativos",
      value: "1,247",
      icon: Users,
      trend: "+12%",
      trendUp: true
    },
    {
      title: "Reuniões Agendadas",
      value: "34",
      icon: Calendar,
      trend: "+8%",
      trendUp: true,
      gradient: true
    },
    {
      title: "Taxa de Conversão",
      value: "2.8%",
      icon: Target,
      trend: "+0.5%",
      trendUp: true
    },
    {
      title: "Receita Pipeline",
      value: "R$ 124k",
      icon: TrendingUp,
      trend: "+23%",
      trendUp: true
    }
  ];

  const recentActivities = [
    { type: "call", prospect: "João Silva", company: "TechCorp", time: "há 5 min" },
    { type: "email", prospect: "Maria Santos", company: "InnovaCorp", time: "há 12 min" },
    { type: "meeting", prospect: "Carlos Lima", company: "StartupXYZ", time: "há 1h" },
    { type: "message", prospect: "Ana Costa", company: "DigitalCorp", time: "há 2h" }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-primary rounded-2xl p-8 text-white shadow-large">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Bem-vindo ao SDR AI Pro</h2>
          <p className="text-white/80 mb-6 max-w-2xl">
            Sua ferramenta de IA para prospecção inteligente e agendamento automático de reuniões. 
            Conecte-se com prospects de forma mais eficiente e aumente suas conversões.
          </p>
          <div className="flex gap-4">
            <Button variant="secondary" className="bg-white text-primary hover:bg-white/90">
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Bot className="h-4 w-4 mr-2" />
              Chat com IA
            </Button>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary-glow/90"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atividades Recentes */}
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="p-2 rounded-full bg-primary/10">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.prospect}</p>
                    <p className="text-sm text-muted-foreground">{activity.company}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* IA Assistant */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-accent" />
              Assistente IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-success text-white">
                <p className="text-sm font-medium mb-2">Dica do Dia</p>
                <p className="text-sm text-white/90">
                  Seus prospects respondem melhor a emails enviados entre 10h-12h. 
                  Que tal agendar sua próxima campanha neste horário?
                </p>
              </div>
              <Button className="w-full" variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Conversar com IA
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;