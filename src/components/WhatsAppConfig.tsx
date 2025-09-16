import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Save, ExternalLink, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

interface WhatsAppConfigData {
  api_token: string;
  phone_number: string;
  webhook_url: string;
  is_active: boolean;
}

const WhatsAppConfig = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<WhatsAppConfigData>({
    api_token: '',
    phone_number: '',
    webhook_url: '',
    is_active: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [user]);

  const loadConfig = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setConfig({
          api_token: data[0].api_token || '',
          phone_number: data[0].phone_number || '',
          webhook_url: data[0].webhook_url || '',
          is_active: data[0].is_active || false
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar configuração do WhatsApp",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { data: existingConfig } = await supabase
        .from('whatsapp_config')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const configData = {
        user_id: user.id,
        api_token: config.api_token,
        phone_number: config.phone_number,
        webhook_url: config.webhook_url,
        is_active: config.is_active,
        updated_at: new Date().toISOString()
      };

      if (existingConfig && existingConfig.length > 0) {
        // Update existing config
        const { error } = await supabase
          .from('whatsapp_config')
          .update(configData)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new config
        const { error } = await supabase
          .from('whatsapp_config')
          .insert(configData);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Configuração do WhatsApp salva com sucesso",
        variant: "default"
      });
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configuração do WhatsApp",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = () => {
    const webhookUrl = `https://ibaonnnakuuerrgtilze.supabase.co/functions/v1/whatsapp-webhook`;
    window.open(webhookUrl, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração WhatsApp Business
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuração WhatsApp Business API
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Para usar o WhatsApp Business API, você precisa de uma conta Meta Business, 
            aplicativo aprovado e número de telefone verificado.
            <a 
              href="https://developers.facebook.com/docs/whatsapp/getting-started" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline ml-2 inline-flex items-center gap-1"
            >
              Ver documentação <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="api_token">Token de Acesso da API</Label>
            <Input
              id="api_token"
              type="password"
              placeholder="Insira o token de acesso do WhatsApp Business API"
              value={config.api_token}
              onChange={(e) => setConfig({...config, api_token: e.target.value})}
            />
            <p className="text-sm text-muted-foreground">
              Token permanente gerado no Meta Business Manager
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number ID</Label>
            <Input
              id="phone_number"
              placeholder="Ex: 123456789012345"
              value={config.phone_number}
              onChange={(e) => setConfig({...config, phone_number: e.target.value})}
            />
            <p className="text-sm text-muted-foreground">
              ID do número de telefone configurado no WhatsApp Business API
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook_url">URL do Webhook</Label>
            <div className="flex gap-2">
              <Input
                id="webhook_url"
                value={`https://ibaonnnakuuerrgtilze.supabase.co/functions/v1/whatsapp-webhook`}
                disabled
              />
              <Button
                variant="outline"
                size="icon"
                onClick={testWebhook}
                title="Testar Webhook"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure este URL no seu aplicativo WhatsApp Business
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={config.is_active}
              onCheckedChange={(checked) => setConfig({...config, is_active: checked})}
            />
            <Label htmlFor="is_active">Ativar WhatsApp Bot</Label>
          </div>
        </div>

        <Button 
          onClick={saveConfig} 
          disabled={saving || !config.api_token || !config.phone_number}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default WhatsAppConfig;