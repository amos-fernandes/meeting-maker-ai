import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const googleGeminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para busca RAG aprimorada
async function performDeepRAGSearch(query: string, userId: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .or(`empresa.ilike.%${query}%,setor.ilike.%${query}%,gancho_prospeccao.ilike.%${query}%`)
      .limit(10);

    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .or(`nome.ilike.%${query}%,empresa.ilike.%${query}%,cargo.ilike.%${query}%`)
      .limit(10);

    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*, campaign_scripts(*)')
      .eq('user_id', userId)
      .limit(5);

    const { data: allLeads } = await supabase
      .from('leads')
      .select('status')
      .eq('user_id', userId);

    const totalLeads = allLeads?.length || 0;
    const qualifiedLeads = allLeads?.filter(l => l.status === 'qualificado').length || 0;
    const activeCampaigns = campaigns?.filter(c => c.status === 'ativa').length || 0;

    return {
      totalLeads,
      qualifiedLeads,
      activeCampaigns,
      relevantData: {
        leads: leads || [],
        contacts: contacts || [],
        campaigns: campaigns || []
      },
      recentInteractions: 'Dados carregados do CRM'
    };
  } catch (error) {
    console.error('Erro no deep search:', error);
    return {
      totalLeads: 0,
      qualifiedLeads: 0,
      activeCampaigns: 0,
      relevantData: {
        leads: [],
        contacts: [],
        campaigns: []
      },
      recentInteractions: 'Erro ao carregar dados'
    };
  }
}


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

    if (!googleGeminiApiKey) {
      return new Response(JSON.stringify({ 
        response: 'Google Gemini API key não configurada. Configure a chave nas configurações.',
        error: 'Google Gemini API key missing'
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
          
          if (result.success) {
            return new Response(JSON.stringify({ 
              response: `✅ **Prospects Criados com Sucesso!**\n\n${result.message}\n\n📊 **Total de prospects gerados:** ${result.totalLeads || 'N/A'}\n\n🎯 **Próximo passo:** Use o comando "Qualificar Prospects" para refinar sua lista.`,
              actionExecuted: actionDetected,
              crmStats: { leads: result.totalLeads }
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            throw new Error(result.error || 'Erro desconhecido na geração de prospects');
          }
        } else {
          const errorText = await prospectResponse.text();
          console.error('Generate prospects error response:', errorText);
          
          let errorMessage = 'Erro interno na geração de prospects';
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            console.log('Could not parse error response, using status text');
            errorMessage = prospectResponse.statusText || errorMessage;
          }
          
          throw new Error(`Erro ${prospectResponse.status}: ${errorMessage}`);
        }
      } catch (error) {
        console.error('Error calling generate-prospects:', error);
        
        let userFriendlyMessage = 'Erro ao criar prospects. ';
        
        if (error.message.includes('500')) {
          userFriendlyMessage += 'Problema interno no servidor de IA. Tente novamente em alguns minutos.';
        } else if (error.message.includes('Gemini')) {
          userFriendlyMessage += 'Verifique se a API do Google Gemini está configurada corretamente.';
        } else {
          userFriendlyMessage += error.message;
        }
        
        return new Response(JSON.stringify({ 
          response: `❌ **Erro na Criação de Prospects**\n\n${userFriendlyMessage}\n\n🔧 **Soluções:**\n• Verifique sua conexão com a internet\n• Aguarde alguns minutos e tente novamente\n• Verifique se as chaves de API estão configuradas`,
          error: error.message
        }), {
          status: 200, // Changed to 200 to avoid client-side error handling
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Resposta padrão da IA
    console.log('Calling Google Gemini for standard response...');
    
    const systemPrompt = `Você é um PHD em Contabilidade e Finanças especialista em consultoria tributária para grandes empresas.

CONHECIMENTO ESPECIALIZADO:
- Recuperação de créditos tributários (ICMS, PIS/COFINS, IRPJ/CSLL)
- Planejamento tributário avançado para multinacionais
- Compliance e auditoria fiscal
- Incentivos fiscais e regimes especiais
- Reestruturação societária com otimização tributária

DADOS DO CRM ATUAL:
- Leads cadastrados: ${leads?.length || 0}

COMANDOS DISPONÍVEIS:
1. "Criar Prospects" - Gera novos prospects com IA
2. "Qualificar Prospects/Leads" - Qualifica leads existentes
3. WhatsApp/Ligações - Responde perguntas sobre campanhas e follow-up

CONTEXTO DE CAMPANHA:
Você atende clientes via WhatsApp, ligações e emails sobre:
- Oportunidades de recuperação tributária
- Estratégias de redução de carga fiscal
- Compliance e blindagem jurídica
- Diagnósticos tributários gratuitos

Sempre responda de forma técnica, consultiva e com foco em gerar valor para grandes corporações.`;

    // Ponto principal de alteração
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleGeminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: systemPrompt + '\n\n' + message
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.5
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Limite de requisições atingido. Aguarde alguns minutos e tente novamente.');
      }
      throw new Error(`Google Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Novo tratamento da resposta para o formato do Gemini
    let aiResponse = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      aiResponse = data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Resposta inválida da IA. Estrutura de dados inesperada.');
    }

    console.log('Google Gemini response received successfully');

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