import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import RAGChat from "@/components/RAGChat";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 space-y-8">
        <Dashboard />
        <RAGChat />
      </main>
    </div>
  );
};

export default Index;
