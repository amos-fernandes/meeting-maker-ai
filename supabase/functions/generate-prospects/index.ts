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
    console.log('Generate prospects function started');
    
    const body = await req.json();
    const { userId } = body;

    console.log('Generating prospects for user:', userId);

    if (!userId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'UserId é obrigatório'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'OpenAI API key não configurada'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `
    Você é um especialista em prospecção B2B para uma consultoria contábil tributária especializada em grandes empresas de Goiás.
    
    Gere EXATAMENTE 11 prospects reais de empresas de grande porte em Goiânia, Aparecida de Goiânia e região de Goiás, focando em:
    - Agroindústria (açúcar, etanol, soja, milho, carnes)
    - Logística e transportes
    - Indústria farmacêutica
    - Varejo de grande porte
    - Energia e mineração
    
    Para cada prospect, identifique:
    1. Nome real da empresa
    2. Setor de atuação
    3. CNAE provável
    4. Regime tributário (Lucro Real/Presumido)
    5. Nome e cargo do decisor (CFO, Diretor Tributário, Gerente Fiscal)
    6. E-mail corporativo no formato padrão
    7. Telefone corporativo
    8. Website oficial
    9. Gancho de prospecção específico
    
    Retorne APENAS um JSON válido no formato:
    {
      "prospects": [
        {
          "empresa": "Nome da Empresa S.A.",
          "setor": "Agroindústria - Açúcar e Etanol", 
          "cnae": "1071-6/00",
          "regime_tributario": "Lucro Real",
          "contato_decisor": "João Silva (CFO)",
          "telefone": "(62) 3321-8200",
          "email": "joao.silva@empresa.com.br",
          "website": "empresa.com.br",
          "gancho_prospeccao": "Investimentos recentes em expansão"
        }
      ]
    }`;

    console.log('Calling OpenAI API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um especialista em prospecção B2B. Sempre retorne JSON válido.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.5
      }),
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Limite de requisições da OpenAI atingido. Aguarde alguns minutos.');
      }
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('Parsing OpenAI response...');
    
    let prospectsData;
    try {
      prospectsData = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Resposta inválida da IA. Tente novamente.');
    }

    if (!prospectsData.prospects || !Array.isArray(prospectsData.prospects)) {
      throw new Error('Estrutura de dados inválida da IA');
    }

    console.log('Saving to database...');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const leadsToInsert = prospectsData.prospects.map((prospect: any) => ({
      user_id: userId,
      empresa: prospect.empresa,
      setor: prospect.setor,
      cnae: prospect.cnae,
      regime_tributario: prospect.regime_tributario,
      contato_decisor: prospect.contato_decisor,
      telefone: prospect.telefone,
      email: prospect.email,
      website: prospect.website,
      gancho_prospeccao: prospect.gancho_prospeccao,
      status: 'novo'
    }));

    const { data: insertedLeads, error: insertError } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select();

    if (insertError) {
      console.error('Database error:', insertError);
      throw new Error(`Erro no banco de dados: ${insertError.message}`);
    }

    // Salvar nos contatos
    const contactsToInsert = prospectsData.prospects.map((prospect: any) => ({
      user_id: userId,
      nome: prospect.contato_decisor,
      empresa: prospect.empresa,
      cargo: prospect.contato_decisor.includes('(') ? prospect.contato_decisor.split('(')[1].replace(')', '') : 'Decisor',
      email: prospect.email,
      telefone: prospect.telefone,
      website: prospect.website,
      status: 'ativo'
    }));

    await supabase
      .from('contacts')
      .insert(contactsToInsert);

    console.log('Success! Generated', insertedLeads?.length || 0, 'prospects');

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${prospectsData.prospects.length} prospects gerados e cadastrados com sucesso!`,
      prospects: insertedLeads
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-prospects function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});