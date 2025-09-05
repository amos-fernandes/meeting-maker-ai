import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search, 
  Download, 
  Edit, 
  Trash2,
  Building2,
  Mail,
  Phone,
  Globe,
  Upload
} from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { exportLeadsToCSV } from "@/utils/csvExport";

const leadSchema = z.object({
  empresa: z.string().min(1, "Nome da empresa é obrigatório"),
  setor: z.string().optional(),
  cnae: z.string().optional(),
  regime_tributario: z.string().optional(),
  contato_decisor: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  website: z.string().optional(),
  gancho_prospeccao: z.string().optional(),
  status: z.string().default("novo")
});

type LeadFormData = z.infer<typeof leadSchema>;

interface Lead extends LeadFormData {
  id: string;
  created_at: string;
  updated_at: string;
}

interface LeadsManagerProps {
  onStatsUpdate: () => void;
}

const LeadsManager = ({ onStatsUpdate }: LeadsManagerProps) => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [importing, setImporting] = useState(false);
  
  const LEADS_PER_PAGE = 10;

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      empresa: "",
      setor: "",
      cnae: "",
      regime_tributario: "",
      contato_decisor: "",
      telefone: "",
      email: "",
      website: "",
      gancho_prospeccao: "",
      status: "novo"
    }
  });

  useEffect(() => {
    if (user) {
      loadLeads();
    }
  }, [user]);

  const loadLeads = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: LeadFormData) => {
    if (!user) return;

    try {
      setLoading(true);

      if (editingLead) {
        // Atualizar lead existente
        const { error } = await supabase
          .from('leads')
          .update(data)
          .eq('id', editingLead.id)
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success('Lead atualizado com sucesso!');
      } else {
        // Criar novo lead
        const { error } = await supabase
          .from('leads')
          .insert({ 
            ...data, 
            user_id: user.id,
            empresa: data.empresa || 'Nova Empresa',
          });

        if (error) throw error;
        toast.success('Lead criado com sucesso!');
      }

      form.reset();
      setIsDialogOpen(false);
      setEditingLead(null);
      loadLeads();
      onStatsUpdate();
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      toast.error('Erro ao salvar lead');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    form.reset(lead);
    setIsDialogOpen(true);
  };

  const handleDelete = async (leadId: string) => {
    if (!user || !confirm('Tem certeza que deseja excluir este lead?')) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Lead excluído com sucesso!');
      loadLeads();
      onStatsUpdate();
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
      toast.error('Erro ao excluir lead');
    }
  };

  const handleExport = () => {
    exportLeadsToCSV(leads);
    toast.success('Leads exportados com sucesso!');
  };

  const standardizeRegime = (regime: string) => {
    const regimeMap: { [key: string]: string } = {
      'Lucro Real': 'lucro_real',
      'Real': 'lucro_real', 
      'Lucro Presumido': 'lucro_presumido',
      'Presumido': 'lucro_presumido',
      'Simples Nacional': 'simples_nacional',
      'Simples': 'simples_nacional'
    };
    return regimeMap[regime] || 'lucro_presumido';
  };

  const generateProspectingHook = (empresa: string, setor: string, regime: string) => {
    const hooks = {
      'odontol': 'Gestão de folha de pagamento para dentistas e colaboradores. Otimização fiscal e compliance para clínicas.',
      'constru': 'Complexidade na apuração de impostos sobre construção civil. Gestão de projetos e controle orçamentário.',
      'transport': 'Otimização de ICMS sobre serviços de transporte. Gestão de frota e controle de custos operacionais.',
      'aliment': 'Complexidade na apuração de ICMS-ST em produtos alimentícios. Alto volume de transações diárias.',
      'educa': 'Gestão de folha de pagamento para professores. Otimização da carga tributária sobre receitas de mensalidades.',
      'saude': 'Apuração de impostos sobre serviços médicos. Gestão de folha de pagamento especializada.',
      'tecnologia': 'Alta carga tributária sobre serviços de TI. Necessidade de controle fiscal robusto.',
      'advocacia': 'Complexidade dos regimes tributários para sociedades de advogados. Alta carga sobre honorários.',
      'default': 'Oportunidade de otimização tributária e planejamento fiscal estratégico.'
    };
    
    const key = Object.keys(hooks).find(k => 
      setor.toLowerCase().includes(k) || 
      empresa.toLowerCase().includes(k)
    ) || 'default';
    
    return hooks[key];
  };

  const importLeads = async (leadsData: any[]) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('leads')
      .insert(leadsData.map(lead => ({ ...lead, user_id: user.id })));
      
    if (error) throw error;
    
    loadLeads();
    onStatsUpdate();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      
      // Detect separator (comma or tab)
      const isTabSeparated = text.includes('\t');
      const separator = isTabSeparated ? '\t' : ',';
      
      const lines = text.split('\n').filter(line => line.trim());
      const newLeads = [];
      
      for (const line of lines) {
        const columns = line.split(separator);
        
        if (columns.length < 2) continue;
        
        let leadData;
        
        if (isTabSeparated) {
          // Format: Empresa	Municipio	Regime	Grupo	Ramo	Status	Data	Responsavel	Telefone	Email	Faturamento...
          leadData = {
            empresa: columns[0]?.trim() || '',
            setor: columns[4]?.trim() || '',
            regime_tributario: standardizeRegime(columns[2]?.trim() || ''),
            contato_decisor: columns[7]?.trim() || '',
            telefone: columns[8]?.trim() === '-' ? '' : columns[8]?.trim() || '',
            email: columns[9]?.trim() === '-' ? '' : columns[9]?.trim() || '',
            status: columns[5]?.toLowerCase().includes('ativa') ? 'ativo' : 'inativo',
            gancho_prospeccao: generateProspectingHook(columns[0]?.trim() || '', columns[4]?.trim() || '', columns[2]?.trim() || '')
          };
        } else {
          // CSV format: Qualificacao,Nome da Empresa,Setor,CNPJ,Telefone,Email,CNAE,Regime,Decisor,Gancho
          leadData = {
            empresa: columns[1]?.trim() || '',
            setor: columns[2]?.trim() || '',
            regime_tributario: standardizeRegime(columns[7]?.trim() || ''),
            contato_decisor: columns[8]?.trim() || '',
            telefone: columns[4]?.trim() || '',
            email: columns[5]?.trim() || '',
            cnae: columns[6]?.trim() || '',
            gancho_prospeccao: columns[9]?.trim() || '',
            qualification_score: columns[0]?.trim() || '',
            notes: `Qualificação: ${columns[0]?.trim() || 'N/A'}. CNPJ: ${columns[3]?.trim() || 'N/A'}`
          };
        }
        
        // Filter duplicates
        const exists = leads.some(lead => 
          lead.empresa.toLowerCase() === leadData.empresa.toLowerCase()
        );
        
        if (!exists && leadData.empresa) {
          newLeads.push(leadData);
        }
      }
      
      if (newLeads.length > 0) {
        await importLeads(newLeads);
        toast.success(`${newLeads.length} leads importados com sucesso!`);
      } else {
        toast.error('Nenhum lead novo encontrado para importar');
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };

    if (!user) return;
    
    const thirdPartData = `F E C HOLDING LTDA	GOIANIA	Presumido	Sem Grupo	Holdings de instituições não-financeiras	Ativa	01/01/2017	LEONARDO FERNANDES DE CASTRO	-	luisrodrigues702@gmail.com	R$ 0	0	R$ 0	0	0%				
F G 2 EMPREENDIMENTOS E PARTICIPACOES	GOIANIA	Presumido	JURANDIR 	Holdings de instituições não-financeiras	Ativa	01/01/2017	JURANDIR DIAS DE PAULA JUNIOR	-	jurandirdiasadv@gmail.com	R$ 0	0	R$ 192	50	0%				
FA1 LTDA ME	GOIANIA	Simples	Sem Grupo	Comércio varejista de produtos alimentícios em geral ou especializado em produtos alimentícios não especificados anteriormente	Inativa	01/01/2017	GUSTAVO RESENDE BALDUINO BRASIL	-	gustavo.balduino@hotmail.com	R$ 0	0	R$ 0	0	0%				
FABIO STIVAL 69400733100	APARECIDA DE GOIANIA	Sem regime definido	Sem Grupo	Promoção de vendas	Inativa	01/01/2017	FABIO STIVAL	-	adm.fdfhospitalar@gmail.com	R$ 0	0	R$ 0	0	0%				
FACIAL CLINICA ODONTOLOGICA SS	GOIANIA	Simples	MARIANITA 	Atividade odontológica	Ativa	01/01/2017	MARIANITA BATISTA DE MACEDO NERY	32121200	clinica-facial@hotmail.com	R$ 257.696	76	R$ 14.197	64	6%				
FACURE DE VITO CONSULTORIA EIRELI ME	GOIANIA	Presumido	Sem Grupo	Atividades de consultoria em gestão empresarial , exceto consultoria técnica específica	Inativa	01/01/2017	LUCIANA FACURE DE VITO	-	luciana@fralle.com.br	R$ 0	0	R$ 0	0	0%			
FAPF LTDA ME	GOIANIA	Sem regime definido	Sem Grupo	Comércio varejista de produtos alimentícios em geral ou especializado em produtos alimentícios não especificados anteriormente	Inativa	01/01/2017	EMILIANO AMARAL DO CRATO	998240190	caemiliano@gmail.com	R$ 0	0	R$ 0	0	0%				
FAZAN SERVICOS CORPORATIVOS EIRELI	GOIANIA	Sem regime definido	Sem Grupo	Serviços combinados de escritório e apoio administrativo	Inativa	01/01/2017	DUILIMAR DIVINO DA SILVA JUBE FILHO	-	-	R$ 0	0	R$ 0	0	0%				
FAZENDA JUREMA LTDA EPP	CAMPO ALEGRE DE GOIAS	Sem regime definido	Sem Grupo	Outras sociedades de participação , exceto holdings	Inativa	01/01/2017	ADENIR TEIXIERA PERES JUNIOR	-	a.teixeira@tss.adv.br	R$ 0	0	R$ 0	0	0%			
FDF DISTRIBUIDORA DE MEDICAMENTOS	APARECIDA DE GOIANIA	Simples	Sem Grupo	Comércio atacadista de medicamentos e drogas de uso humano	Inativa	01/01/2017	MARCIO VAZ DE SOUZA 	-	admfdfhospitalar@hotmail.com	R$ 0	0	R$ 0	0	0%				
FEDERAL CONSTRUTORA LTDA	SENADOR CANEDO	Simples	Sem Grupo	Construção de rodovias e ferrovias	Inativa	01/01/2017	WESLEY RODRIGUES VIDAL	-	financeiro@federalcontstrutora.com.br	R$ 0	0	R$ 0	0	0%				
FEDERAL COMERCIO DE OLEOS EIRELI	SENADOR CANEDO	Real	Sem Grupo	Comércio atacadista especializado de materiais de construção não especificados anteriormente	Inativa	01/01/2017	WANDERSON RODRIGUES VIDAL	-	financeiro@federalcontstrutora.com.br	R$ 0	0	R$ 0	0	0%				
FERNANDO HENRIQUE FERNANDES	GOIANIA	Simples	PF 	Atividade odontológica	Ativa	01/01/2017	FERNANDO HENRIQUE FERNANDES	-	clinicaathosgoiania@gmail.com	R$ 0	0	R$ 0	0	0%				
FERREIRA E CARDOSO COLCHOES LTDA	GOIANIA	Sem regime definido	Sem Grupo	Comércio varejista de artigos de colchoaria	Inativa	01/01/2017	RHUAN CARLOS DO NASCIMENTO	-	auria.francielyo@gmail.com	R$ 0	0	R$ 0	0	0%				
O GREAT AMAZON WORLD FISHING RALLY	SANTO ANTONIO DE GOIAS	Presumido	THE AMAZON 	Outras atividades associativas profissionais	Sem Movimento	13/03/2017	KEISUKE ONODA	35351174	pedro.nascimento@gmail.com	R$ 0	0	R$ 0	0	0%				
FLEX TRUCK SERVICE LTDA EPP	GOIANIA	Simples	FLEX 	Serviços combinados de escritório e apoio administrativo	Ativa	01/01/2017	RICARDO AUGUSTO CARNAES CASTELHANO	991506000	anna.lucia@flextirepneus.com	R$ 0	0	R$ 441	42	0%				
FLEX TRUCK SERVICE LTDA	SANTO ANTONIO DE GOIAS	Simples	FLEX 	Serviços de manutenção e reparação elétrica de veículos automotores	Inativa	01/01/2017	RICARDO AUGUSTO CARNAES CASTELHANO	991506000	-	R$ 0	0	R$ 0	0	0%				
FLEXTIRE RECAPAGENS LTDA	SANTO ANTONIO DE GOIAS	Real	FLEX 	Reforma de pneumáticos usados	Ativa	01/01/2017	RICARDO AUGUSTO CARNAES CASTELHANO	991506000	anna.lucia@flextirepneus.com	R$ 0	0	R$ 0	0	0%				
FLORIDIAN COMERCIO E PARTICIPACOES LTDA	GOIANIA	Real	FRALLE 	Comércio varejista de combustíveis para veículos automotores	Ativa	01/01/2017	LELIO VIEIRA CARNEIRO JUNIOR	-	sergio@fralle.com.br	R$ 0	0	R$ 0	0	0%				
FLOW REPRESENTACOES LTDA	GOIANIA	Simples	Sem Grupo	Representantes comerciais e agentes do comércio de mercadorias em geral não especializado	Ativa	10/08/2017	JOSE LEANDRO MARTINS SOARES	-	jl.tresirmaos@terra.com.br	R$ 221.162	67	R$ 19.943	99	9%				
FORECAST CORRETORA DE SEGUROS DE VIDA	GOIANIA	Presumido	FORECAST 	Corretores e agentes de seguros , de planos de previdência complementar e de saúde	Ativa	01/01/2017	ANA PAULA VIEIRA DE PAULA SOUZA GUIMARAES	-	printecartuchos@hotmail.com	R$ 0	0	R$ 0	0	0%			
VALORIE ENGENHARIA E INCORPORACAO LTDA	GOIANIA	Presumido	Sem Grupo	Serviços de engenharia	Inativa	01/01/2017	ANDRE DA VEIGA JARDIM MOURA	-	andre@forteengenharia.com.br	R$ 0	0	R$ 0	0	0%				
FOYER MAQUETES E PROJETOS LTDA	GOIANIA	Simples	Sem Grupo	Serviços de arquitetura	Ativa	01/01/2017	HUGO LEONARDO RODRIGUES SANTOS	-	rsantos.hugo@gmaill.com	R$ 43.326	8	R$ 960	0	2%`;

    try {
      setImporting(true);
      
      const lines = thirdPartData.trim().split('\n');
      const newLeads = [];
      
      for (const line of lines) {
        const columns = line.split('\t');
        
        if (columns.length < 10) continue;
        
        const leadData = {
          empresa: columns[0]?.trim() || '',
          setor: columns[4]?.trim() || '',
          regime_tributario: standardizeRegime(columns[2]?.trim() || ''),
          contato_decisor: columns[7]?.trim() || '',
          telefone: columns[8]?.trim() === '-' ? '' : columns[8]?.trim() || '',
          email: columns[9]?.trim() === '-' ? '' : columns[9]?.trim() || '',
          status: columns[5]?.toLowerCase().includes('ativa') ? 'ativo' : 'inativo',
          gancho_prospeccao: generateProspectingHook(columns[0]?.trim() || '', columns[4]?.trim() || '', columns[2]?.trim() || '')
        };
        
        // Filter duplicates
        const exists = leads.some(lead => 
          lead.empresa.toLowerCase() === leadData.empresa.toLowerCase()
        );
        
        if (!exists && leadData.empresa) {
          newLeads.push(leadData);
        }
      }
      
      if (newLeads.length > 0) {
        await importLeads(newLeads);
        toast.success(`${newLeads.length} leads da terceira parte importados com sucesso!`);
      } else {
        toast.error('Nenhum lead novo da terceira parte encontrado para importar');
      }
      
    } catch (error) {
      console.error('Erro ao importar terceira parte:', error);
      toast.error('Erro ao importar terceira parte');
    } finally {
      setImporting(false);
    }
  };
    if (!user) return;
    
    const csvData = `Empresa	Municipio	Regime	Grupo	Ramo	Status (Domínio)	Data de cadastro	Responsável	Telefone	Email	Faturamento	Impostos	% de imposto
3P ALIMENTOS LTDA ME	GOIANIA	Presumido	Sem Grupo	Comércio varejista de produtos alimentícios em geral ou especializado em produtos alimentícios não especificados anteriormente	Inativa	01/01/2017	-	-	-	R$ 0	0	R$ 0
A A ABRIL PRESTADORA DE SERVICOS LTDA ME	GOIANIA	Simples	Sem Grupo	Instalação e manutenção elétrica	Ativa	01/01/2017	WALDEMAR NEVES JUNIOR	991210111	aservical@hotmail.com	R$ 74.626	50	R$ 2.460
A R DE FARIA TOLEDO DA SILVEIRA & CIA	GOIANIA	Presumido	TORRE F 	Loteamento de imóveis próprios	Inativa	23/02/2018	ALZIRA RIBEIRO DE FARIA TOLEDO DA SILVEIRA 	-	anaflavia.torreforte@gmail.com	R$ 0	0	R$ 0
A R ODONTOLOGIA S S LTDA ME	GOIANIA	Presumido	VITAE 	Atividade odontológica	Ativa	01/01/2017	DANIELLE ANDRADE ROSA MARTINS	32121200	gerente@vitaeodontologia.com.br	R$ 1.449.438	63	R$ 184.668
ACAO TECNOLOGIA E SOFTWARE EIRELI ME	GOIANIA	Sem regime definido	Sem Grupo	Suporte técnico , manutenção e outros serviços em tecnologia da informação	Inativa	01/01/2017	PETRONIO AMERICO JURUAENSE DE OLIVEIRA F	-	petronio@acaotecnologia.com.br	R$ 0	0	R$ 0
ACF MARISTA LTDA	GOIANIA	Simples	Sem Grupo	Atividades de  franqueadas e permissionárias do Correio Nacional	Ativa	01/01/2017	STEPHANIE YAMASHITA NICKUS	-	rogeriorosacosta@gmail.com	R$ 1.386.508	33	R$ 125.463
ACG INDUSTRIA E COMERCIO DE COLCHOES	ABADIA DE GOIAS	Presumido	AGA 	Atividades de consultoria em gestão empresarial , exceto consultoria técnica específica	Ativa	01/01/2017	BRIGIDA DIAS NASCIMENTO	-	administrativo@gynflexcolchoes.com.br	R$ 0	0	R$ 0
ACHEI RASTREAMENTO DE VEICULOS EIRELI	GOIANIA	Simples	BLOCK SAT 	Outras atividades de serviços de segurança	Inativa	01/01/2017	MARCIO JARDIM GUSMAO	39546929	lucivane@blocksat.com.br	R$ 0	0	R$ 0
EURO MINERACAO COMERCIO INTERNATIONAL 	GOIANIA	Presumido	Sem Grupo	Atividades de consultoria em gestão empresarial , exceto consultoria técnica específica	Ativa	01/01/2017	ANA CAROLINA VIEIRA DE CASTRO PIRES	-	euromineracao@gmail.com	R$ 0	0	R$ 0
AFC REABILITACAO ORAL SS LTDA ME	GOIANIA	Simples	Sem Grupo	Atividade odontológica	Ativa	01/01/2017	ADRIANO FERREIRA COSTA	984111295	adrfcosta@gmail.com	R$ 828.482	45	R$ 70.031
AFETO DISTRIBUIDORA LTDA EPP	GOIANIA	Sem regime definido	Sem Grupo	Comércio atacadista de mercadorias em geral , com predominância de produtos alimentícios	Inativa	01/01/2017	MARCIO TIMOTEO 	-	-	R$ 0	0	R$ 0
AGA INDUSTRIA E COMERCIO DE COLCHOES LTD	GOIANIA	Real	AGA 	Fabricação de colchões	Ativa	01/01/2017	BRIGIDA DIAS NASCIMENTO	-	administrativo@gynflexcolchoes.com.br	R$ 31.110.603	86	R$ 4.129.396
AGENCIA FRANQUEADA 84 LTDA	GOIANIA	Simples	Sem Grupo	Atividades de  franqueadas e permissionárias do Correio Nacional	Ativa	01/01/2017	MARIA DE FATIMA DO COUTO LIMA	-	agencia84@gmail.com	R$ 1.337.880	17	R$ 106.931
AGRO NOVAS ENERGIAS LTDA EPP	NEROPOLIS	Sem regime definido	Sem Grupo	Atividades de intermediação e agenciamento de serviços e negócios em geral , exceto imobiliários	Inativa	01/01/2017	TANIA BARBOSA CURADO	-	-	R$ 0	0	R$ 0
AGROJURIS PARTICIPACOES LTDA	GOIANIA	Sem regime definido	Sem Grupo	Outras sociedades de participação , exceto holdings	Inativa	01/01/2017	ADENIR TEIXIERA PERES JUNIOR	-	a.teixeira@tss.adv.br	R$ 0	0	R$ 0
ALEXANDRE FELIX DIAS INVESTIMENTOS	BRAZABRANTES	Presumido	TORRE 	Atividades de consultoria em gestão empresarial , exceto consultoria técnica específica	Inativa	01/01/2017	ALEXANDRE FELIX DIAS	-	alexxdias@hotmail.com	R$ 0	0	R$ 0
ALINE DE SOUSA PIRES	GOIANIA	Sem regime definido	Sem Grupo	Atividade odontológica	Inativa	01/01/2017	ALINE DE SOUSA PIRES	32121200	-	R$ 0	0	R$ 0
NEOSAT RASTREAMENTO DE VEICULOS LTDA	GOIANIA	Simples	PUJOL 	Atividades de monitoramento de sistemas de segurança eletrônico	Inativa	01/01/2017	RITA DE CASSIA OLIVEIRA	-	paulorossit@hotmail.com	R$ 0	0	R$ 0
ALVES & OLIVEIRA INVESTIMENTOS LTDA	GOIANIA	Presumido	Sem Grupo	Atividades de consultoria em gestão empresarial , exceto consultoria técnica específica	Inativa	01/01/2017	MARIO DA PAZ ALVES	-	muriloliveiras@gmail.com	R$ 0	0	R$ 0
ALYSON VESSONE ABDALLA OLIVEIRA	APARECIDA DE GOIANIA	Simples	Sem Grupo	Comércio varejista de animais vivos e de artigos e alimentos para animais de estimação	Inativa	01/01/2017	ALYSON VESSONE ABDALLA OLIVEIRA 05475491135	-	alysonabdalla@gmail.com	R$ 0	0	R$ 0
ALZIRA RIBEIRO DE FARIA TOLEDO	MONTES CLAROS DE GOIAS	Sem regime definido	Sem Grupo	Criação de bovinos para corte	Inativa	01/01/2017	ALZIRA RIBEIRO DE FARIA TOLEDO DA SILVEIRA	-	anaflavia.torreforte@gmail.com	R$ 0	0	R$ 0
LE JOUR LTDA	GOIANIA	Simples	Sem Grupo	Comércio varejista de cosméticos , produtos de perfumaria e de higiene pessoal	Inativa	01/01/2017	LORHAYNE GUIMARAES OLIVEIRA	-	lorhayne@lc.adv.br	R$ 0	0	R$ 0
AMG SERVICOS CORPORATIVOS LTDA - EPP	GOIANIA	Simples	Sem Grupo	Serviços combinados de escritório e apoio administrativo	Ativa	01/01/2017	ALEXANDRO DE OLIVEIRA LIMA	-	alexandro@amgcorp.com.br	R$ 1.330.625	65	R$ 116.121
AMPLA ENGENHARIA LTDA	GOIANIA	Presumido	Sem Grupo	Administração de obras	Ativa	01/01/2017	CRISTIANE OLIVEIRA SALATIEL	-	crissalatiel@hotmail.com	R$ 169.782	85	R$ 2.250
AMPLUS CONSTRUTORA LTDA ME	GOIANIA	Simples	Sem Grupo	Construção de edifícios	Inativa	01/01/2017	PAULO HENRIQUE MACHADO BARBOSA	-	contato@amplusconstrutora.com.br	R$ 0	0	R$ 0
ANA LUIZA TEIXEIRA DO NASCIMENTO LTDA	INHUMAS	Presumido	Sem Grupo	Incorporação de empreendimentos imobiliários	Ativa	01/01/2017	ANA LUIZA TEIXEIRA DO NASCIMENTO	-	analtn@gmail.com	R$ 0	0	R$ 0
ANDREA TRINDADE FERNANDES	GOIANIA	Simples	Sem Grupo	Atividade odontológica	Inativa	22/01/2018	ANDREA TRINDADE FERNANDES CORREA	-	msc.santanacorrea@gmail.com	R$ 0	0	R$ 0
APARATTO CORRETORA DE SEGUROS LTDA	GOIANIA	Simples	THIAGO G 	Corretores e agentes de seguros , de planos de previdência complementar e de saúde	Ativa	01/01/2017	THIAGO GOMES VILELA	-	-	R$ 219.071	10	R$ 9.014
ARANTES COMERCIO DE HIGIENE ORAL EIRELI	GOIANIA	Simples	Sem Grupo	Atividade odontológica	Inativa	01/01/2017	POLLYANNA ARANTES	-	arantesodontologia@gmail.com	R$ 0	0	R$ 0
AREA 4 PARTICIPACOES LTDA ME	GOIANIA	Sem regime definido	Sem Grupo	Atividades de consultoria em gestão empresarial , exceto consultoria técnica específica	Inativa	01/01/2017	ELVIO CESAR MACHADO	-	-	R$ 0	0	R$ 0
ARIMATEA E ARIMETEA SERVICOS MEDICOS SS	BRASILIA	Simples	EAP 	Atividade médica ambulatorial restrita a consultas	Ativa	01/01/2017	ROSIMAR BERNARDETE QUEIROZ	32121200	gustavo.arimatea@gmail.com	R$ 1.246.393	94	R$ 126.613
ARKIS INFRAESTRUTURA URBANA S C LTDA	BRASILIA	Presumido	ARKIS 	Outras obras de engenharia civil não especificadas anteriormente	Ativa	01/01/2017	CARLOS JOADIR MENDES	-	arkis@terra.com.br	R$ 691.174	13	R$ 75.345
ARKIS INFRAESTRUTURA URBANA S C LTDA	GOIANIA	Presumido	ARKIS 	Outras obras de engenharia civil não especificadas anteriormente	Ativa	01/01/2017	CARLOS JOADIR MENDES	-	arkis@terra.com.br	R$ 0	0	R$ 0
ARRUDA E ARRUDA CENTRO DE ENSINO EIRELI	GOIANIA	Sem regime definido	Sem Grupo	Outras atividades de ensino não especificadas anteriormente	Inativa	01/01/2017	FABRICIA ALVES ARRUDA	-	-	R$ 0	0	R$ 0
ASS SERVICOS CORPORATIVOS EIRELI	GOIANIA	Sem regime definido	Sem Grupo	Atividades de consultoria em gestão empresarial , exceto consultoria técnica específica	Inativa	01/01/2017	ARMANDO DA SILVA SOUZA	-	a.teixeira@tss.adv.br	R$ 0	0	R$ 0
ASSOCIACAO DE CLINICAS INTEGRADAS DE ODO	GOIANIA	Isenta do IRPJ	EAP 	Outras atividades associativas profissionais	Ativa	01/01/2017	CLEUBER ALVES OLIVEIRA	32121200	financeiro@eapgoias.com.br	R$ 168.158	0	R$ 1.254
ASSOCIACAO ESCOLA DE APERFEICOAMENTO	GOIANIA	Presumido	EAP 	Atividade odontológica	Ativa	01/01/2017	MARIA BEATRIZ RODRIGUES GONCALVES DE OLIVEIRA	-	financeiro@eapgoias.com.br	R$ 1.086.151	16	R$ 7.091
ASSOCIACAO MERITO	GOIANIA	Presumido	Sem Grupo	-	Inativa	01/01/2017	-	-	contatomeritogoias@gmail.com	R$ 0	0	R$ 0
ATIVA SERVICOS CORPORATIVOS LTDA ME	GOIANIA	Presumido	SERRA AZUL 	Serviços combinados de escritório e apoio administrativo	Ativa	01/01/2017	ESMERALDA GALDINO PIZA	32121200	marcelo16.mfa@gmail.com	R$ 0	0	R$ 0
AUTO ELETRICA E ACESSORIOS RIO PRETO	APARECIDA DE GOIANIA	Simples	Sem Grupo	Comércio a varejo de peças e acessórios novos para veículos automotores	Inativa	01/01/2017	OSWALDO RODRIGUES CHAVES JUNIOR	-	eletricariopreto.financeiro@gmail.com	R$ 0	0	R$ 0
AVANTE CONSTRUTORA LTDA	APARECIDA DE GOIANIA	Presumido	Sem Grupo	Construção de edifícios	Ativa	01/01/2017	WILMA CARDOSO SANTANA	-	rogerio.sanar@hotmail.com	R$ 656.702	93	R$ 71.189
B AMANCIO E COSTA ODONTOLOGIA LTDA	GOIANIA	Simples	Sem Grupo	Atividade odontológica	Ativa	01/01/2017	PRISCILLA PENNA COSTA	-	pripenna@hotmail.com	R$ 182.795	7	R$ 6.469
B F DE MORAES  EIRELI  ME	GOIANIA	Simples	Sem Grupo	Aluguel de objetos do vestuário , jóias e acessórios	Inativa	01/01/2017	BRUNA FERRO DE MORAES	-	financeiroeasydressed@gmail.com	R$ 0	0	R$ 0
BARBARA JAQUELINE FREIRE PORTO EIRELI	GOIANIA	Simples	Sem Grupo	Comércio varejista de artigos do vestuário e acessórios	Inativa	01/01/2017	BARBARA JAQUELINE FREIRE PORTO	-	portobarbara@hotmail.com	R$ 0	0	R$ 0
BCV CONSULTORIA E PROJETOS LTDA	GOIANIA	Presumido	Sem Grupo	Atividades de estudos geológicos	Ativa	01/01/2017	ELIAS ANTONIO CUBA	32121200	elias@bcvconsultoria.com.br	R$ 0	0	R$ 409.630
BELINELO SILVA ARQUITETURA EIRELI	GOIANIA	Sem regime definido	Sem Grupo	Atividades de consultoria em gestão empresarial , exceto consultoria técnica específica	Inativa	01/01/2017	ALINE BELINELO PIRES DA SILVA	-	-	R$ 0	0	R$ 0
BENI SOLUCOES INDUSTRIAIS EIRELI	SENADOR CANEDO	Simples	Sem Grupo	Obras de montagem industrial	Inativa	01/01/2017	DENIZ NUNES DE ASSUNCAO DIAS	-	beni@benisolucoesindustriais.com.br	R$ 0	0	R$ 0
BERCARIO EDUCACAO INFANTIL PEDACINHO	GOIANIA	Sem regime definido	Sem Grupo	Educação infantil - creche	Inativa	01/01/2017	VIVIANE DE FATIMA BARBOSA CUNHA	-	unica@unicacontabilgyn.com.br	R$ 0	0	R$ 0
BIOSOLUTI SOLUCOES AMBIENTAIS LTDA	GOIANIA	Presumido	Sem Grupo	Testes e análises técnicas	Inativa	01/01/2017	WILMA MARIA COELHO	-	rosana@grupoestra.com.br	R$ 0	0	R$ 0
BITTENCOURT E LIMA LTDA	GOIANIA	Simples	Sem Grupo	Comércio varejista de bebidas	Inativa	01/01/2017	LETTICIAE PORTES BITTENCOURT	984054862	letticiaebittencourt@gmail.com	R$ 0	0	R$ 0
BIZ CENTER LTDA	GOIANIA	Simples	Sem Grupo	Serviços combinados de escritório e apoio administrativo	Ativa	01/01/2017	LUCINIA DA VEIGA JARDIM CAMILO	-	euripedes@bizcenter.com.br	R$ 725.808	36	R$ 68.646`;

    try {
      setImporting(true);
      
      const lines = csvData.trim().split('\n');
      const dataLines = lines.slice(1); // Skip header
      
      const leadsToImport = dataLines.map(line => {
        // Split by tab since this is tab-separated data
        const values = line.split('\t');
        
        // Map CSV fields to lead object  
        const [empresa, municipio, regime, grupo, ramo, statusDominio, dataCadastro, responsavel, telefone, email, faturamento, impostos, percentual] = values;
        
        // Map regime to standard format
        const regimeMap: { [key: string]: string } = {
          'Real': 'lucro_real',
          'Presumido': 'lucro_presumido', 
          'Simples': 'simples_nacional',
          'Isenta do IRPJ': 'isenta'
        };
        
        // Map status based on activity and regime
        let status = 'novo';
        if (statusDominio === 'Ativa' && regime === 'Real') {
          status = 'qualificado';
        } else if (statusDominio === 'Ativa' && regime === 'Presumido') {
          status = 'contatado';
        } else if (statusDominio === 'Ativa') {
          status = 'novo';
        }
        
        // Create gancho based on regime and faturamento
        let gancho = `Empresa ${statusDominio?.toLowerCase()} no regime ${regime}`;
        if (faturamento && faturamento !== 'R$ 0') {
          gancho += `. Faturamento declarado: ${faturamento}`;
        }
        if (ramo) {
          gancho += `. Área de atuação: ${ramo}`;
        }
        
        return {
          empresa: empresa?.trim() || '',
          setor: ramo?.trim() || '',
          regime_tributario: regimeMap[regime?.trim()] || 'lucro_presumido',
          contato_decisor: responsavel?.trim().replace('-', '') || '',
          telefone: telefone?.trim().replace('-', '') || '',
          email: email?.trim().replace('-', '') || '',
          gancho_prospeccao: gancho,
          status: status,
          estimated_revenue: faturamento?.replace('R$ ', '') || '',
          notes: `Município: ${municipio}. Grupo: ${grupo}. Status no domínio: ${statusDominio}`,
          user_id: user.id
        };
      });
      
      // Filter out leads that already exist and invalid data
      const existingEmpresas = leads.map(lead => lead.empresa.toLowerCase());
      const newLeads = leadsToImport.filter(lead => 
        !existingEmpresas.includes(lead.empresa.toLowerCase()) && 
        lead.empresa.trim() !== '' &&
        lead.empresa.trim() !== '-'
      );
      
      if (newLeads.length === 0) {
        toast.info('Nenhum lead novo encontrado para importar da lista 2');
        return;
      }
      
      const { error } = await supabase
        .from('leads')
        .insert(newLeads);
        
      if (error) throw error;
      
      toast.success(`${newLeads.length} leads da lista 2 importados com sucesso!`);
      loadLeads();
      onStatsUpdate();
      
    } catch (error) {
      console.error('Erro ao importar leads da lista 2:', error);
      toast.error('Erro ao importar leads da lista 2');
    } finally {
      setImporting(false);
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.setor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.contato_decisor?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Pagination logic
  const totalPages = Math.ceil(filteredLeads.length / LEADS_PER_PAGE);
  const startIndex = (currentPage - 1) * LEADS_PER_PAGE;
  const endIndex = startIndex + LEADS_PER_PAGE;
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);
  
  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo': return 'bg-blue-100 text-blue-800';
      case 'contatado': return 'bg-yellow-100 text-yellow-800';
      case 'qualificado': return 'bg-green-100 text-green-800';
      case 'perdido': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Gerenciar Leads
          </CardTitle>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileImport}
              style={{ display: 'none' }}
              id="file-input"
            />
            <Button variant="outline" onClick={() => document.getElementById('file-input')?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Abrir
            </Button>
            <Button variant="outline" onClick={handleImportList3} disabled={importing}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importando...' : 'Importar Parte 3'}
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={leads.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingLead(null);
                  form.reset();
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingLead ? 'Editar Lead' : 'Novo Lead'}
                  </DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="empresa"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Empresa *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nome da empresa" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="setor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Setor</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: Agroindústria" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cnae"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CNAE</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: 1071-6/00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="regime_tributario"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Regime Tributário</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o regime" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="lucro_real">Lucro Real</SelectItem>
                                <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                                <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                                <SelectItem value="cooperativa">Cooperativa</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contato_decisor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contato Decisor</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: CFO, Diretor Financeiro" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="novo">Novo</SelectItem>
                                <SelectItem value="contatado">Contatado</SelectItem>
                                <SelectItem value="qualificado">Qualificado</SelectItem>
                                <SelectItem value="perdido">Perdido</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="telefone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="(62) 3321-8200" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="contato@empresa.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="www.empresa.com.br" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="gancho_prospeccao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gancho de Prospecção</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Descreva a oportunidade ou dor identificada..." 
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Salvando...' : (editingLead ? 'Atualizar' : 'Criar')}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="outline">
            {filteredLeads.length} leads encontrados
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Regime</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{lead.empresa}</div>
                      {lead.website && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Globe className="h-3 w-3" />
                          {lead.website}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{lead.setor || '-'}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {lead.contato_decisor && (
                        <div className="text-sm">{lead.contato_decisor}</div>
                      )}
                      {lead.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </div>
                      )}
                      {lead.telefone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {lead.telefone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(lead.status)} variant="secondary">
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{lead.regime_tributario || '-'}</TableCell>
                  <TableCell>
                    {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(lead)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(lead.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
               ))}
            </TableBody>
          </Table>
          
          {paginatedLeads.length === 0 && filteredLeads.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lead nesta página
            </div>
          )}
          
          {filteredLeads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhum lead encontrado com esse termo' : 'Nenhum lead cadastrado'}
            </div>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
        
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Mostrando {startIndex + 1}-{Math.min(endIndex, filteredLeads.length)} de {filteredLeads.length} leads
          {filteredLeads.length !== leads.length && ` (${leads.length} no total)`}
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadsManager;