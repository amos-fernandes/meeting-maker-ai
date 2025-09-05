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

  const handleImportList = async () => {
    if (!user) return;
    
    const csvData = `Qualificação,Nome da Empresa,Setor de Atuação,CNPJ,Telefone,Email,CNAE Principal,Regime Tributário Provável,Nome e Cargo do Decisor,Gancho de Prospecção
Alta Prioridade,Drogaria Pacheco S.A. (Unidades em Goiânia),Drogarias e Farmácias,61.412.110/0001-55,"(11) 3003-7881 / 0800 282 1010",imprensa@dpsp.com.br,4771-7/01,Lucro Real,Diretor Financeiro / Gerente Fiscal,"Grande volume de notas fiscais e transações diárias. Necessidade de planejamento tributário para apuração de ICMS e substituição tributária, que são complexos em redes de varejo farmacêutico. Várias filiais em Goiânia e região metropolitana."
Média Prioridade,Gyn Transportes Ltda.,Transportes e Logística,05.827.433/0001-64,"(62) 3295-5001 / (62) 99602-5001",financeiro@gyntransportes.com.br,4930-2/02,Lucro Presumido,Sócio-Administrador,"Expansão da frota e aumento de rotas. O alto volume de pagamentos e recebimentos, além do controle de custos e combustíveis, representa uma dor crucial. Otimização do ICMS sobre serviços de transporte (ICMS-ST) pode ser uma grande oportunidade para redução de custos."
Baixa Prioridade,Rede Goiana de Açougues e Laticínios,Comércio e Varejo - Açougues,Não Localizado,N/A,N/A,4722-9/01,Simples Nacional,Proprietário / Gerente Geral,"Crescimento acelerado com a abertura de novas unidades, o que pode levar a um faturamento que ultrapasse o limite do Simples Nacional. Uma reestruturação para o Lucro Presumido ou Real pode ser mais vantajosa para manter a margem de lucro e a sustentabilidade fiscal."
Média Prioridade,Colégio Olimpo Goiânia,Educação - Ensino Médio,03.821.200/0002-39,"(62) 3285-7879",goiania@colegioolimpo.com.br,8520-1/00,Lucro Presumido,Diretor Administrativo / Sócio,"Grande volume de matrículas e mensalidades. A gestão de folha de pagamento para professores e colaboradores, além dos encargos trabalhistas, é um ponto sensível. O planejamento tributário pode otimizar a carga fiscal sobre a receita."
Alta Prioridade,Olist,E-commerce e Marketplaces,18.337.223/0001-35,"(41) 3544-8395",contato@olist.com,7490-1/04,Lucro Real,CFO / Diretor de Operações,"Alto volume de vendas interestaduais com controle de DIFAL (Diferencial de Alíquota) de ICMS. O gerenciamento de um grande número de parceiros comerciais e notas fiscais diárias, somado a mudanças na legislação tributária para e-commerce, cria uma grande dor fiscal."
Média Prioridade,Clínica Médica Santa Ana,Saúde - Clínicas e Consultórios,20.916.484/0001-09,"(62) 3995-1800",contato@clinicasantaanago.com.br,8630-5/02,Lucro Presumido,Sócio-Diretor / Gerente Administrativo,"Crescimento de atendimentos e expansão da equipe. A complexidade na apuração de impostos sobre serviços médicos, a gestão da folha de pagamento de médicos e a necessidade de controle de custos operacionais podem ser um grande desafio."
Média Prioridade,Di Rezende Advocacia e Consultoria,Profissionais Liberais - Advocacia,09.057.436/0001-90,"(62) 3092-2122",contato@direzende.com.br,6911-7/01,Lucro Presumido,Sócio Fundador,"Assessoria jurídica para empresas de alta e média complexidade. A complexidade dos regimes tributários para sociedades de advogados, a necessidade de planejamento fiscal e a alta carga de impostos sobre serviços são desafios conhecidos para o setor."
Média Prioridade,Mr. Ideas - Design & Marketing Digital,Prestadores de Serviços - Marketing Digital,24.318.598/0001-14,"(62) 3639-6111 / (62) 98115-3221",contato@mrideas.com.br,7311-4/00,Lucro Presumido,CEO / Diretor de Operações,"Crescimento contínuo e necessidade de gestão financeira mais robusta para acompanhar a entrada de novos projetos. A alta carga tributária sobre serviços, a gestão de contratos com clientes e o controle de custos com colaboradores podem ser otimizados com um planejamento fiscal adequado."
Alta Prioridade,Log10 Transportes,Transportes e Logística,24.237.893/0001-00,"(62) 3642-1010",comercial.gyn@log10.com.br,4930-2/02,Lucro Presumido,Diretor Comercial / Proprietário,"Especialização em transporte de produtos farmacêuticos e eletrônicos de alto valor. A complexidade na apuração de ICMS sobre o serviço de transporte e a gestão dos custos operacionais, além da necessidade de compliance regulatório, são dores importantes a serem exploradas."
Alta Prioridade,Tiradentes Produtos para Saúde,Comércio e Varejo - Produtos Médicos,01.034.331/0001-30,"(62) 3221-8900",tiradentes@tiradentes.com.br,4645-1/01,Lucro Real,Diretor Administrativo e Financeiro,"Especialização em produtos médicos e hospitalares. A complexidade do regime de ICMS e a necessidade de controle de estoque e transações diárias indicam uma alta complexidade fiscal. A otimização de tributos na cadeia de suprimentos pode gerar grande economia."
Média Prioridade,Virta Engenharia,Profissionais Liberais - Engenharia,10.975.319/0001-38,"(62) 3224-6444",contato@virtaengenharia.com.br,4120-4/00,Lucro Presumido,Sócio-Diretor / Gerente Financeiro,"Atuação em projetos comerciais, industriais e residenciais de grande porte. A gestão de projetos, o controle orçamentário e a complexidade na apuração de impostos sobre a construção civil (ISS, IRPJ, CSLL) são desafios que a empresa enfrenta em um cenário de expansão."
Média Prioridade,Clínica Pop Med,Saúde - Clínicas Populares,24.931.328/0001-07,"(62) 3622-6816",gyn@clinicapopmed.com.br,8630-5/03,Lucro Presumido,Diretor Financeiro / Gerente Administrativo,"Grande volume de consultas e exames em diversas especialidades, com foco em preços acessíveis. A alta demanda pode sobrecarregar a gestão financeira e fiscal. Otimização de impostos sobre serviços e a gestão de folha e encargos trabalhistas para um grande corpo de profissionais são oportunidades claras."
Média Prioridade,Colégio Teo,Educação - Ensino Básico,25.101.405/0001-08,"(62) 3251-8811",colegio@colegio-teo.com.br,8513-9/00,Lucro Presumido,Sócio-Proprietário,"Escola com alta aprovação em vestibulares, indicando um fluxo contínuo de novas matrículas. A gestão de um grande número de alunos e a complexidade na apuração de impostos sobre a receita de mensalidades, bem como a administração de benefícios e encargos da folha de pagamento, são áreas para otimização."
Alta Prioridade,Js Distribuidora de Peças S/A,Comércio e Varejo - Autopeças,01.272.235/0001-50,"(62) 4012-3000",faleconosco@jspecas.com.br,4530-7/03,Lucro Real,Diretor Financeiro / Controller,"Atua como distribuidora em grande escala. O controle de estoque, o alto volume de notas fiscais de entrada e saída, a complexidade da Substituição Tributária (ICMS-ST) no setor de autopeças e a gestão de créditos fiscais são dores significativas que impactam a margem de lucro."
Média Prioridade,Clínica Vittá Goiânia,Saúde - Clínicas Populares,26.289.467/0001-83,"(62) 3996-0505",contato@clinicavitta.com,8630-5/03,Lucro Presumido,Diretor Administrativo,"Expansão para várias unidades (Centro, Terminal Bandeiras, Buriti Shopping), indicando um crescimento acelerado. A complexidade na gestão financeira e fiscal de múltiplos CNPJs, bem como a necessidade de um controle rigoroso sobre os custos operacionais, são grandes oportunidades de consultoria."
Média Prioridade,Colégio Simbios,Educação - Ensino Médio,04.975.452/0001-72,"(62) 3942-3232",faleconosco@colegiosimbios.com.br,8520-1/00,Lucro Presumido,Sócio-Diretor,"Uma das escolas mais bem ranqueadas no ENEM, o que atrai alta demanda. A gestão do crescimento e a otimização tributária, especialmente em relação ao PIS e COFINS e ao IRPJ, podem garantir a sustentabilidade financeira da instituição e a alocação de recursos para novos investimentos."`;

    try {
      setImporting(true);
      
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',');
      const dataLines = lines.slice(1);
      
      const leadsToImport = dataLines.map(line => {
        // Parse CSV line considering quoted fields
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        
        // Map CSV fields to lead object
        const [qualificacao, empresa, setor, cnpj, telefone, email, cnae, regime, contato, gancho] = values;
        
        const statusMap: { [key: string]: string } = {
          'Alta Prioridade': 'qualificado',
          'Média Prioridade': 'contatado', 
          'Baixa Prioridade': 'novo'
        };
        
        const regimeMap: { [key: string]: string } = {
          'Lucro Real': 'lucro_real',
          'Lucro Presumido': 'lucro_presumido',
          'Simples Nacional': 'simples_nacional'
        };
        
        return {
          empresa: empresa?.replace(/"/g, '') || '',
          setor: setor?.replace(/"/g, '') || '',
          cnae: cnae?.replace(/"/g, '') || '',
          regime_tributario: regimeMap[regime?.replace(/"/g, '')] || 'lucro_presumido',
          contato_decisor: contato?.replace(/"/g, '') || '',
          telefone: telefone?.replace(/"/g, '').replace('N/A', '') || '',
          email: email?.replace(/"/g, '').replace('N/A', '') || '',
          gancho_prospeccao: gancho?.replace(/"/g, '') || '',
          status: statusMap[qualificacao?.replace(/"/g, '')] || 'novo',
          user_id: user.id
        };
      });
      
      // Filter out leads that already exist
      const existingEmpresas = leads.map(lead => lead.empresa.toLowerCase());
      const newLeads = leadsToImport.filter(lead => 
        !existingEmpresas.includes(lead.empresa.toLowerCase()) && 
        lead.empresa.trim() !== ''
      );
      
      if (newLeads.length === 0) {
        toast.info('Nenhum lead novo encontrado para importar');
        return;
      }
      
      const { error } = await supabase
        .from('leads')
        .insert(newLeads);
        
      if (error) throw error;
      
      toast.success(`${newLeads.length} leads importados com sucesso!`);
      loadLeads();
      onStatsUpdate();
      
    } catch (error) {
      console.error('Erro ao importar leads:', error);
      toast.error('Erro ao importar leads');
    } finally {
      setImporting(false);
    }
  };

  const handleImportList2 = async () => {
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
            <Button variant="outline" onClick={handleImportList} disabled={importing}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importando...' : 'Importar Lista 1'}
            </Button>
            <Button variant="outline" onClick={handleImportList2} disabled={importing}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importando...' : 'Importar Lista 2'}
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