import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const googleGeminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

console.log('Environment check:', {
  hasGeminiKey: !!googleGeminiApiKey,
  hasSupabaseUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Função para buscar dados reais da ReceitaWS
async function fetchCNPJData(cnpj: string) {
  try {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cleanCNPJ}`);
    
    if (!response.ok) {
      console.log(`Failed to fetch CNPJ ${cnpj}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Verificar se é MEI ou terceiro setor (exclusões)
    if (data.porte === 'MICRO EMPRESA' && data.natureza_juridica?.includes('INDIVIDUAL')) {
      console.log(`Skipping MEI: ${data.nome}`);
      return null;
    }
    
    if (data.natureza_juridica?.includes('ASSOCIAÇÃO') || 
        data.natureza_juridica?.includes('FUNDAÇÃO') ||
        data.natureza_juridica?.includes('ORGANIZAÇÃO')) {
      console.log(`Skipping third sector: ${data.nome}`);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching CNPJ ${cnpj}:`, error);
    return null;
  }
}

// Função para gerar CNPJs válidos de teste
function generateTestCNPJs(count: number): string[] {
  const cnpjs = [];
  const baseCNPJs = [
    '11.222.333/0001-81',
    '33.444.555/0001-77', 
    '55.666.777/0001-88',
    '77.888.999/0001-99',
    '12.345.678/0001-90',
    '98.765.432/0001-10',
    '11.111.222/0001-33',
    '44.555.666/0001-77',
    '22.333.444/0001-55',
    '66.777.888/0001-99'
  ];
  
  for (let i = 0; i < count && i < baseCNPJs.length; i++) {
    cnpjs.push(baseCNPJs[i]);
  }
  
  return cnpjs;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  
  try {
    console.log('Generate prospects hybrid function started');
    
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error('JSON parse error:', jsonError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    const { userId } = body;
    console.log('Generating prospects for user:', userId);
    
    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'UserId é obrigatório'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    if (!googleGeminiApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Google Gemini API key não configurada'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // FASE 1: COLETA DE DADOS REAIS
    console.log('Phase 1: Collecting real data from ReceitaWS...');
    
    const testCNPJs = generateTestCNPJs(10);
    const realCompaniesData = [];
    
    // Buscar dados reais com delay para evitar rate limiting
    for (const cnpj of testCNPJs) {
      const companyData = await fetchCNPJData(cnpj);
      if (companyData && companyData.status === 'OK') {
        realCompaniesData.push({
          cnpj: companyData.cnpj,
          nome: companyData.nome,
          fantasia: companyData.fantasia,
          atividade_principal: companyData.atividade_principal?.[0],
          natureza_juridica: companyData.natureza_juridica,
          porte: companyData.porte,
          endereco: companyData.logradouro,
          bairro: companyData.bairro,
          municipio: companyData.municipio,
          uf: companyData.uf,
          telefone: companyData.telefone,
          email: companyData.email,
          situacao: companyData.situacao,
          socios: companyData.qsa
        });
        
        // Delay para evitar rate limiting da ReceitaWS
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`Found ${realCompaniesData.length} valid companies from ReceitaWS`);
    
    if (realCompaniesData.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Nenhuma empresa válida encontrada nas fontes de dados'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // FASE 2: QUALIFICAÇÃO COM LLM
    console.log('Phase 2: Qualifying real data with LLM...');
    
    const qualificationPrompt = `
    Você é um especialista em qualificação de leads para abertura de conta PJ C6 Bank.
    
    DADOS REAIS COLETADOS:
    ${JSON.stringify(realCompaniesData, null, 2)}
    
    TAREFA: Qualifique cada empresa usando metodologia BANT adaptada para C6 Bank PJ:
    
    CRITÉRIOS:
    - Budget: Sem exigência mínima (conta gratuita)
    - Authority: Identifique sócio/proprietário como decisor
    - Need: Foque em redução de custos bancários
    - Timing: Urgência baseada em porte/atividade
    
    BENEFÍCIOS C6 BANK PJ:
    - Conta 100% gratuita
    - Pix ilimitado
    - 100 TEDs gratuitos
    - 100 boletos gratuitos
    - Crédito sujeito a análise
    - Atendimento humano via escritório autorizado
    
    Para cada empresa válida, retorne:
    
    {
      "prospects": [
        {
          "empresa": "[nome da empresa]",
          "cnpj": "[cnpj formatado]",
          "setor": "[setor baseado na atividade principal]",
          "cnae": "[código CNAE]",
          "regime_tributario": "[baseado no porte: Simples/Presumido/Real]",
          "contato_decisor": "[nome do sócio] (Sócio)",
          "telefone": "[telefone da empresa ou estimado]",
          "email": "[email corporativo baseado no domínio]",
          "website": "[website estimado baseado no nome]",
          "gancho_prospeccao": "[gancho específico focado nos benefícios C6 Bank]",
          "qualification_score": "[Alta/Média/Baixa]",
          "urgency_level": "[Imediata/Média/Baixa]",
          "estimated_revenue": "[baseado no porte]",
          "approach_strategy": "[estratégia de abordagem]"
        }
      ]
    }
    
    IMPORTANTE: Use APENAS os dados reais fornecidos. Não invente informações.`;

    console.log('Calling Google Gemini API for qualification...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleGeminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: qualificationPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3
        }
      })
    });
    
    console.log('Google Gemini response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Limite de requisições do Google Gemini atingido. Aguarde alguns minutos.');
      }
      throw new Error(`Google Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    let content = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      content = data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Resposta inválida da IA. Estrutura de dados inesperada.');
    }
    
    console.log('Parsing qualification response...');
    
    let qualifiedProspects;
    try {
      // Clean the content
      let cleanedContent = content.trim();
      cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      const jsonStart = cleanedContent.indexOf('{');
      const jsonEnd = cleanedContent.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
      }
      
      qualifiedProspects = JSON.parse(cleanedContent);
      console.log('Successfully qualified prospects:', qualifiedProspects?.prospects?.length || 0);
      
    } catch (parseError) {
      console.error('Parse error:', parseError);
      throw new Error('Resposta inválida da IA. Não foi possível processar a qualificação.');
    }

    if (!qualifiedProspects.prospects || !Array.isArray(qualifiedProspects.prospects)) {
      throw new Error('Estrutura de dados inválida da IA');
    }

    // FASE 3: SALVAR NO BANCO
    console.log('Phase 3: Saving qualified leads to database...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const leadsToInsert = qualifiedProspects.prospects.map((prospect) => ({
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
      qualification_score: prospect.qualification_score,
      urgency_level: prospect.urgency_level,
      estimated_revenue: prospect.estimated_revenue,
      approach_strategy: prospect.approach_strategy,
      status: 'novo'
    }));

    const { data: insertedLeads, error: insertError } = await supabase.from('leads').insert(leadsToInsert).select();
    
    if (insertError) {
      console.error('Database error:', insertError);
      throw new Error(`Erro no banco de dados: ${insertError.message}`);
    }
    
    // Salvar nos contatos
    const contactsToInsert = qualifiedProspects.prospects.map((prospect) => ({
      user_id: userId,
      nome: prospect.contato_decisor,
      empresa: prospect.empresa,
      cargo: prospect.contato_decisor.includes('(') ? prospect.contato_decisor.split('(')[1].replace(')', '') : 'Sócio',
      email: prospect.email,
      telefone: prospect.telefone,
      website: prospect.website,
      status: 'ativo'
    }));

    await supabase.from('contacts').insert(contactsToInsert);
    
    console.log('Success! Generated', insertedLeads?.length || 0, 'qualified prospects');
    
    return new Response(JSON.stringify({
      success: true,
      message: `${qualifiedProspects.prospects.length} prospects qualificados com dados reais e cadastrados com sucesso!`,
      prospects: insertedLeads,
      metadata: {
        realDataCollected: realCompaniesData.length,
        qualifiedProspects: qualifiedProspects.prospects.length,
        architecture: 'hybrid-real-data-collection'
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Error in generate-prospects-hybrid function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});