import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Settings, User, LogOut } from "lucide-react";

const Header = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              LEADOS AI Pro
            </h1>
            <div className="hidden md:flex items-center space-x-1 text-sm text-muted-foreground">
              <span>•</span>
              <span>Prospecção Inteligente</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            
            <span className="hidden md:block text-sm text-muted-foreground">
              {user?.email}
            </span>
            
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-accent rounded-full"></span>
            </Button>
            
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut className="h-5 w-5" />
            </Button>
            
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;