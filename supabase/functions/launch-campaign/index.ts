import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Roteiros de prospecção predefinidos
const CAMPAIGN_SCRIPTS = [
  {
    empresa: "Ambev",
    roteiro_ligacao: "Bom dia, falo com o CFO ou responsável tributário? Vi que a Ambev tem enfrentado pressões relacionadas a créditos de ICMS e fiscalizações estaduais. Nosso trabalho é estruturar estratégias para recuperar valores e reduzir carga em operações industriais. Gostaria de marcar 15 minutos para explorar se isso pode gerar ganhos para vocês.",
    assunto_email: "Potenciais créditos tributários para Ambev",
    modelo_email: "Prezado [Nome], Identificamos oportunidades de recuperação tributária ligadas a ICMS e benefícios fiscais em operações industriais de bebidas. Atuamos junto a players do seu porte para maximizar créditos e reduzir passivos. Podemos agendar 20 min para detalhar os cenários aplicáveis à Ambev? Atenciosamente, [Seu Nome]"
  },
  {
    empresa: "JBS",
    roteiro_ligacao: "Bom dia, [Nome]. A JBS aparece em várias auditorias sobre passivos tributários de exportação e créditos de ICMS. Nosso escritório trabalha diretamente em estratégias para reduzir riscos fiscais nesse cenário. Posso explicar como otimizamos créditos em grandes indústrias de proteína?",
    assunto_email: "Estratégias fiscais para exportações da JBS",
    modelo_email: "Prezado [Nome], Recentes auditorias do setor reforçam a importância de estruturar melhor créditos de ICMS em exportação. Nossa equipe auxilia multinacionais a reduzir riscos e capturar benefícios fiscais de forma segura. Poderíamos conversar na próxima semana? [Seu Nome]"
  },
  {
    empresa: "BRF",
    roteiro_ligacao: "Bom dia, [Nome]. A BRF vem de um ciclo de reestruturação societária e ajustes fiscais. Nosso trabalho é justamente apoiar grupos nesse momento, trazendo recuperação tributária em ICMS de insumos e compliance reforçado. Seria útil avaliarmos juntos?",
    assunto_email: "Recuperação de créditos BRF",
    modelo_email: "Prezado [Nome], Identificamos oportunidades em créditos de ICMS na cadeia de insumos da BRF, especialmente após a recente reorganização societária. Nosso objetivo é gerar ganhos líquidos com segurança jurídica. Posso agendar uma apresentação curta? [Seu Nome]"
  },
  {
    empresa: "Vale",
    roteiro_ligacao: "Bom dia, [Nome]. A Vale tem alta exposição a questões fiscais e ambientais, e vimos notícias sobre autuações em ICMS de exportações minerais. Ajudamos empresas do setor a reduzir riscos tributários e estruturar planejamentos de longo prazo.",
    assunto_email: "Redução de riscos fiscais na Vale",
    modelo_email: "Prezado [Nome], Notamos autuações recentes ligadas a exportações minerais. Atuamos com estratégias avançadas para mitigar riscos e recuperar créditos tributários em operações desse porte. Quando podemos conversar? [Seu Nome]"
  },
  {
    empresa: "Gerdau",
    roteiro_ligacao: "Bom dia, [Nome]. Acompanhamos as mudanças societárias recentes na Gerdau e os impactos no regime tributário. Nosso foco é mapear créditos acumulados de ICMS em exportações de aço. Gostaria de agendar um bate-papo?",
    assunto_email: "Créditos de ICMS acumulados – Gerdau",
    modelo_email: "Prezado [Nome], Empresas siderúrgicas têm grande potencial de recuperação em ICMS acumulado. Podemos apresentar casos similares e ganhos obtidos. Agenda disponível nesta ou na próxima semana? [Seu Nome]"
  },
  {
    empresa: "Suzano",
    roteiro_ligacao: "Bom dia, [Nome]. A Suzano anunciou investimentos recentes no setor de papel e celulose. Em projetos assim, normalmente há créditos de ICMS e PIS/COFINS relevantes. Nosso escritório mapeia essas oportunidades com foco em aumento de caixa.",
    assunto_email: "Recuperação tributária em novos investimentos – Suzano",
    modelo_email: "Prezado [Nome], Grandes investimentos da Suzano podem estar gerando créditos não aproveitados. Ajudamos a mapear e recuperar esses valores com total segurança. Poderíamos agendar uma conversa? [Seu Nome]"
  },
  {
    empresa: "Petrobras",
    roteiro_ligacao: "Bom dia, [Nome]. A Petrobras frequentemente enfrenta auditorias fiscais pesadas, inclusive sobre ICMS em derivados. Nosso trabalho é blindar juridicamente e capturar créditos em operações complexas. Gostaria de entender como estão tratando esse tema hoje.",
    assunto_email: "Blindagem fiscal e créditos tributários – Petrobras",
    modelo_email: "Prezado [Nome], Atuamos com multinacionais expostas a fiscalizações em ICMS e combustíveis. Podemos apoiar a Petrobras em recuperação de créditos e redução de riscos. Podemos marcar uma breve reunião? [Seu Nome]"
  },
  {
    empresa: "Eletrobras",
    roteiro_ligacao: "Bom dia, [Nome]. A Eletrobras passou por mudanças societárias e de governança. Isso normalmente traz reflexos em compliance tributário. Nosso escritório atua em diagnósticos preventivos e recuperação de créditos. Podemos conversar sobre isso?",
    assunto_email: "Compliance tributário em mudanças societárias – Eletrobras",
    modelo_email: "Prezado [Nome], Mudanças recentes de governança podem abrir espaço para revisão tributária preventiva. Temos experiência em mapear riscos e gerar ganhos líquidos. Gostaria de detalhar em reunião? [Seu Nome]"
  },
  {
    empresa: "Embraer",
    roteiro_ligacao: "Bom dia, [Nome]. A Embraer tem histórico de incentivos fiscais na exportação. Muitas vezes, esses créditos não são totalmente aproveitados. Nosso time atua justamente em maximizar esses benefícios. Podemos marcar um diagnóstico rápido?",
    assunto_email: "Maximização de incentivos fiscais – Embraer",
    modelo_email: "Prezado [Nome], Exportadoras como a Embraer possuem créditos acumulados relevantes. Podemos avaliar juntos como potencializar esses benefícios. Posso sugerir um horário breve? [Seu Nome]"
  },
  {
    empresa: "Magazine Luiza",
    roteiro_ligacao: "Bom dia, [Nome]. Notamos notícias recentes sobre aumento da carga de ICMS no varejo digital. Atuamos junto a grandes redes para reduzir passivos e recuperar créditos em operações omnichannel. Posso explicar como aplicamos no setor?",
    assunto_email: "Redução de carga tributária – Magalu",
    modelo_email: "Prezado [Nome], O varejo digital vem sofrendo forte impacto de ICMS. Atuamos com grandes players para reverter parte desses custos. Quando seria um bom momento para conversarmos? [Seu Nome]"
  },
  {
    empresa: "Localiza",
    roteiro_ligacao: "Bom dia, [Nome]. A Localiza, após a fusão com Unidas, enfrenta desafios tributários relevantes. Nosso escritório auxilia em reorganizações societárias e no aproveitamento de créditos de frota. Gostaria de marcar um call?",
    assunto_email: "Ganhos fiscais na reorganização da Localiza",
    modelo_email: "Prezado [Nome], Fusões e aquisições trazem espaço para ajustes tributários. Podemos ajudar a Localiza a capturar créditos e reduzir riscos. Posso sugerir um horário para apresentar? [Seu Nome]"
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Launch campaign function started');
    
    const body = await req.json();
    const { userId } = body;
    
    console.log('Processing campaign launch for user:', userId);

    if (!userId) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'userId é obrigatório'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração do Supabase não encontrada');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Creating campaign...');
    
    // Criar nova campanha
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        user_id: userId,
        name: `Campanha Tributária - ${new Date().toLocaleDateString('pt-BR')}`,
        description: 'Campanha de prospecção para grandes empresas com foco em recuperação tributária e compliance',
        target_companies: CAMPAIGN_SCRIPTS.map(s => s.empresa),
        status: 'ativa'
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Erro ao criar campanha:', campaignError);
      throw new Error(`Erro ao criar campanha: ${campaignError.message}`);
    }

    console.log('Campaign created with ID:', campaign.id);
    
    // Inserir roteiros da campanha
    const campaignScriptsData = CAMPAIGN_SCRIPTS.map(script => ({
      campaign_id: campaign.id,
      empresa: script.empresa,
      roteiro_ligacao: script.roteiro_ligacao,
      assunto_email: script.assunto_email,
      modelo_email: script.modelo_email
    }));

    const { error: scriptsError } = await supabase
      .from('campaign_scripts')
      .insert(campaignScriptsData);

    if (scriptsError) {
      console.error('Erro ao inserir roteiros:', scriptsError);
      throw new Error(`Erro ao criar roteiros: ${scriptsError.message}`);
    }

    console.log('Campaign scripts created successfully');

    // Chamar função de WhatsApp para enviar mensagens
    console.log('Calling WhatsApp function...');
    
    try {
      const whatsappResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-campaign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          campaignId: campaign.id,
          userId: userId
        })
      });

      if (whatsappResponse.ok) {
        console.log('WhatsApp campaign triggered successfully');
      } else {
        console.warn('WhatsApp campaign failed:', await whatsappResponse.text());
      }
    } catch (whatsappError) {
      console.warn('Erro ao disparar WhatsApp (não crítico):', whatsappError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `✅ **Campanha Criada com Sucesso!**\n\nCampanha "${campaign.name}" foi criada com ${CAMPAIGN_SCRIPTS.length} roteiros personalizados para grandes empresas.\n\n📊 **Empresas incluídas:** ${CAMPAIGN_SCRIPTS.map(s => s.empresa).join(', ')}\n\n🚀 **Próximos passos automáticos:**\n- WhatsApp será enviado para prospects qualificados\n- E-mails de follow-up serão disparados\n- RAG AI fará o acompanhamento das respostas\n\nVocê pode acompanhar o progresso na aba de Campanhas!`,
      campaignId: campaign.id,
      totalScripts: CAMPAIGN_SCRIPTS.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in launch-campaign function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});