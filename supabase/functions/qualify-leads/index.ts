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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, leadIds } = await req.json();
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Buscar leads para qualificar
    let leadsQuery = supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId);
      
    if (leadIds && leadIds.length > 0) {
      leadsQuery = leadsQuery.in('id', leadIds);
    } else {
      leadsQuery = leadsQuery.is('status', 'novo').limit(10);
    }
    
    const { data: leads, error: fetchError } = await leadsQuery;

    if (fetchError) {
      throw new Error(`Database fetch error: ${fetchError.message}`);
    }

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhum lead encontrado para qualificação.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const qualifiedLeads = [];

    for (const lead of leads) {
      const prompt = `
      Você é um especialista em qualificação de leads B2B para consultoria tributária.
      
      Analise a seguinte empresa e qualifique com base nos critérios:
      - Empresa: ${lead.empresa}
      - Setor: ${lead.setor}
      - CNAE: ${lead.cnae}
      - Regime Tributário: ${lead.regime_tributario}
      - Contato: ${lead.contato_decisor}
      
      Tarefas:
      1. Pesquise notícias recentes (últimos 6 meses) sobre a empresa
      2. Identifique desafios tributários específicos do setor
      3. Avalie o potencial de necessidade de consultoria tributária
      4. Atribua uma nota de qualificação:
         - A: Alta prioridade (notícias recentes relevantes, grande potencial)
         - B: Boa prioridade (bom potencial, setor propício)
         - C: Baixa prioridade (menor urgência)
      
      Retorne APENAS um JSON válido:
      {
        "qualificationScore": "A",
        "urgencyLevel": "Alta",
        "notes": "Empresa anunciou expansão de R$ 200M em nova unidade. Alto ICMS e possível aproveitamento de créditos. Setor em crescimento.",
        "bestContactTime": "Manhã (9h-11h)",
        "approachStrategy": "Focar em otimização fiscal da nova unidade",
        "estimatedRevenue": "R$ 50.000 - R$ 150.000"
      }`;

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: 'Você é um qualificador de leads especialista em tributação. Sempre retorne JSON válido.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 1000,
            temperature: 0.3
          }),
        });

        if (!response.ok) {
          console.error(`OpenAI API error for lead ${lead.id}: ${response.statusText}`);
          continue;
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        let qualificationData;
        try {
          qualificationData = JSON.parse(content);
        } catch (parseError) {
          console.error(`JSON parse error for lead ${lead.id}:`, parseError);
          continue;
        }

        // Atualizar o lead no banco
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            status: 'qualificado',
            ...qualificationData
          })
          .eq('id', lead.id);

        if (updateError) {
          console.error(`Update error for lead ${lead.id}:`, updateError.message);
          continue;
        }

        qualifiedLeads.push({
          ...lead,
          ...qualificationData
        });

      } catch (error) {
        console.error(`Error qualifying lead ${lead.id}:`, error);
        continue;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${qualifiedLeads.length} leads qualificados com sucesso!`,
      qualifiedLeads
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in qualify-leads function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});