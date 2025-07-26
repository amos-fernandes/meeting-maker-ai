import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <Dashboard />
      </main>
    </div>
  );
};

export default Index;
