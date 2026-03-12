import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Sparkles,
  Mail,
  MessageCircle,
  Video,
  Share2,
  Upload,
  Download,
  Play,
  Pause,
  Calendar,
  Users,
  TrendingUp,
  FileText,
  Zap,
  Activity,
  Phone,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import WorkflowBuilder from "../components/marketing/WorkflowBuilder";

export default function MarketingHub() {
  const [activeTab, setActiveTab] = useState("overview");
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [uploadContactsOpen, setUploadContactsOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [showDraftEditor, setShowDraftEditor] = useState(false);
  const [draftContent, setDraftContent] = useState({ subject: "", body: "", cta_text: "", cta_url: "" });
  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(false);
  
  const [campaignData, setCampaignData] = useState({
    name: "",
    type: "email",
    ai_prompt: "",
    target_tags: [],
    schedule_date: "",
    agent_id: "",
    phone_number_id: "",
    from_email: ""
  });

  const queryClient = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ['marketingContacts'],
    queryFn: () => base44.entities.MarketingContact.list(),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['marketingCampaigns'],
    queryFn: () => base44.entities.MarketingCampaign.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const { data: phoneNumbers = [] } = useQuery({
    queryKey: ['phoneNumbers'],
    queryFn: () => base44.entities.PhoneNumber.list(),
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => base44.entities.IntegrationConfig.list(),
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => base44.entities.MarketingWorkflow.list(),
  });

  const saveApiKeyMutation = useMutation({
    mutationFn: async (apiKey) => {
      const client = clients[0];
      const existingConfig = integrations.find(i => i.provider === 'google_ai');
      
      if (existingConfig) {
        return base44.entities.IntegrationConfig.update(existingConfig.id, {
          config: { ...existingConfig.config, api_key: apiKey }
        });
      } else {
        return base44.entities.IntegrationConfig.create({
          agency_id: client.agency_id,
          integration_type: 'custom_api',
          provider: 'google_ai',
          name: 'Google AI (Veo)',
          config: { api_key: apiKey },
          enabled: true,
          status: 'active'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setShowApiKeyDialog(false);
      toast.success("Google AI API key saved successfully");
    },
  });

  const googleAiConfigured = integrations.some(i => i.provider === 'google_ai' && i.config?.api_key);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            contacts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  phone: { type: "string" },
                  full_name: { type: "string" },
                  company: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                  funnel_stage: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.status === "success" && result.output?.contacts) {
        const clientId = clients[0]?.id || "default";
        
        // Bulk create contacts
        const contactsToCreate = result.output.contacts.map(contact => ({
          ...contact,
          client_id: clientId,
          source: "bulk_upload",
          status: "active",
          email_subscribed: true,
          whatsapp_subscribed: contact.phone ? true : false,
          funnel_stage: contact.funnel_stage || "lead"
        }));

        await base44.entities.MarketingContact.bulkCreate(contactsToCreate);
        
        queryClient.invalidateQueries({ queryKey: ['marketingContacts'] });
        toast.success(`Successfully imported ${result.output.contacts.length} contacts to master database`);
        setUploadContactsOpen(false);
      } else {
        toast.error("Failed to extract contacts from file");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error uploading contacts: " + error.message);
    }
    setUploadingFile(false);
  };

  const generateAIContent = async () => {
    if (!campaignData.ai_prompt) return;
    
    setGeneratingContent(true);
    try {
      let contentResult;
      
      if (campaignData.type === 'video') {
        // Check if Google AI is configured
        if (!googleAiConfigured) {
          toast.error("Please configure your Google AI API key first");
          setGeneratingContent(false);
          setShowApiKeyDialog(true);
          return;
        }
        
        // Generate video using backend function
        const videoResponse = await base44.functions.invoke('generateVideo', {
          prompt: campaignData.ai_prompt,
          duration: 30
        });
        
        if (videoResponse.data?.error) {
          toast.error(videoResponse.data.message || "Video generation failed");
          setGeneratingContent(false);
          return;
        }
        
        contentResult = {
          subject: campaignData.name,
          body: campaignData.ai_prompt,
          media_url: videoResponse.data?.video_url || null,
          cta_text: "Watch Now",
          cta_url: ""
        };
      } else {
        // Generate text content with AI
        contentResult = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a professional marketing copywriter. Generate compelling ${campaignData.type} marketing content.

Campaign details: ${campaignData.ai_prompt}

Create engaging, professional content that drives action. Be creative and persuasive.

Return ONLY valid JSON (no markdown, no code blocks) with these fields:
- subject: catchy subject line (for email) or title
- body: full marketing message (use HTML for email, plain text for WhatsApp)
- cta_text: call-to-action button text
- cta_url: suggested URL for the CTA`,
          response_json_schema: {
            type: "object",
            properties: {
              subject: { type: "string", description: "Catchy subject line or title" },
              body: { type: "string", description: "Full marketing message content" },
              cta_text: { type: "string", description: "Call to action button text" },
              cta_url: { type: "string", description: "URL for the call to action" }
            },
            required: ["subject", "body", "cta_text"]
          }
        });
      }

      // Show draft editor for review
      setDraftContent(contentResult);
      setShowDraftEditor(true);
      setCreateCampaignOpen(false);
      toast.success("Content generated! Review and edit before sending.");
    } catch (error) {
      console.error("Content generation error:", error);
      toast.error("Error generating content: " + (error.message || "Unknown error"));
    }
    setGeneratingContent(false);
  };

  const createCampaignMutation = useMutation({
    mutationFn: (data) => base44.entities.MarketingCampaign.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
      toast.success("Campaign created successfully!");
      setCampaignData({ name: "", type: "email", ai_prompt: "", target_tags: [], schedule_date: "", agent_id: "", phone_number_id: "", from_email: "" });
      setDraftContent({ subject: "", body: "", cta_text: "", cta_url: "" });
    },
  });

  const stats = {
    totalContacts: contacts.length,
    activeCampaigns: campaigns.filter(c => c.status === 'running').length,
    emailSubscribers: contacts.filter(c => c.email_subscribed).length,
    whatsappSubscribers: contacts.filter(c => c.whatsapp_subscribed).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Marketing Hub</h1>
          <p className="text-slate-500 mt-1">AI-powered marketing automation for your business</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUploadContactsOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Contacts
          </Button>
          <Button onClick={() => setCreateCampaignOpen(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Sparkles className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalContacts}</p>
                <p className="text-xs text-slate-500">Total Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeCampaigns}</p>
                <p className="text-xs text-slate-500">Active Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.emailSubscribers}</p>
                <p className="text-xs text-slate-500">Email Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-100">
                <MessageCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.whatsappSubscribers}</p>
                <p className="text-xs text-slate-500">WhatsApp</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* AI Tools */}
            <Card className="border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  AI Marketing Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={() => {
                  setCampaignData({...campaignData, type: 'email'});
                  setCreateCampaignOpen(true);
                }}>
                  <Mail className="w-4 h-4 mr-2" />
                  Generate Email Campaign
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => {
                  setCampaignData({...campaignData, type: 'whatsapp'});
                  setCreateCampaignOpen(true);
                }}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Generate WhatsApp Broadcast
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => {
                  setCampaignData({...campaignData, type: 'voice_call'});
                  setCreateCampaignOpen(true);
                }}>
                  <Phone className="w-4 h-4 mr-2" />
                  Voice Call Campaign
                  <Badge className="ml-auto bg-cyan-100 text-cyan-700 text-xs">Auto Reminders</Badge>
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => {
                  setCampaignData({...campaignData, type: 'social_media'});
                  setCreateCampaignOpen(true);
                }}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Create Social Posts
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => {
                  if (!googleAiConfigured) {
                    setShowApiKeyDialog(true);
                  } else {
                    setCampaignData({...campaignData, type: 'video'});
                    setCreateCampaignOpen(true);
                  }
                }}>
                  <Video className="w-4 h-4 mr-2" />
                  Generate Marketing Video (AI)
                  {!googleAiConfigured && (
                    <Badge className="ml-auto bg-amber-100 text-amber-700 text-xs">Setup Required</Badge>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Recent Campaigns */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Recent Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No campaigns yet</p>
                ) : (
                  <div className="space-y-2">
                    {campaigns.slice(0, 5).map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          {campaign.type === 'email' && <Mail className="w-4 h-4 text-purple-500" />}
                          {campaign.type === 'whatsapp' && <MessageCircle className="w-4 h-4 text-green-500" />}
                          {campaign.type === 'voice_call' && <Phone className="w-4 h-4 text-cyan-500" />}
                          {campaign.type === 'social_media' && <Share2 className="w-4 h-4 text-blue-500" />}
                          {campaign.type === 'video' && <Video className="w-4 h-4 text-red-500" />}
                          <div>
                            <p className="text-sm font-medium">{campaign.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{campaign.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <Badge variant={
                          campaign.status === 'running' ? 'default' :
                          campaign.status === 'completed' ? 'secondary' : 'outline'
                        }>
                          {campaign.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
              <CardDescription>View and manage all marketing campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No campaigns yet</h3>
                  <p className="text-slate-500 mb-4">Create your first AI-powered campaign</p>
                  <Button onClick={() => setCreateCampaignOpen(true)}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-xl hover:border-indigo-300 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          campaign.type === 'email' && "bg-purple-100",
                          campaign.type === 'whatsapp' && "bg-green-100",
                          campaign.type === 'voice_call' && "bg-cyan-100",
                          campaign.type === 'social_media' && "bg-blue-100",
                          campaign.type === 'video' && "bg-red-100"
                        )}>
                          {campaign.type === 'email' && <Mail className="w-6 h-6 text-purple-600" />}
                          {campaign.type === 'whatsapp' && <MessageCircle className="w-6 h-6 text-green-600" />}
                          {campaign.type === 'voice_call' && <Phone className="w-6 h-6 text-cyan-600" />}
                          {campaign.type === 'social_media' && <Share2 className="w-6 h-6 text-blue-600" />}
                          {campaign.type === 'video' && <Video className="w-6 h-6 text-red-600" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">{campaign.name}</h3>
                          <p className="text-sm text-slate-500 capitalize">
                            {campaign.type.replace('_', ' ')} • {new Date(campaign.created_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          campaign.status === 'running' ? 'default' :
                          campaign.status === 'completed' ? 'secondary' : 'outline'
                        }>
                          {campaign.status}
                        </Badge>
                        {campaign.stats && (
                          <div className="text-sm text-slate-600">
                            {campaign.stats.sent || 0} sent
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Marketing Workflows</CardTitle>
                <CardDescription>Automate follow-ups, reminders, and sequences</CardDescription>
              </div>
              <Button onClick={() => setShowWorkflowBuilder(!showWorkflowBuilder)}>
                <Plus className="w-4 h-4 mr-2" />
                {showWorkflowBuilder ? 'Cancel' : 'Create Workflow'}
              </Button>
            </CardHeader>
            <CardContent>
              {showWorkflowBuilder && (
                <WorkflowBuilder 
                  clientId={clients[0]?.id} 
                  onComplete={() => setShowWorkflowBuilder(false)}
                />
              )}

              {!showWorkflowBuilder && (
                workflows.length > 0 ? (
                  <div className="space-y-3">
                    {workflows.map(workflow => (
                      <div key={workflow.id} className="p-4 border rounded-lg flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{workflow.name}</h4>
                            <Badge className={workflow.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}>
                              {workflow.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 capitalize">
                            Trigger: {workflow.trigger_type?.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {workflow.actions?.length || 0} actions • Ran {workflow.runs_count || 0} times
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Zap className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                    <h3 className="text-lg font-medium text-slate-900 mb-1">No workflows yet</h3>
                    <p className="text-slate-500 mb-4">Create automated sequences for appointments and follow-ups</p>
                    <Button onClick={() => setShowWorkflowBuilder(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Workflow
                    </Button>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Contacts Database</CardTitle>
              <CardDescription>{contacts.length} total contacts</CardDescription>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 mb-4">No contacts yet. Upload a CSV to get started.</p>
                  <Button onClick={() => setUploadContactsOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Contacts
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.slice(0, 10).map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{contact.full_name || contact.email}</p>
                        <p className="text-sm text-slate-500">{contact.email} • {contact.phone}</p>
                      </div>
                      <Badge>{contact.funnel_stage}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Dialog */}
      <Dialog open={createCampaignOpen} onOpenChange={setCreateCampaignOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Create AI-Powered Campaign
            </DialogTitle>
            <DialogDescription>
              Describe your campaign and let AI generate the content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input
                placeholder="e.g., Summer Sale 2025"
                value={campaignData.name}
                onChange={(e) => setCampaignData({...campaignData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Campaign Type</Label>
              <Select value={campaignData.type} onValueChange={(v) => setCampaignData({...campaignData, type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email Campaign</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp Broadcast</SelectItem>
                  <SelectItem value="voice_call">Voice Call Campaign</SelectItem>
                  <SelectItem value="social_media">Social Media Posts</SelectItem>
                  <SelectItem value="video">Video Script</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Describe Your Campaign *</Label>
              <Textarea
                placeholder="e.g., Promote our new AI voice assistant with 20% discount for first-time users..."
                value={campaignData.ai_prompt}
                onChange={(e) => setCampaignData({...campaignData, ai_prompt: e.target.value})}
                rows={4}
              />
            </div>

            {/* Campaign Configuration */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-4">
              <h4 className="font-medium text-slate-900 text-sm">Campaign Settings</h4>
              
              {campaignData.type === 'email' && (
                <div className="space-y-2">
                  <Label>From Email Address</Label>
                  <Input
                    type="email"
                    placeholder="noreply@yourbusiness.com"
                    value={campaignData.from_email}
                    onChange={(e) => setCampaignData({...campaignData, from_email: e.target.value})}
                  />
                </div>
              )}

              {campaignData.type === 'whatsapp' && (
                <div className="space-y-2">
                  <Label>Select Phone Number</Label>
                  <Select value={campaignData.phone_number_id} onValueChange={(v) => setCampaignData({...campaignData, phone_number_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a phone number" />
                    </SelectTrigger>
                    <SelectContent>
                      {phoneNumbers.map((num) => (
                        <SelectItem key={num.id} value={num.id}>{num.number_e164}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {campaignData.type === 'voice_call' && (
                <div className="space-y-3">
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <h4 className="text-sm font-semibold text-cyan-900 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Voice Call Campaign Types
                    </h4>
                    <ul className="text-xs text-cyan-800 space-y-1">
                      <li>• Auto reminders from CRM (appointments, payments)</li>
                      <li>• Bulk voice wishes (birthdays, holidays, anniversaries)</li>
                      <li>• Automated information broadcasts (updates, alerts)</li>
                      <li>• Follow-up calls for leads/customers</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <Label>Select AI Agent for Calls</Label>
                    <Select value={campaignData.agent_id} onValueChange={(v) => setCampaignData({...campaignData, agent_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an AI agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Calling Phone Number</Label>
                    <Select value={campaignData.phone_number_id} onValueChange={(v) => setCampaignData({...campaignData, phone_number_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outbound number" />
                      </SelectTrigger>
                      <SelectContent>
                        {phoneNumbers.map((num) => (
                          <SelectItem key={num.id} value={num.id}>{num.number_e164} - {num.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Schedule Send (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={campaignData.schedule_date}
                  onChange={(e) => setCampaignData({...campaignData, schedule_date: e.target.value})}
                />
                <p className="text-xs text-slate-500">Leave empty to save as draft</p>
              </div>

              <div className="space-y-2">
                <Label>Target Audience Tags (Optional)</Label>
                <Input
                  placeholder="e.g., vip, newsletter, prospects"
                  value={campaignData.target_tags.join(', ')}
                  onChange={(e) => setCampaignData({...campaignData, target_tags: e.target.value.split(',').map(t => t.trim())})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCampaignOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={generateAIContent}
              disabled={!campaignData.name || !campaignData.ai_prompt || generatingContent}
              className="bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              {generatingContent ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-pulse" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate with AI
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Contacts Dialog */}
      <Dialog open={uploadContactsOpen} onOpenChange={setUploadContactsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Contacts to Master Database</DialogTitle>
            <DialogDescription>
              Upload CSV/Excel with auto-funnel contacts for newsletters, emails, and campaigns
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-slate-900 mb-2">Required Columns:</h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• <strong>email</strong> (required)</li>
                <li>• phone, full_name, company (optional)</li>
                <li>• tags (comma-separated, e.g., "vip,newsletter")</li>
                <li>• funnel_stage (lead/prospect/customer/churned)</li>
              </ul>
            </div>
            <label className="block cursor-pointer">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="hidden"
              />
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-slate-50 transition-all">
                {uploadingFile ? (
                  <>
                    <Zap className="w-8 h-8 mx-auto mb-2 text-indigo-500 animate-pulse" />
                    <p className="text-sm text-indigo-600">Processing bulk upload...</p>
                    <p className="text-xs text-slate-500 mt-1">Extracting and validating contacts</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-medium text-slate-700">Upload CSV or Excel</p>
                    <p className="text-xs text-slate-500 mt-1">Master contacts for marketing automation</p>
                  </>
                )}
              </div>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadContactsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draft Email Editor Dialog */}
      <Dialog open={showDraftEditor} onOpenChange={setShowDraftEditor}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Review & Edit Campaign Draft
            </DialogTitle>
            <DialogDescription>
              Review the AI-generated content and make any necessary edits before sending
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={draftContent.subject}
                onChange={(e) => setDraftContent({ ...draftContent, subject: e.target.value })}
                placeholder="Email subject..."
              />
            </div>
            <div className="space-y-2">
              <Label>Email Body</Label>
              <Textarea
                value={draftContent.body}
                onChange={(e) => setDraftContent({ ...draftContent, body: e.target.value })}
                placeholder="Email content..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Call-to-Action Text</Label>
                <Input
                  value={draftContent.cta_text}
                  onChange={(e) => setDraftContent({ ...draftContent, cta_text: e.target.value })}
                  placeholder="e.g., Learn More"
                />
              </div>
              <div className="space-y-2">
                <Label>CTA Link URL</Label>
                <Input
                  value={draftContent.cta_url}
                  onChange={(e) => setDraftContent({ ...draftContent, cta_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            {draftContent.media_url && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-sm font-medium text-blue-900">Media Attachment</Label>
                <a 
                  href={draftContent.media_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline mt-1 block"
                >
                  {draftContent.media_url}
                </a>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDraftEditor(false);
              setCreateCampaignOpen(true);
            }}>
              ← Back to Edit
            </Button>
            <Button variant="outline" onClick={() => {
              setCampaignData({ ...campaignData, content: draftContent });
              setShowDraftEditor(false);
              toast.success("Draft saved");
            }}>
              Save as Draft
            </Button>
            <Button 
              onClick={async () => {
                const clientId = clients[0]?.id || "default";
                
                // First, check if we have any contacts at all
                if (contacts.length === 0) {
                  toast.error('No contacts found! Please upload contacts first.');
                  setShowDraftEditor(false);
                  setUploadContactsOpen(true);
                  return;
                }
                
                // Validation checks
                if (campaignData.type === 'whatsapp') {
                  if (!campaignData.phone_number_id) {
                    toast.error('Please select a phone number for WhatsApp campaign');
                    return;
                  }
                  
                  const whatsappContacts = contacts.filter(c => c.whatsapp_subscribed && c.phone);
                  if (whatsappContacts.length === 0) {
                    toast.error('No WhatsApp subscribers found! Upload contacts with phone numbers first.');
                    setShowDraftEditor(false);
                    setUploadContactsOpen(true);
                    return;
                  }
                  
                  // Show contact selection with actual numbers
                  const confirmed = window.confirm(
                    `Send WhatsApp message to ${whatsappContacts.length} subscribers?\n\nMessage: ${draftContent.body.substring(0, 100)}...\n\nContacts:\n${whatsappContacts.slice(0, 5).map(c => `- ${c.full_name || c.email} (${c.phone})`).join('\n')}${whatsappContacts.length > 5 ? `\n...and ${whatsappContacts.length - 5} more` : ''}\n\nClick OK to send.`
                  );
                  
                  if (!confirmed) return;
                  
                  // Create campaign
                  const campaign = await createCampaignMutation.mutateAsync({
                    client_id: clientId,
                    name: campaignData.name,
                    type: campaignData.type,
                    content: draftContent,
                    ai_generated: true,
                    ai_prompt: campaignData.ai_prompt,
                    status: 'running',
                    target_audience: campaignData.target_tags.length > 0 ? { tags: campaignData.target_tags } : undefined
                  });
                  
                  // Get WhatsApp contact IDs
                  const whatsappContactIds = contacts
                    .filter(c => c.whatsapp_subscribed && c.phone)
                    .map(c => c.id);
                  
                  // Send WhatsApp messages
                  const result = await base44.functions.invoke('sendWhatsAppCampaign', {
                    campaign_id: campaign.id,
                    message: draftContent.body,
                    phone_number_id: campaignData.phone_number_id,
                    contact_ids: whatsappContactIds
                  });
                  
                  if (result.data.success) {
                    toast.success(`WhatsApp campaign sent to ${result.data.sent_count} contacts!`);
                  } else {
                    toast.error('Campaign send failed: ' + (result.data.error || 'Unknown error'));
                  }
                  
                } else if (campaignData.type === 'email') {
                  if (!campaignData.from_email) {
                    toast.error('Please provide a sender email address');
                    return;
                  }
                  
                  const emailContacts = contacts.filter(c => c.email_subscribed && c.email);
                  if (emailContacts.length === 0) {
                    toast.error('No email subscribers found! Upload contacts with emails first.');
                    setShowDraftEditor(false);
                    setUploadContactsOpen(true);
                    return;
                  }
                  
                  const confirmed = window.confirm(
                    `Send email to ${emailContacts.length} subscribers?\n\nSubject: ${draftContent.subject}\n\nContacts:\n${emailContacts.slice(0, 5).map(c => `- ${c.full_name || 'Name'} (${c.email})`).join('\n')}${emailContacts.length > 5 ? `\n...and ${emailContacts.length - 5} more` : ''}\n\nClick OK to proceed.`
                  );
                  
                  if (!confirmed) return;
                  
                  // Create email campaign (draft for now)
                  await createCampaignMutation.mutateAsync({
                    client_id: clientId,
                    name: campaignData.name,
                    type: campaignData.type,
                    content: draftContent,
                    ai_generated: true,
                    ai_prompt: campaignData.ai_prompt,
                    status: 'draft',
                    target_audience: campaignData.target_tags.length > 0 ? { tags: campaignData.target_tags } : undefined,
                    target_contact_ids: emailContacts.map(c => c.id)
                  });
                  
                  toast.success(`Email campaign saved as draft for ${emailContacts.length} contacts. Email sending coming soon!`);
                } else {
                  // Other campaign types - save as draft
                  await createCampaignMutation.mutateAsync({
                    client_id: clientId,
                    name: campaignData.name,
                    type: campaignData.type,
                    content: draftContent,
                    ai_generated: true,
                    ai_prompt: campaignData.ai_prompt,
                    status: 'draft'
                  });
                  
                  toast.success('Campaign saved as draft!');
                }
                
                setShowDraftEditor(false);
              }}
              disabled={createCampaignMutation.isPending || contacts.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {createCampaignMutation.isPending ? "Sending..." : 
               campaignData.type === 'whatsapp' ? "Send WhatsApp Campaign" : 
               campaignData.type === 'email' ? "Save Email Campaign" :
               "Save Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google AI API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-red-600" />
              Configure Google AI for Video Generation
            </DialogTitle>
            <DialogDescription>
              Enter your Google AI API key to enable AI video generation with Veo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">How to get your Google AI API key:</h4>
              <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside">
                <li>Visit <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">Google AI Studio</a></li>
                <li>Sign in with your Google account</li>
                <li>Click <strong>"Get API Key"</strong> or <strong>"Create API Key"</strong></li>
                <li>Copy the generated key (starts with "AIza...")</li>
                <li>Paste it in the field below</li>
              </ol>
              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                <strong>Note:</strong> Your API key is encrypted and stored securely. You will be charged by Google based on your video generation usage.
              </div>
            </div>
            <div className="space-y-2">
              <Label>Google AI API Key</Label>
              <Input
                type="password"
                placeholder="AIza..."
                value={googleApiKey}
                onChange={(e) => setGoogleApiKey(e.target.value)}
              />
              <p className="text-xs text-slate-500">Your API key is encrypted and stored securely</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveApiKeyMutation.mutate(googleApiKey)}
              disabled={!googleApiKey || saveApiKeyMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {saveApiKeyMutation.isPending ? "Saving..." : "Save & Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}