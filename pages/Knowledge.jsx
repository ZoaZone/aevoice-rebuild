import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Plus,
  Search,
  BookOpen,
  FileText,
  Globe,
  Upload,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Database,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Link2,
  File
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import KnowledgeValidator from "../components/agents/KnowledgeValidator";

const typeConfig = {
  faq: { icon: FileText, color: "bg-blue-100 text-blue-600", label: "FAQ" },
  documents: { icon: File, color: "bg-purple-100 text-purple-600", label: "Documents" },
  website: { icon: Globe, color: "bg-emerald-100 text-emerald-600", label: "Website" },
  api: { icon: Database, color: "bg-amber-100 text-amber-600", label: "API" },
  mixed: { icon: BookOpen, color: "bg-slate-100 text-slate-600", label: "Mixed" },
};

const statusConfig = {
  active: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  processing: { color: "bg-blue-100 text-blue-700", icon: Loader2, spin: true },
  error: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  inactive: { color: "bg-slate-100 text-slate-700", icon: null },
};

export default function Knowledge() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedKB, setSelectedKB] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "faq",
  });
  const [faqItems, setFaqItems] = useState([{ question: "", answer: "" }]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Client.filter({ contact_email: user.email });
    },
    enabled: !!user?.email,
  });

  const currentClient = clients[0];

  const { data: knowledgeBases = [], isLoading } = useQuery({
    queryKey: ['knowledgeBases', currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      return await base44.entities.KnowledgeBase.filter({ client_id: currentClient.id });
    },
    enabled: !!currentClient?.id,
  });

  const { data: chunks = [], refetch: refetchChunks } = useQuery({
    queryKey: ['knowledgeChunks', selectedKB?.id],
    queryFn: async () => {
      if (!selectedKB?.id) return [];
      
      console.log('Fetching chunks for KB:', selectedKB.id);
      const chunksList = await base44.entities.KnowledgeChunk.filter({ knowledge_base_id: selectedKB.id });
      console.log('Chunks fetched:', chunksList.length);
      
      // Update the knowledge base chunk count to match actual chunks
      if (selectedKB && chunksList.length !== selectedKB.chunk_count) {
        console.log('Updating KB chunk count from', selectedKB.chunk_count, 'to', chunksList.length);
        await base44.entities.KnowledgeBase.update(selectedKB.id, {
          chunk_count: chunksList.length,
          total_words: chunksList.reduce((sum, c) => sum + (c.content?.split(' ').length || 0), 0)
        });
        // Refresh knowledge bases list
        queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] });
      }
      
      return chunksList;
    },
    enabled: !!selectedKB?.id,
    refetchInterval: 2000,
    staleTime: 0,
  });

  const createKBMutation = useMutation({
    mutationFn: (data) => base44.entities.KnowledgeBase.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] });
      setIsCreateOpen(false);
      setFormData({ name: "", description: "", type: "faq" });
    },
  });

  const createChunkMutation = useMutation({
    mutationFn: (data) => base44.entities.KnowledgeChunk.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeChunks'] });
      queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] });
    },
  });

  const deleteKBMutation = useMutation({
    mutationFn: (id) => base44.entities.KnowledgeBase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] });
      setSelectedKB(null);
    },
  });

  // Filter out demo/sample knowledge bases and apply search
  const filteredKBs = knowledgeBases.filter(kb => {
    const isDummy = kb.name?.toLowerCase().includes('dental') || 
                    kb.name?.toLowerCase().includes('property') ||
                    kb.name?.toLowerCase().includes('sample') ||
                    kb.name?.toLowerCase().includes('demo');
    if (isDummy) return false;
    return kb.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleCreateKB = (e) => {
    e.preventDefault();
    if (!currentClient?.id) {
      toast.error("No client account found. Please contact support.");
      return;
    }
    createKBMutation.mutate({
      ...formData,
      client_id: currentClient.id,
      chunk_count: 0,
      status: "active",
    });
  };

  const handleAddFAQ = async () => {
    if (!selectedKB) return;
    
    const validItems = faqItems.filter(item => item.question && item.answer);
    if (validItems.length === 0) {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMsg.textContent = '⚠️ Please fill in at least one question and answer';
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 3000);
      return;
    }

    try {
      for (const item of validItems) {
        await createChunkMutation.mutateAsync({
          knowledge_base_id: selectedKB.id,
          source_type: "manual",
          title: item.question,
          content: `Q: ${item.question}\nA: ${item.answer}`,
        });
      }

      // CRITICAL: Recalculate actual chunk count AND total words
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for DB writes
      const allChunks = await base44.entities.KnowledgeChunk.filter({ knowledge_base_id: selectedKB.id });
      const totalWords = allChunks.reduce((sum, c) => sum + (c.content?.split(' ').length || 0), 0);
      
      await base44.entities.KnowledgeBase.update(selectedKB.id, {
        chunk_count: allChunks.length,
        total_words: totalWords,
        last_synced_at: new Date().toISOString()
      });

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] });
      await queryClient.invalidateQueries({ queryKey: ['knowledgeChunks', selectedKB.id] });
      
      // Wait and refetch
      setTimeout(async () => {
        await refetchChunks();
        
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successMsg.innerHTML = `<strong>✅ Success!</strong><br/>${validItems.length} FAQ(s) added to knowledge base`;
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 4000);
      }, 500);
      
      setFaqItems([{ question: "", answer: "" }]);
    } catch (error) {
      console.error('Error adding FAQs:', error);
      const errorMsg = document.createElement('div');
      errorMsg.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMsg.textContent = `❌ Error: ${error.message}`;
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 4000);
    }
  };

  const addFAQItem = () => {
    setFaqItems([...faqItems, { question: "", answer: "" }]);
  };

  const updateFAQItem = (index, field, value) => {
    const updated = [...faqItems];
    updated[index][field] = value;
    setFaqItems(updated);
  };

  const removeFAQItem = (index) => {
    setFaqItems(faqItems.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedKB) return;

    setUploadingFile(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Extract data from file
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            content: { type: "string", description: "The full text content of the document" },
            sections: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.status === "success" && result.output) {
        // Create knowledge chunks from extracted content
        let chunksCreated = 0;
        if (result.output.sections && result.output.sections.length > 0) {
          for (const section of result.output.sections) {
            await createChunkMutation.mutateAsync({
              knowledge_base_id: selectedKB.id,
              source_type: "file",
              source_ref: file.name,
              title: section.title,
              content: section.content
            });
            chunksCreated++;
          }
        } else if (result.output.content) {
          await createChunkMutation.mutateAsync({
            knowledge_base_id: selectedKB.id,
            source_type: "file",
            source_ref: file.name,
            content: result.output.content
          });
          chunksCreated = 1;
        }

        // CRITICAL: Recalculate actual chunk count AND total words
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for DB writes
        const allChunks = await base44.entities.KnowledgeChunk.filter({ knowledge_base_id: selectedKB.id });
        const totalWords = allChunks.reduce((sum, c) => sum + (c.content?.split(' ').length || 0), 0);
        
        await base44.entities.KnowledgeBase.update(selectedKB.id, {
          chunk_count: allChunks.length,
          total_words: totalWords,
          last_synced_at: new Date().toISOString()
        });

        // Force immediate refetch
        queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] });
        queryClient.invalidateQueries({ queryKey: ['knowledgeChunks', selectedKB.id] });
        
        // Wait and refetch to show updated data
        setTimeout(async () => {
          await refetchChunks();
          
          // Show success notification
          const successMessage = document.createElement('div');
          successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
          successMessage.innerHTML = `<strong>✅ Success!</strong><br/>${file.name} uploaded - ${newChunkCount} chunks created`;
          document.body.appendChild(successMessage);
          setTimeout(() => successMessage.remove(), 5000);
        }, 500);
      } else {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        errorMessage.textContent = '❌ Could not extract content from file. Please try a different format.';
        document.body.appendChild(errorMessage);
        setTimeout(() => errorMessage.remove(), 4000);
      }
    } catch (error) {
      console.error("File upload error:", error);
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMessage.textContent = `❌ Error uploading file: ${error.message}`;
      document.body.appendChild(errorMessage);
      setTimeout(() => errorMessage.remove(), 4000);
    }
    setUploadingFile(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Knowledge Bases</h1>
          <p className="text-slate-500 mt-1">Train your agents with FAQs, documents, and more</p>
        </div>
        <Button 
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Knowledge Base
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Knowledge Bases List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search knowledge bases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-3">
            {filteredKBs.map((kb) => {
            const typeInfo = typeConfig[kb.type] || typeConfig.mixed;
            const statusInfo = statusConfig[kb.status] || statusConfig.active;
            const StatusIcon = statusInfo.icon;

            // CRITICAL: Stop spinning if counts are zero/undefined but status is active
            const showSpin = statusInfo.spin && kb.status === 'processing';
            // Fallback to check icon if not spinning
            const DisplayIcon = showSpin ? Loader2 : (StatusIcon || CheckCircle2);

            return (
            <button
            key={kb.id}
            onClick={() => setSelectedKB(kb)}
            className={cn(
            "w-full p-4 rounded-xl border-2 text-left transition-all",
            selectedKB?.id === kb.id
              ? "border-indigo-500 bg-indigo-50/50 shadow-md"
              : "border-slate-200 hover:border-slate-300 bg-white"
            )}
            >
            <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${typeInfo.color}`}>
              <typeInfo.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 truncate">{kb.name}</h3>
                <DisplayIcon className={cn(
                  "w-4 h-4",
                  showSpin ? "animate-spin text-blue-500" : "text-emerald-500"
                )} />
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {kb.chunk_count || 0} chunks • {kb.total_words || 0} words • {typeInfo.label}
              </p>
                      {kb.shared_with_sri && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          ✓ Shared with Sri
                        </Badge>
                      )}
                    </div>
                    <ChevronRight className={cn(
                      "w-5 h-5 text-slate-400 transition-transform",
                      selectedKB?.id === kb.id && "rotate-90"
                    )} />
                  </div>
                </button>
              );
            })}

            {filteredKBs.length === 0 && !isLoading && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-500">No knowledge bases yet</p>
                  <Button 
                    variant="link" 
                    onClick={() => setIsCreateOpen(true)}
                    className="mt-2"
                  >
                    Create your first one
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Knowledge Base Details */}
        <div className="lg:col-span-2">
          {selectedKB ? (
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${typeConfig[selectedKB.type]?.color || typeConfig.mixed.color}`}>
                      {React.createElement(typeConfig[selectedKB.type]?.icon || BookOpen, { className: "w-6 h-6" })}
                    </div>
                    <div>
                      <CardTitle>{selectedKB.name}</CardTitle>
                      <CardDescription>
                        {selectedKB.description || "No description"}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Re-sync
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => deleteKBMutation.mutate(selectedKB.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="entries">
                  <TabsList>
                    <TabsTrigger value="entries">Entries ({chunks.length})</TabsTrigger>
                    <TabsTrigger value="add">Add Content</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>

                  <TabsContent value="entries" className="mt-4">
                    {chunks.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm text-slate-600">
                            <span className="font-semibold text-slate-900">{chunks.length}</span> knowledge chunks
                          </p>
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        </div>
                        {chunks.map((chunk) => (
                          <div 
                            key={chunk.id}
                            className="p-4 border rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group"
                          >
                            {chunk.title && (
                              <p className="font-medium text-slate-900 mb-1">{chunk.title}</p>
                            )}
                            <p className="text-sm text-slate-600 line-clamp-3">{chunk.content}</p>
                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant="secondary" className="text-xs capitalize">
                                {chunk.source_type}
                              </Badge>
                              {chunk.source_ref && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <File className="w-3 h-3" />
                                  {chunk.source_ref}
                                </span>
                              )}
                              <span className="text-xs text-slate-400 ml-auto">
                                {new Date(chunk.created_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Database className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                        <p className="font-medium text-slate-900 mb-1">No knowledge chunks yet</p>
                        <p className="text-sm text-slate-500 mb-4">
                          Upload files or add FAQs to start training your agent
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const addTab = document.querySelector('[value="add"]');
                            if (addTab) addTab.click();
                          }}
                          className="gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Content Now
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="add" className="mt-4 space-y-6">
                   <div>
                     <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                       <Globe className="w-4 h-4 text-cyan-600" />
                       Scrape Website
                     </h3>
                     <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                       <p className="text-sm text-slate-700 mb-3">
                         Enter a URL to automatically extract content, FAQs, and information from any website
                       </p>
                       <div className="flex gap-2">
                         <Input
                           placeholder="https://yourwebsite.com"
                           id="scrapeUrl"
                           className="flex-1"
                         />
                         <Button 
                           onClick={async () => {
                             const url = document.getElementById('scrapeUrl').value;
                             if (!url) {
                               toast.error("Please enter a URL");
                               return;
                             }
                             if (!selectedKB) {
                               toast.error("No knowledge base selected");
                               return;
                             }
                             try {
                               const loadingMsg = document.createElement('div');
                               loadingMsg.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                               loadingMsg.innerHTML = '<div class="flex items-center gap-2"><div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Scanning website...</span></div>';
                               document.body.appendChild(loadingMsg);

                               const result = await base44.functions.invoke('scrapeWebsiteKnowledge', {
                                 url,
                                 knowledge_base_id: selectedKB.id
                               });

                               loadingMsg.remove();

                               if (result.data.success && result.data.chunks_created > 0) {
                                 // Wait for backend to finish
                                 await new Promise(resolve => setTimeout(resolve, 1000));

                                 queryClient.invalidateQueries({ queryKey: ['knowledgeChunks'] });
                                 queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] });
                                 await refetchChunks();

                                 const successMsg = document.createElement('div');
                                 successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                                 successMsg.innerHTML = `<strong>✅ Website Scanned!</strong><br/>${result.data.chunks_created} topics learned`;
                                 document.body.appendChild(successMsg);
                                 setTimeout(() => successMsg.remove(), 5000);

                                 document.getElementById('scrapeUrl').value = '';
                               } else {
                                 const errorMsg = document.createElement('div');
                                 errorMsg.className = 'fixed top-4 right-4 bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                                 errorMsg.innerHTML = `<strong>⚠️ No Content Found</strong><br/>Could not extract text. Try a different URL or upload a PDF.`;
                                 document.body.appendChild(errorMsg);
                                 setTimeout(() => errorMsg.remove(), 6000);
                                 }
                                 } catch (error) {
                                 console.error('Scraping error:', error);
                               const errorMsg = document.createElement('div');
                               errorMsg.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                               errorMsg.textContent = `❌ Error: ${error.message}`;
                               document.body.appendChild(errorMsg);
                               setTimeout(() => errorMsg.remove(), 4000);
                             }
                           }}
                           className="bg-cyan-600 hover:bg-cyan-700"
                         >
                           <Globe className="w-4 h-4 mr-2" />
                           Scrape
                         </Button>
                       </div>
                     </div>
                   </div>

                   <div className="border-t pt-6">
                     <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                       <FileText className="w-4 h-4" />
                       Add FAQ Entries
                     </h3>
                      <div className="space-y-4">
                        {faqItems.map((item, index) => (
                          <div key={index} className="p-4 border rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-500">FAQ #{index + 1}</span>
                              {faqItems.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFAQItem(index)}
                                  className="h-6 w-6"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                            <Input
                              placeholder="Question..."
                              value={item.question}
                              onChange={(e) => updateFAQItem(index, 'question', e.target.value)}
                            />
                            <Textarea
                              placeholder="Answer..."
                              value={item.answer}
                              onChange={(e) => updateFAQItem(index, 'answer', e.target.value)}
                              rows={3}
                            />
                          </div>
                        ))}
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={addFAQItem} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Another
                          </Button>
                          <Button 
                            onClick={handleAddFAQ}
                            disabled={createChunkMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                          >
                            <Sparkles className="w-4 h-4" />
                            {createChunkMutation.isPending ? "Saving..." : "Save FAQs"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Upload Documents
                      </h3>
                      <label className="block cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,.txt,.csv,.doc,.docx"
                          onChange={handleFileUpload}
                          disabled={uploadingFile}
                          className="hidden"
                        />
                        <div className={cn(
                          "border-2 border-dashed rounded-xl p-8 text-center transition-all",
                          uploadingFile 
                            ? "border-indigo-300 bg-indigo-50" 
                            : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                        )}>
                          {uploadingFile ? (
                            <>
                              <Loader2 className="w-10 h-10 mx-auto mb-3 text-indigo-500 animate-spin" />
                              <p className="text-indigo-600 mb-1 font-medium">Processing file...</p>
                              <p className="text-sm text-slate-500">This may take a moment</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                              <p className="text-slate-600 mb-1">Click to upload files</p>
                              <p className="text-sm text-slate-400">or drag & drop here</p>
                              <p className="text-xs text-slate-400 mt-4">
                                Supports PDF, TXT, CSV, DOCX (max 10MB)
                              </p>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </TabsContent>

                  <TabsContent value="settings" className="mt-4 space-y-4">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Name</Label>
                        <Input value={selectedKB.name} readOnly />
                      </div>
                      <div className="grid gap-2">
                        <Label>Description</Label>
                        <Textarea value={selectedKB.description || ""} readOnly rows={3} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Embedding Model</Label>
                        <Input value={selectedKB.embedding_model || "text-embedding-3-small"} readOnly />
                      </div>
                      <div className="grid gap-2">
                        <Label>Statistics</Label>
                        <div className="p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Total Chunks:</span>
                            <span className="font-medium">
                              {selectedKB.chunk_count || chunks.length || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Total Words:</span>
                            <span className="font-medium">
                              {selectedKB.total_words !== undefined ? selectedKB.total_words : (
                                <span className="text-slate-400 italic text-xs">Calculated on sync</span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Last Updated:</span>
                            <span className="font-medium">
                              {selectedKB.last_synced_at 
                                ? new Date(selectedKB.last_synced_at).toLocaleDateString()
                                : 'Never'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Card className="border-2 border-purple-200 bg-purple-50/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-slate-900 mb-1">Share with Sri Assistant</h4>
                              <p className="text-xs text-slate-600">
                                Enable Sri chatbot to access this knowledge
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                await base44.entities.KnowledgeBase.update(selectedKB.id, {
                                  shared_with_sri: !selectedKB.shared_with_sri
                                });
                                queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] });
                                toast.success(selectedKB.shared_with_sri ? "Unshared from Sri" : "Shared with Sri");
                              }}
                            >
                              {selectedKB.shared_with_sri ? 'Unshare' : 'Share'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm h-full flex items-center justify-center">
              <CardContent className="py-16 text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">Select a knowledge base</h3>
                <p className="text-slate-500">
                  Choose a knowledge base from the list to view and manage its content
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Knowledge Base Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Knowledge Base</DialogTitle>
            <DialogDescription>
              Store FAQs, documents, and information for your AI agents
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateKB}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Product FAQs, Company Policies, etc."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What information does this knowledge base contain?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faq">FAQ</SelectItem>
                    <SelectItem value="documents">Documents</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createKBMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {createKBMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}