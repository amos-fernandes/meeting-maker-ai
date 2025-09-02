import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('RAG Chat function started');
    
    const body = await req.json();
    const { message, userId } = body;
    
    console.log('Processing message:', message?.substring(0, 50), 'for user:', userId);

    if (!message || !userId) {
      return new Response(JSON.stringify({ 
        response: 'Parâmetros obrigatórios em falta: message e userId são necessários.',
        error: 'Missing required parameters'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      return new Response(JSON.stringify({ 
        response: 'OpenAI API key não configurada. Configure a chave da OpenAI nas configurações.',
        error: 'OpenAI API key missing'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Buscar dados do CRM
    console.log('Fetching CRM data...');
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .limit(5);

    console.log('Found leads:', leads?.length || 0);

    // Detectar comandos
    const lowerMessage = message.toLowerCase();
    let actionDetected = null;

    if (lowerMessage.includes('criar prospects') || lowerMessage.includes('nova campanha')) {
      actionDetected = 'generate_prospects';
    } else if (lowerMessage.includes('qualificar')) {
      actionDetected = 'qualify_leads';
    }

    console.log('Action detected:', actionDetected);

    // Executar ação se detectada
    if (actionDetected === 'generate_prospects') {
      try {
        console.log('Calling generate-prospects function...');
        
        const prospectResponse = await fetch(`${supabaseUrl}/functions/v1/generate-prospects`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId })
        });

        console.log('Generate prospects response status:', prospectResponse.status);

        if (prospectResponse.ok) {
          const result = await prospectResponse.json();
          return new Response(JSON.stringify({ 
            response: `✅ **Ação Executada: Criação de Prospects**\n\n${result.message}\n\nForam gerados novos prospects para sua base de dados!`,
            actionExecuted: actionDetected
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          throw new Error(`HTTP ${prospectResponse.status}: ${prospectResponse.statusText}`);
        }
      } catch (error) {
        console.error('Error calling generate-prospects:', error);
        return new Response(JSON.stringify({ 
          response: `❌ Erro ao executar criação de prospects: ${error.message}. Verifique se a OpenAI está configurada corretamente.`,
          error: error.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Resposta padrão da IA
    console.log('Calling OpenAI for standard response...');
    
    const systemPrompt = `Você é um SDR especialista em prospecção B2B para consultoria tributária em Goiás.

DADOS DO CRM ATUAL:
- Leads cadastrados: ${leads?.length || 0}

COMANDOS DISPONÍVEIS:
1. "Criar Prospects" - Gera novos prospects com IA
2. "Qualificar Prospects/Leads" - Qualifica leads existentes

Se detectar um comando, explique o que será feito. Caso contrário, responda como consultor especialista em prospecção tributária.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.5
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Limite de requisições atingido. Aguarde alguns minutos e tente novamente.');
      }
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('OpenAI response received successfully');

    return new Response(JSON.stringify({ 
      response: aiResponse,
      actionExecuted: actionDetected,
      crmStats: {
        leads: leads?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in rag-chat function:', error);
    return new Response(JSON.stringify({ 
      response: `Desculpe, ocorreu um erro: ${error.message}. Tente novamente em alguns momentos.`,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});