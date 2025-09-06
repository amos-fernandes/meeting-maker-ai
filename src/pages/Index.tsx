import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import RAGChat from "@/components/RAGChat";
import CRMDashboard from "@/components/CRM/CRMDashboard";
import WhatsAppInterface from "@/components/WhatsAppInterface";

const Index = () => {
  const { user, loading } = useAuth();
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  useEffect(() => {
    const handleOpenWhatsApp = () => {
      setShowWhatsApp(true);
    };

    window.addEventListener('openWhatsAppBot', handleOpenWhatsApp);
    return () => window.removeEventListener('openWhatsAppBot', handleOpenWhatsApp);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-primary text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 space-y-8">
        <Dashboard />
        <CRMDashboard />
        {showWhatsApp ? <WhatsAppInterface /> : <RAGChat />}
      </main>
    </div>
  );
};

export default Index;
