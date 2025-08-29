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
  Edit, 
  Trash2,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  User
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const interactionSchema = z.object({
  contact_id: z.string().min(1, "Contato é obrigatório"),
  tipo: z.string().min(1, "Tipo é obrigatório"),
  assunto: z.string().optional(),
  descricao: z.string().optional(),
  data_interacao: z.string().optional(),
  proximo_followup: z.string().optional()
});

type InteractionFormData = z.infer<typeof interactionSchema>;

interface Interaction {
  id: string;
  contact_id: string;
  tipo: string;
  assunto?: string;
  descricao?: string;
  data_interacao: string;
  proximo_followup?: string;
  created_at: string;
  updated_at: string;
  contacts?: {
    nome: string;
    empresa?: string;
  };
}

interface Contact {
  id: string;
  nome: string;
  empresa?: string;
}

interface InteractionsManagerProps {
  onStatsUpdate: () => void;
}

const InteractionsManager = ({ onStatsUpdate }: InteractionsManagerProps) => {
  const { user } = useAuth();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);

  const form = useForm<InteractionFormData>({
    resolver: zodResolver(interactionSchema),
    defaultValues: {
      contact_id: "",
      tipo: "",
      assunto: "",
      descricao: "",
      data_interacao: new Date().toISOString().slice(0, 16),
      proximo_followup: ""
    }
  });

  useEffect(() => {
    if (user) {
      loadInteractions();
      loadContacts();
    }
  }, [user]);

  const loadInteractions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('interactions')
        .select(`
          *,
          contacts (
            nome,
            empresa
          )
        `)
        .eq('user_id', user.id)
        .order('data_interacao', { ascending: false });

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error('Erro ao carregar interações:', error);
      toast.error('Erro ao carregar interações');
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, nome, empresa')
        .eq('user_id', user.id)
        .eq('status', 'ativo');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    }
  };

  const handleSubmit = async (data: InteractionFormData) => {
    if (!user) return;

    try {
      setLoading(true);

      const interactionData = {
        ...data,
        data_interacao: data.data_interacao ? new Date(data.data_interacao).toISOString() : new Date().toISOString(),
        proximo_followup: data.proximo_followup ? data.proximo_followup : null,
        user_id: user.id
      };

      if (editingInteraction) {
        // Atualizar interação existente
        const { error } = await supabase
          .from('interactions')
          .update(interactionData)
          .eq('id', editingInteraction.id)
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success('Interação atualizada com sucesso!');
      } else {
        // Criar nova interação
        const { error } = await supabase
          .from('interactions')
          .insert({ 
            ...interactionData,
            tipo: interactionData.tipo || 'ligacao',
          });

        if (error) throw error;
        toast.success('Interação criada com sucesso!');
      }

      form.reset();
      setIsDialogOpen(false);
      setEditingInteraction(null);
      loadInteractions();
      onStatsUpdate();
    } catch (error) {
      console.error('Erro ao salvar interação:', error);
      toast.error('Erro ao salvar interação');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (interaction: Interaction) => {
    setEditingInteraction(interaction);
    form.reset({
      contact_id: interaction.contact_id,
      tipo: interaction.tipo,
      assunto: interaction.assunto || "",
      descricao: interaction.descricao || "",
      data_interacao: new Date(interaction.data_interacao).toISOString().slice(0, 16),
      proximo_followup: interaction.proximo_followup || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (interactionId: string) => {
    if (!user || !confirm('Tem certeza que deseja excluir esta interação?')) return;

    try {
      const { error } = await supabase
        .from('interactions')
        .delete()
        .eq('id', interactionId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Interação excluída com sucesso!');
      loadInteractions();
      onStatsUpdate();
    } catch (error) {
      console.error('Erro ao excluir interação:', error);
      toast.error('Erro ao excluir interação');
    }
  };

  const filteredInteractions = interactions.filter(interaction =>
    interaction.contacts?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interaction.contacts?.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interaction.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interaction.assunto?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'ligacao': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'reuniao': return <Calendar className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'ligacao': return 'bg-blue-100 text-blue-800';
      case 'email': return 'bg-green-100 text-green-800';
      case 'reuniao': return 'bg-purple-100 text-purple-800';
      case 'whatsapp': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Histórico de Interações
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingInteraction(null);
                form.reset();
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Interação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingInteraction ? 'Editar Interação' : 'Nova Interação'}
                </DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contact_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contato *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um contato" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {contacts.map((contact) => (
                                <SelectItem key={contact.id} value={contact.id}>
                                  {contact.nome} {contact.empresa && `(${contact.empresa})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tipo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ligacao">Ligação</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="reuniao">Reunião</SelectItem>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="assunto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assunto</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Proposta de consultoria tributária" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="data_interacao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data/Hora da Interação</FormLabel>
                          <FormControl>
                            <Input {...field} type="datetime-local" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="proximo_followup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Próximo Follow-up</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Detalhes da interação, pontos discutidos, próximos passos..." 
                            rows={4}
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
                      {loading ? 'Salvando...' : (editingInteraction ? 'Atualizar' : 'Criar')}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar interações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="outline">
            {filteredInteractions.length} interações encontradas
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInteractions.map((interaction) => (
                <TableRow key={interaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{interaction.contacts?.nome}</div>
                        {interaction.contacts?.empresa && (
                          <div className="text-xs text-muted-foreground">
                            {interaction.contacts.empresa}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTipoColor(interaction.tipo)} variant="secondary">
                      <div className="flex items-center gap-1">
                        {getTipoIcon(interaction.tipo)}
                        {interaction.tipo}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{interaction.assunto || '-'}</div>
                      {interaction.descricao && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {interaction.descricao}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {new Date(interaction.data_interacao).toLocaleString('pt-BR')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {interaction.proximo_followup ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-warning" />
                        {new Date(interaction.proximo_followup).toLocaleDateString('pt-BR')}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(interaction)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(interaction.id)}
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
          
          {filteredInteractions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhuma interação encontrada com esse termo' : 'Nenhuma interação registrada'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InteractionsManager;