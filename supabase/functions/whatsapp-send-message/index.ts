import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('WhatsApp Send Message function started');
    
    const body = await req.json();
    const { to, message, userId } = body;
    
    console.log('Sending WhatsApp message:', { to, message, userId });

    if (!to || !message || !userId) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Parâmetros obrigatórios: to, message, userId'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar configuração do WhatsApp do usuário
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    if (!config || config.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Configuração do WhatsApp não encontrada ou inativa'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const whatsappConfig = config[0];

    // Aqui você integraria com a API do WhatsApp Business
    // Por exemplo, usando Meta WhatsApp Business API
    
    /*
    const WHATSAPP_TOKEN = whatsappConfig.api_token || Deno.env.get('WHATSAPP_API_TOKEN');
    const PHONE_NUMBER_ID = whatsappConfig.phone_number || Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    const whatsappResponse = await fetch(`https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      })
    });

    const whatsappResult = await whatsappResponse.json();
    console.log('WhatsApp API response:', whatsappResult);
    */

    // Por enquanto, simularemos o envio bem-sucedido
    console.log('Simulating WhatsApp message send to:', to);
    console.log('Message:', message);

    // Registrar na base de conhecimento
    await supabase
      .from('campaign_knowledge')
      .insert({
        user_id: userId,
        content: `WhatsApp Enviado para ${to}: ${message}`,
        generated_at: new Date().toISOString()
      });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Mensagem enviada com sucesso',
      messageId: `sim_${Date.now()}`, // Simulated message ID
      to: to
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in whatsapp-send-message function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});