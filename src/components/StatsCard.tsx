import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  gradient?: boolean;
}

const StatsCard = ({ title, value, icon: Icon, trend, trendUp, gradient }: StatsCardProps) => {
  return (
    <Card className={`shadow-soft hover:shadow-medium transition-all duration-300 ${gradient ? 'bg-gradient-primary text-white' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${gradient ? 'text-white/80' : 'text-muted-foreground'}`}>
              {title}
            </p>
            <div className="flex items-center space-x-2">
              <h3 className={`text-2xl font-bold ${gradient ? 'text-white' : 'text-foreground'}`}>
                {value}
              </h3>
              {trend && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  gradient 
                    ? 'bg-white/20 text-white' 
                    : trendUp 
                      ? 'bg-success/10 text-success' 
                      : 'bg-destructive/10 text-destructive'
                }`}>
                  {trend}
                </span>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-full ${gradient ? 'bg-white/20' : 'bg-primary/10'}`}>
            <Icon className={`h-6 w-6 ${gradient ? 'text-white' : 'text-primary'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;