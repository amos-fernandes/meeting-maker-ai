// Base de conhecimento com dados dos alvos e roteiros de prospecção
export interface Target {
  empresa: string;
  setor: string;
  cnae: string;
  regime_tributario: string;
  contato_decisor: string;
  telefone: string;
  email: string;
  website: string;
  gancho_prospeccao: string;
}

export interface CallScript {
  empresa: string;
  roteiro_ligacao: string;
  modelo_email: string;
}

export const TARGETS: Target[] = [
  {
    empresa: "Jalles Machado S.A.",
    setor: "Agroindústria - Açúcar e Etanol",
    cnae: "1071-6/00",
    regime_tributario: "Lucro Real",
    contato_decisor: "CFO/Tributário",
    telefone: "(62) 3321-8200",
    email: "ri@jallesmachado.com",
    website: "jallesmachado.com.br",
    gancho_prospeccao: "Investimentos recentes em expansão de capacidade e alta carga de ICMS – possível otimização tributária"
  },
  {
    empresa: "CRV Industrial",
    setor: "Agroindústria - Etanol",
    cnae: "1931-4/00",
    regime_tributario: "Lucro Real",
    contato_decisor: "Gerente Fiscal",
    telefone: "(64) 2103-8600",
    email: "contato@crvindustrial.com.br",
    website: "crvindustrial.com.br",
    gancho_prospeccao: "Endividamento fiscal registrado em execuções trabalhistas/fiscais – oportunidade de recuperação"
  },
  {
    empresa: "São Salvador Alimentos (SSA)",
    setor: "Agroindústria - Frango",
    cnae: "1012-1/01",
    regime_tributario: "Lucro Real",
    contato_decisor: "Diretor Tributário",
    telefone: "(62) 3330-7000",
    email: "relacionamento@ssa-alimentos.com.br",
    website: "ssa-alimentos.com.br",
    gancho_prospeccao: "Auditorias e crescimento exportador – risco de créditos tributários não aproveitados"
  },
  {
    empresa: "Cerradinho Bioenergia",
    setor: "Bioenergia e Etanol",
    cnae: "1931-4/00",
    regime_tributario: "Lucro Real",
    contato_decisor: "CFO",
    telefone: "(64) 2101-8100",
    email: "contato@cerradinho.com",
    website: "grupocerradinho.com",
    gancho_prospeccao: "Expansão logística e ICMS elevado – necessidade de planejamento fiscal"
  },
  {
    empresa: "Complem Cooperativa",
    setor: "Cooperativa Agroindustrial",
    cnae: "4639-7/01",
    regime_tributario: "Livre Coop/Presumido",
    contato_decisor: "Gerente Fiscal",
    telefone: "(64) 3671-3000",
    email: "contato@complem.com.br",
    website: "complem.com.br",
    gancho_prospeccao: "Mudanças societárias e passivos em dívidas fiscais – oportunidade de compliance"
  },
  {
    empresa: "Grupo Odilon Santos (OZ)",
    setor: "Transportes e Logística",
    cnae: "4923-0/02",
    regime_tributario: "Lucro Real",
    contato_decisor: "Diretor Financeiro",
    telefone: "(62) 3269-7000",
    email: "contato@odilon.com.br",
    website: "odilon.com.br",
    gancho_prospeccao: "Grandes contratos logísticos, margens apertadas – possível recuperação de créditos PIS/COFINS"
  },
  {
    empresa: "Caramuru Alimentos",
    setor: "Agroindustrial - Soja",
    cnae: "1061-9/00",
    regime_tributario: "Lucro Real",
    contato_decisor: "CFO",
    telefone: "(62) 2103-6700",
    email: "contato@caramuru.com",
    website: "caramuru.com",
    gancho_prospeccao: "Exportações crescentes, benefício fiscal REINTEGRA – suporte em auditorias e compliance"
  },
  {
    empresa: "Grupo JC Distribuição",
    setor: "Distribuição e Atacado",
    cnae: "4639-7/01",
    regime_tributario: "Livre/Presumido",
    contato_decisor: "Diretor Tributário",
    telefone: "(62) 4002-3200",
    email: "comercial@jcdistribuicao.com.br",
    website: "jcdistribuicao.com.br",
    gancho_prospeccao: "Margens tributárias elevadas e dívidas ativas estaduais – revisão tributária"
  },
  {
    empresa: "União Química",
    setor: "Indústria Farmacêutica",
    cnae: "2121-1/01",
    regime_tributario: "Lucro Real",
    contato_decisor: "CFO/Tributário",
    telefone: "(61) 2107-9000",
    email: "contato@uniaoquimica.com.br",
    website: "uniaoquimica.com.br",
    gancho_prospeccao: "Expansão em Goiás – incentivos fiscais subaproveitados"
  },
  {
    empresa: "Mabel Alimentos (Pepsico)",
    setor: "Indústria de Biscoitos",
    cnae: "1091-1/02",
    regime_tributario: "Lucro Real",
    contato_decisor: "Gerente Fiscal",
    telefone: "(62) 2103-4100",
    email: "contato@mabel.com.br",
    website: "mabel.com.br",
    gancho_prospeccao: "Auditorias e forte carga ICMS-ST – possível recuperação de créditos"
  },
  {
    empresa: "Cereal Ouro",
    setor: "Agroindústria - Arroz e Grãos",
    cnae: "1061-9/02",
    regime_tributario: "Livre/Presumido",
    contato_decisor: "Gerente Fiscal",
    telefone: "(64) 3411-2200",
    email: "contato@cerealouro.com",
    website: "cerealouro.com.br",
    gancho_prospeccao: "Histórico de execuções fiscais e ICMS elevado – oportunidade de compliance e recuperação"
  }
];

export const CALL_SCRIPTS: CallScript[] = [
  {
    empresa: "Ambev",
    roteiro_ligacao: "Bom dia, falo com o CFO ou responsável tributário? Vi que a Ambev tem enfrentado pressões relacionadas a créditos de ICMS e fiscalizações estaduais. Nosso trabalho é estruturar estratégias para recuperar valores e reduzir carga em operações industriais. Gostaria de marcar 15 minutos para explorar se isso pode gerar ganhos para vocês.",
    modelo_email: "Assunto: Potenciais créditos tributários para Ambev Prezado [Nome], Identificamos oportunidades de recuperação tributária ligadas a ICMS e benefícios fiscais em operações industriais de bebidas. Atuamos junto a players do seu porte para maximizar créditos e reduzir passivos. Podemos agendar 20 min para detalhar os cenários aplicáveis à Ambev? Atenciosamente, [Seu Nome]"
  },
  {
    empresa: "JBS",
    roteiro_ligacao: "Bom dia, [Nome]. A JBS aparece em várias auditorias sobre passivos tributários de exportação e créditos de ICMS. Nosso escritório trabalha diretamente em estratégias para reduzir riscos fiscais nesse cenário. Posso explicar como otimizamos créditos em grandes indústrias de proteína?",
    modelo_email: "Assunto: Estratégias fiscais para exportações da JBS Prezado [Nome], Recentes auditorias do setor reforçam a importância de estruturar melhor créditos de ICMS em exportação. Nossa equipe auxilia multinacionais a reduzir riscos e capturar benefícios fiscais de forma segura. Poderíamos conversar na próxima semana? [Seu Nome]"
  },
  {
    empresa: "BRF",
    roteiro_ligacao: "Bom dia, [Nome]. A BRF vem de um ciclo de reestruturação societária e ajustes fiscais. Nosso trabalho é justamente apoiar grupos nesse momento, trazendo recuperação tributária em ICMS de insumos e compliance reforçado. Seria útil avaliarmos juntos?",
    modelo_email: "Assunto: Recuperação de créditos BRF Prezado [Nome], Identificamos oportunidades em créditos de ICMS na cadeia de insumos da BRF, especialmente após a recente reorganização societária. Nosso objetivo é gerar ganhos líquidos com segurança jurídica. Posso agendar uma apresentação curta? [Seu Nome]"
  }
];

// Função para buscar alvos por palavra-chave
export function searchTargets(query: string): Target[] {
  const searchTerm = query.toLowerCase();
  return TARGETS.filter(target => 
    target.empresa.toLowerCase().includes(searchTerm) ||
    target.setor.toLowerCase().includes(searchTerm) ||
    target.gancho_prospeccao.toLowerCase().includes(searchTerm)
  );
}

// Função para obter roteiro por empresa
export function getCallScript(empresa: string): CallScript | undefined {
  return CALL_SCRIPTS.find(script => 
    script.empresa.toLowerCase().includes(empresa.toLowerCase())
  );
}

// Função RAG para buscar informações relevantes
export function performRAGSearch(query: string): { targets: Target[], scripts: CallScript[], suggestions: string[] } {
  const queryLower = query.toLowerCase();
  
  // Buscar alvos relevantes
  const relevantTargets = TARGETS.filter(target => 
    target.empresa.toLowerCase().includes(queryLower) ||
    target.setor.toLowerCase().includes(queryLower) ||
    target.gancho_prospeccao.toLowerCase().includes(queryLower) ||
    queryLower.includes(target.empresa.toLowerCase().split(' ')[0])
  );

  // Buscar scripts relevantes
  const relevantScripts = CALL_SCRIPTS.filter(script =>
    script.empresa.toLowerCase().includes(queryLower) ||
    queryLower.includes(script.empresa.toLowerCase())
  );

  // Gerar sugestões baseadas na consulta
  const suggestions = [];
  if (queryLower.includes('lead') || queryLower.includes('prospect')) {
    suggestions.push('Qualificação BANT para leads B2B', 'Estratégias de abordagem por setor', 'Follow-up automático');
  }
  if (queryLower.includes('tributário') || queryLower.includes('fiscal')) {
    suggestions.push('Recuperação de créditos ICMS', 'Compliance tributário', 'Planejamento fiscal');
  }
  if (queryLower.includes('reunião') || queryLower.includes('meeting')) {
    suggestions.push('Melhores horários para contato', 'Scripts de agendamento', 'Follow-up pós reunião');
  }

  return { targets: relevantTargets, scripts: relevantScripts, suggestions };
}