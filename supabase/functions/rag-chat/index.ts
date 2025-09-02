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
  console.log('RAG Chat function called:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body:', body);
    
    const { message, userId } = body;
    
    if (!message || !userId) {
      console.error('Missing required fields:', { message: !!message, userId: !!userId });
      return new Response(JSON.stringify({ 
        response: 'Parâmetros obrigatórios em falta.',
        error: 'Missing message or userId'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ 
        response: 'Configuração da OpenAI não encontrada. Entre em contato com o administrador.',
        error: 'OpenAI API key not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase client created');
    
    // Buscar dados do CRM para contexto
    console.log('Fetching CRM data for user:', userId);
    const [leadsResult, contactsResult, opportunitiesResult] = await Promise.all([
      supabase.from('leads').select('*').eq('user_id', userId).limit(10).then(result => {
        if (result.error) console.error('Leads fetch error:', result.error);
        return result;
      }),
      supabase.from('contacts').select('*').eq('user_id', userId).limit(10).then(result => {
        if (result.error) console.error('Contacts fetch error:', result.error);
        return result;
      }),
      supabase.from('opportunities').select('*').eq('user_id', userId).limit(10).then(result => {
        if (result.error) console.error('Opportunities fetch error:', result.error);
        return result;
      })
    ]);

    const crmContext = {
      leads: leadsResult.data || [],
      contacts: contactsResult.data || [],
      opportunities: opportunitiesResult.data || []
    };

    // Detectar comando na mensagem
    const lowerMessage = message.toLowerCase();
    let actionDetected = null;
    let actionResponse = null;

    if (lowerMessage.includes('criar prospects') || lowerMessage.includes('nova campanha')) {
      actionDetected = 'generate_prospects';
    } else if (lowerMessage.includes('qualificar') && (lowerMessage.includes('prospects') || lowerMessage.includes('leads'))) {
      actionDetected = 'qualify_leads';
    } else if (lowerMessage.includes('criar leads')) {
      actionDetected = 'create_leads';
    } else if (lowerMessage.includes('criar campanhas') || lowerMessage.includes('campanha')) {
      actionDetected = 'create_campaign';
    }

    // Base de conhecimento de prospecção tributária
    const knowledgeBase = `
    EMPRESAS ALVO - CONSULTORIA TRIBUTÁRIA GOIÁS:

    1. Jalles Machado S.A. - Agroindústria açúcar/etanol - ICMS alto, expansão recente
    2. CRV Industrial - Etanol - Endividamento fiscal, execuções trabalhistas
    3. São Salvador Alimentos - Frango - Auditorias, crescimento exportador
    4. Cerradinho Bioenergia - Etanol - Expansão logística, ICMS elevado
    5. Complem Cooperativa - Mudanças societárias, passivos fiscais
    6. Grupo Odilon Santos - Logística - Contratos grandes, margens apertadas
    7. Caramuru Alimentos - Soja - Exportações, benefício REINTEGRA
    8. Grupo JC Distribuição - Atacado - Margens tributárias elevadas
    9. União Química - Farmacêutica - Expansão em Goiás, incentivos fiscais
    10. Mabel Alimentos - Biscoitos - Auditorias, ICMS-ST
    11. Cereal Ouro - Arroz/grãos - Execuções fiscais, ICMS elevado

    ROTEIROS DE PROSPECÇÃO:
    - Foco em ICMS, créditos acumulados, auditoria fiscal
    - Mencionar expansões, investimentos recentes, passivos
    - Agendamento de 15-20 minutos para diagnóstico
    - Tom profissional, focado em ganhos financeiros
    `;

    const systemPrompt = `Você é um SDR especialista em prospecção B2B para consultoria tributária em Goiás.

    DADOS DO CRM ATUAL:
    - Leads: ${crmContext.leads.length} cadastrados
    - Contatos: ${crmContext.contacts.length} cadastrados  
    - Oportunidades: ${crmContext.opportunities.length} em pipeline

    CONHECIMENTO BASE:
    ${knowledgeBase}

    COMANDOS DISPONÍVEIS:
    1. "Criar Prospects" - Gera 11 novos prospects com IA
    2. "Qualificar Prospects/Leads" - Qualifica leads existentes
    3. "Criar Leads" - Cadastra novos leads manualmente
    4. "Criar Campanhas" - Desenvolve campanhas de prospecção

    Se detectar um comando, explique o que será feito e confirme a execução.
    Caso contrário, responda como consultor especialista em prospecção tributária.`;

    let aiPrompt = systemPrompt + `\n\nMensagem do usuário: ${message}`;

    // Executar ação se detectada
    if (actionDetected === 'generate_prospects') {
      console.log('Generating prospects via generate-prospects function');
      try {
        const prospectResponse = await fetch(`${supabaseUrl}/functions/v1/generate-prospects`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId })
        });

        if (prospectResponse.ok) {
          const result = await prospectResponse.json();
          actionResponse = `✅ **Ação Executada: Criação de Prospects**\n\n${result.message}\n\nForam gerados ${result.prospects?.length || 11} novos prospects qualificados para sua base de dados!`;
        }
      } catch (error) {
        actionResponse = `❌ Erro ao executar criação de prospects: ${error.message}`;
      }
    } else if (actionDetected === 'qualify_leads') {
      try {
        const qualifyResponse = await fetch(`${supabaseUrl}/functions/v1/qualify-leads`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId })
        });

        if (qualifyResponse.ok) {
          const result = await qualifyResponse.json();
          actionResponse = `✅ **Ação Executada: Qualificação de Leads**\n\n${result.message}\n\nSeus leads foram analisados e qualificados com notas A, B ou C baseadas no potencial de conversão!`;
        }
      } catch (error) {
        actionResponse = `❌ Erro ao qualificar leads: ${error.message}`;
      }
    }

    // Se houve ação executada, incluir no contexto
    if (actionResponse) {
      aiPrompt += `\n\nRESULTADO DA AÇÃO: ${actionResponse}`;
    }

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
        throw new Error('Muitas requisições à OpenAI. Aguarde alguns minutos e tente novamente.');
      }
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Adicionar informações do CRM se relevante
    let finalResponse = aiResponse;
    
    if (actionResponse) {
      finalResponse = actionResponse + '\n\n' + aiResponse;
    }

    return new Response(JSON.stringify({ 
      response: finalResponse,
      actionExecuted: actionDetected,
      crmStats: {
        leads: crmContext.leads.length,
        contacts: crmContext.contacts.length,
        opportunities: crmContext.opportunities.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in rag-chat function:', error);
    return new Response(JSON.stringify({ 
      response: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});