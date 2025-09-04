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

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    console.log('Generate prospects function started');
    
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
    console.log('Generating prospects for user:', userId, 'Body received:', body);
    
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

    const prompt = `
    Você é um especialista em inteligência de mercado focado em prospecção B2B para uma analise contábil e tributária especializada em medias empresas na cidade de goiania, estado de Goias.

    Sua tarefa é identificar EXATAMENTE 50 prospects de alto potencial nas seguintes áreas:

        Comércio e Varejo (bebidas, açougues, vestuários, restaurante e similares)

        E-commerce e Marketplaces

        Saúde e Educação (Clínicas, consultorios, Cursos)

        Drogarias e Farmacias

        Transportes e Logística

    Profissionais Liberais e Prestadores de Serviços ( Médicos, dentistas, advogados, engenheiros, arquitetos).

    Para cada prospect, você deve gerar as seguintes informações:

        CNPJ

        Nome real da empresa

        Setor de atuação

        CNAE principal

        Regime tributário provável (Simples nacional, Lucro Real ou Presumido)

        Nome e cargo do decisor (Ex: Sócio, CEO, CFO, Diretor, Gerente geral)

        E-mail corporativo (formato nome.sobrenome@empresa.com.br)

        Telefone comercial

        Telefone pessoal do tomador de decisões

        Website oficial

        Gancho de prospecção (Este é o ponto crucial. O gancho deve ser embasado em dados públicos e auditáveis que revelem uma dor ou oportunidade real para a empresa, como:

            Fiscal/Contábil: Mudanças recentes em regimes especiais de tributação (ex: ICMS), autuações fiscais (conforme notícias ou processos públicos), incentivos fiscais expirando ou mal utilizados.

          Crescimento acelerado sem gestão para tomada de decisão

          Controle de vendas interestaduais (difal de ICMS).


            Financeiro: Publicação de balanços financeiros que mostram alta carga tributária, perdas recorrentes, ou margens de lucro apertadas.

            Alto volume de pagamentos e recebimentos.

            Gestão de folha, encargos trabalhistas e benefícios.

              Regras específicas de incentivos fiscais.


            Operacional/Estratégico: Anúncio de fusões e aquisições, expansão para novos estados, necessidade de recuperação judicial, ou entrada em um novo mercado que exige uma reestruturação tributária.

          Complexidade na apuração de impostos sobre produção.

          Gestão de créditos de ICMS, IPI e regimes especiais.

            Controle de custos e estoques.

            Grande volume de notas fiscais e transações diárias.

            Apuração de ICMS, PIS, COFINS e substituição tributária.

            Necessidade de planejamento tributário para reduzir custos   


        Regulatório: Requisitos de compliance complexos ou problemas com órgãos reguladores (ex: ANVISA para farmacêuticas, ANP para energia).

        A prospecção deve ser baseada em fontes confiáveis como:

            Diário Oficial da União/Estado

            Balanços e demonstrações financeiras publicadas

            Notícias de veículos de imprensa confiáveis sobre M&A, expansões ou problemas fiscais

            Comunicados de órgãos reguladores

            Juntas Comerciais

          Cartório de Registro Civil de Pessoas Jurídicas

          Receita Federal

          Prefeitura Municipal

          Secretaria Estadual da Fazenda (SEFAZ)

        Órgãos de Classe (quando aplicável) ex.: OAB, CRM, CRV, CREA

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
              "gancho_prospeccao": "Investimentos recentes em expansão, problemas fiscais"
            }
          ]
        }`;

    console.log('Calling Google Gemini API...');
    
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
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.5
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
    
    console.log('Parsing Google Gemini response...');
    console.log('Raw content from Gemini:', content.substring(0, 200));
    
    let prospectsData;
    try {
      // Clean the content more thoroughly
      let cleanedContent = content.trim();
      
      // Remove markdown code blocks if present
      cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Find the JSON object in the response - look for the first { and last }
      const jsonStart = cleanedContent.indexOf('{');
      let jsonEnd = cleanedContent.lastIndexOf('}');
      
      if (jsonStart === -1) {
        console.error('No opening brace found in response');
        throw new Error('Resposta da IA não contém JSON válido');
      }
      
      // If no closing brace found, the response might be truncated
      if (jsonEnd === -1 || jsonEnd <= jsonStart) {
        console.log('JSON appears to be truncated, attempting to reconstruct');
        
        // Try to find the end of the prospects array
        const prospectsStart = cleanedContent.indexOf('"prospects"');
        if (prospectsStart !== -1) {
          // Find the array opening bracket
          const arrayStart = cleanedContent.indexOf('[', prospectsStart);
          if (arrayStart !== -1) {
            // Find the last complete prospect object
            let lastCompleteObject = arrayStart;
            let braceCount = 0;
            let inString = false;
            let escapeNext = false;
            
            for (let i = arrayStart + 1; i < cleanedContent.length; i++) {
              const char = cleanedContent[i];
              
              if (escapeNext) {
                escapeNext = false;
                continue;
              }
              
              if (char === '\\') {
                escapeNext = true;
                continue;
              }
              
              if (char === '"') {
                inString = !inString;
                continue;
              }
              
              if (!inString) {
                if (char === '{') {
                  braceCount++;
                } else if (char === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    lastCompleteObject = i;
                  }
                }
              }
            }
            
            if (lastCompleteObject > arrayStart) {
              // Reconstruct the JSON with complete objects only
              cleanedContent = '{"prospects": [' + 
                cleanedContent.substring(arrayStart + 1, lastCompleteObject + 1) + 
                ']}';
              console.log('Reconstructed JSON from truncated response');
            }
          }
        }
      } else {
        cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
      }
      
      console.log('Cleaned JSON content length:', cleanedContent.length);
      
      prospectsData = JSON.parse(cleanedContent);
      console.log('Successfully parsed JSON, prospects count:', prospectsData?.prospects?.length || 0);
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content that failed to parse:', content.substring(0, 1000));
      
      // Try alternative parsing - sometimes the AI returns the JSON without the wrapper
      try {
        // Look for prospects array directly
        const prospectsMatch = content.match(/"prospects"\s*:\s*\[([\s\S]*?)\]/);
        if (prospectsMatch) {
          const prospectsArrayStr = `{"prospects":[${prospectsMatch[1]}]}`;
          prospectsData = JSON.parse(prospectsArrayStr);
          console.log('Successfully parsed with alternative method');
        } else {
          throw new Error('Could not extract prospects array');
        }
      } catch (altParseError) {
        console.error('Alternative parsing also failed:', altParseError);
        throw new Error('Resposta inválida da IA. A resposta não está em formato JSON válido.');
      }
    }

    if (!prospectsData.prospects || !Array.isArray(prospectsData.prospects)) {
      throw new Error('Estrutura de dados inválida da IA');
    }

    console.log('Saving to database...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const leadsToInsert = prospectsData.prospects.map((prospect) => ({
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

    const { data: insertedLeads, error: insertError } = await supabase.from('leads').insert(leadsToInsert).select();
    
    if (insertError) {
      console.error('Database error:', insertError);
      throw new Error(`Erro no banco de dados: ${insertError.message}`);
    }
    
    // Salvar nos contatos
    const contactsToInsert = prospectsData.prospects.map((prospect) => ({
      user_id: userId,
      nome: prospect.contato_decisor,
      empresa: prospect.empresa,
      cargo: prospect.contato_decisor.includes('(') ? prospect.contato_decisor.split('(')[1].replace(')', '') : 'Decisor',
      email: prospect.email,
      telefone: prospect.telefone,
      website: prospect.website,
      status: 'ativo'
    }));

    await supabase.from('contacts').insert(contactsToInsert);
    
    console.log('Success! Generated', insertedLeads?.length || 0, 'prospects');
    
    return new Response(JSON.stringify({
      success: true,
      message: `${prospectsData.prospects.length} prospects gerados e cadastrados com sucesso!`,
      prospects: insertedLeads
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in generate-prospects function:', error);
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