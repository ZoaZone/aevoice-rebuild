import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Building2,
  Phone,
  Globe,
  Calendar,
  FileText,
  Bot,
  Zap,
  CheckCircle2,
  Upload,
  Loader2,
  BookOpen,
  Image,
  Link2,
  Mail,
  MessageCircle,
  CreditCard,
  ShoppingCart,
  Users,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const steps = [
  { id: 1, title: "Business Info", icon: Building2 },
  { id: 2, title: "Knowledge Base", icon: BookOpen },
  { id: 3, title: "Integrations", icon: Zap },
  { id: 4, title: "Platforms", icon: Globe },
  { id: 5, title: "Voice Config", icon: Phone },
  { id: 6, title: "Services", icon: FileText },
  { id: 7, title: "Review", icon: Check },
];

export default function HelloBizOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    // Step 1: Business Info
    business_name: "",
    business_email: "",
    business_phone: "",
    website_url: "",
    industry: "",
    business_hours: "",
    logo_url: "",
    brand_colors: { primary: "#6366f1", secondary: "#8b5cf6", accent: "#06b6d4" },
    social_media: { facebook: "", instagram: "", linkedin: "", twitter: "" },
    
    // Step 2: Knowledge Base
    uploaded_documents: [],
    knowledge_content: "",
    import_urls: [],
    
    // Step 3: CRM & Calendar
    crm_system: "none",
    crm_credentials: "",
    calendar_system: "none",
    calendar_details: "",
    booking_preferences: "",
    timezone: "America/New_York",
    
    // Step 4: Platforms & Tools
    email_platform: "",
    communication_tools: [],
    ecommerce_platform: "",
    payment_processor: "",
    appointment_system: "",
    current_workflows: "",
    automation_goals: "",
    
    // Step 5: Voice Config
    voice_preference: "female",
    voice_accent: "american",
    greeting_message: "",
    call_scripts: [],
    escalation_protocol: "",
    after_hours_message: "",
    
    // Step 6: HelloBiz Services
    service_categories: [],
    pricing_structure: "",
    service_areas: "",
    service_images: [],
    testimonials: "",
    
    // Step 7: Final
    preferred_contact: "email",
    best_time_for_call: "",
    implementation_timeline: "asap"
  });

  const createSetupMutation = useMutation({
    mutationFn: async (data) => {
      // Process via backend function
      const result = await base44.functions.invoke('processWhiteGloveOnboarding', data);
      return result.data;
    },
    onSuccess: (data) => {
      toast.success('Setup request submitted! Check your email for confirmation.');
      setTimeout(() => {
        window.location.href = createPageUrl("Dashboard") + "?agency=hellobiz";
      }, 2000);
    },
  });

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (e, fieldName = 'uploaded_documents') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (fieldName === 'logo_url') {
        updateFormData('logo_url', file_url);
      } else if (fieldName === 'call_scripts') {
        updateFormData('call_scripts', [...formData.call_scripts, { name: file.name, url: file_url }]);
      } else if (fieldName === 'service_images') {
        updateFormData('service_images', [...formData.service_images, file_url]);
      } else {
        updateFormData(fieldName, [...formData[fieldName], { name: file.name, url: file_url }]);
      }
      
      toast.success(`Uploaded: ${file.name}`);
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    await createSetupMutation.mutateAsync(formData);
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG" 
              alt="AEVOICE" 
              className="w-16 h-16 rounded-2xl shadow-lg"
            />
            <span className="text-4xl font-bold">×</span>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <Badge className="mb-4 bg-emerald-500 text-white px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            $100 White-Glove Setup Service
          </Badge>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            HelloBiz AI Voice Assistant Setup
          </h1>
          <p className="text-slate-600">
            Complete this form and we'll build your AI agent for you within 24 hours
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  currentStep === step.id
                    ? "bg-indigo-600 text-white shadow-lg"
                    : currentStep > step.id
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <step.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {index < steps.length - 1 && (
                <div className={`h-0.5 w-8 rounded-full ${
                  currentStep > step.id ? "bg-indigo-400" : "bg-slate-200"
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
        <Progress value={progress} className="mb-8" />

        {/* Step 1: Business Info */}
        {currentStep === 1 && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>Tell us about your business</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Name *</Label>
                  <Input
                    placeholder="Acme Corporation"
                    value={formData.business_name}
                    onChange={(e) => updateFormData('business_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Industry *</Label>
                  <Input
                    placeholder="e.g., Healthcare, Legal, Retail"
                    value={formData.industry}
                    onChange={(e) => updateFormData('industry', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Email *</Label>
                  <Input
                    type="email"
                    placeholder="contact@business.com"
                    value={formData.business_email}
                    onChange={(e) => updateFormData('business_email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business Phone *</Label>
                  <Input
                    placeholder="+1 (555) 000-0000"
                    value={formData.business_phone}
                    onChange={(e) => updateFormData('business_phone', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Website URL</Label>
                  <Input
                    placeholder="https://yourbusiness.com"
                    value={formData.website_url}
                    onChange={(e) => updateFormData('website_url', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business Hours *</Label>
                  <Input
                    placeholder="e.g., Mon-Fri 9AM-5PM EST"
                    value={formData.business_hours}
                    onChange={(e) => updateFormData('business_hours', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'logo_url')}
                    disabled={uploading}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed rounded-lg p-4 hover:bg-slate-50 transition-all">
                    {formData.logo_url ? (
                      <div className="flex items-center gap-3">
                        <img src={formData.logo_url} alt="Logo" className="w-12 h-12 rounded object-cover" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">Logo uploaded</p>
                          <p className="text-xs text-slate-500">Click to change</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Image className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-500">Upload company logo</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <Label>Brand Colors</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Primary</Label>
                    <input
                      type="color"
                      value={formData.brand_colors.primary}
                      onChange={(e) => updateFormData('brand_colors', {...formData.brand_colors, primary: e.target.value})}
                      className="w-full h-10 rounded border border-slate-200 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Secondary</Label>
                    <input
                      type="color"
                      value={formData.brand_colors.secondary}
                      onChange={(e) => updateFormData('brand_colors', {...formData.brand_colors, secondary: e.target.value})}
                      className="w-full h-10 rounded border border-slate-200 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Accent</Label>
                    <input
                      type="color"
                      value={formData.brand_colors.accent}
                      onChange={(e) => updateFormData('brand_colors', {...formData.brand_colors, accent: e.target.value})}
                      className="w-full h-10 rounded border border-slate-200 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Social Media Profiles</Label>
                <div className="grid gap-3">
                  <Input
                    placeholder="Facebook page URL"
                    value={formData.social_media.facebook}
                    onChange={(e) => updateFormData('social_media', {...formData.social_media, facebook: e.target.value})}
                  />
                  <Input
                    placeholder="Instagram profile URL"
                    value={formData.social_media.instagram}
                    onChange={(e) => updateFormData('social_media', {...formData.social_media, instagram: e.target.value})}
                  />
                  <Input
                    placeholder="LinkedIn company URL"
                    value={formData.social_media.linkedin}
                    onChange={(e) => updateFormData('social_media', {...formData.social_media, linkedin: e.target.value})}
                  />
                  <Input
                    placeholder="Twitter/X profile URL"
                    value={formData.social_media.twitter}
                    onChange={(e) => updateFormData('social_media', {...formData.social_media, twitter: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Knowledge Base & Documents */}
        {currentStep === 2 && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>Upload Knowledge Base & Documents</CardTitle>
              <p className="text-sm text-slate-500">Provide documents to train your AI agent</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Upload Documents (PDF, DOCX, TXT, CSV)</Label>
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.csv"
                    onChange={(e) => handleFileUpload(e, 'uploaded_documents')}
                    disabled={uploading}
                    multiple
                    className="hidden"
                  />
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-slate-50 transition-all">
                    {uploading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                        <span className="text-sm text-indigo-600">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <p className="text-sm font-medium text-slate-700">Click to upload documents</p>
                        <p className="text-xs text-slate-500 mt-1">Product catalogs, FAQs, policies, training materials</p>
                      </>
                    )}
                  </div>
                </label>
                {formData.uploaded_documents.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {formData.uploaded_documents.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="flex-1">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateFormData('uploaded_documents', formData.uploaded_documents.filter((_, idx) => idx !== i))}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Additional Knowledge Content</Label>
                <Textarea
                  placeholder="Add any additional information about your business, services, policies, etc..."
                  value={formData.knowledge_content}
                  onChange={(e) => updateFormData('knowledge_content', e.target.value)}
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label>Import from URLs (Optional)</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="https://yourbusiness.com/faq"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value) {
                        updateFormData('import_urls', [...formData.import_urls, e.target.value]);
                        e.target.value = '';
                      }
                    }}
                  />
                  <p className="text-xs text-slate-500">Press Enter to add URL</p>
                  {formData.import_urls.length > 0 && (
                    <div className="space-y-1">
                      {formData.import_urls.map((url, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm">
                          <Link2 className="w-4 h-4 text-blue-500" />
                          <span className="flex-1 truncate">{url}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateFormData('import_urls', formData.import_urls.filter((_, idx) => idx !== i))}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: CRM & Calendar Integration */}
        {currentStep === 3 && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>CRM & Calendar Integration</CardTitle>
              <p className="text-sm text-slate-500">Connect your existing tools for seamless automation</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Current CRM System</Label>
                <Select value={formData.crm_system} onValueChange={(v) => updateFormData('crm_system', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / Not using CRM</SelectItem>
                    <SelectItem value="salesforce">Salesforce</SelectItem>
                    <SelectItem value="hubspot">HubSpot</SelectItem>
                    <SelectItem value="zoho">Zoho CRM</SelectItem>
                    <SelectItem value="pipedrive">Pipedrive</SelectItem>
                    <SelectItem value="monday">Monday.com</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.crm_system !== 'none' && (
                <div className="space-y-2">
                  <Label>CRM Integration Details</Label>
                  <Textarea
                    placeholder="API key, subdomain, or any credentials needed for integration..."
                    value={formData.crm_credentials}
                    onChange={(e) => updateFormData('crm_credentials', e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-slate-500">Our team will securely configure the integration</p>
                </div>
              )}

              <div className="border-t pt-4" />

              <div className="space-y-2">
                <Label>Calendar System</Label>
                <Select value={formData.calendar_system} onValueChange={(v) => updateFormData('calendar_system', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="google">Google Calendar</SelectItem>
                    <SelectItem value="outlook">Microsoft Outlook</SelectItem>
                    <SelectItem value="calendly">Calendly</SelectItem>
                    <SelectItem value="acuity">Acuity Scheduling</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.calendar_system !== 'none' && (
                <>
                  <div className="space-y-2">
                    <Label>Calendar Integration Details</Label>
                    <Textarea
                      placeholder="Calendar URL, API credentials, or integration details..."
                      value={formData.calendar_details}
                      onChange={(e) => updateFormData('calendar_details', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Booking Preferences</Label>
                      <Textarea
                        placeholder="e.g., 30-min slots, buffer time, meeting types..."
                        value={formData.booking_preferences}
                        onChange={(e) => updateFormData('booking_preferences', e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time Zone</Label>
                      <Select value={formData.timezone} onValueChange={(v) => updateFormData('timezone', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                          <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                          <SelectItem value="Europe/London">London (GMT)</SelectItem>
                          <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Existing Platforms & Workflows */}
        {currentStep === 4 && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>Current Platforms & Tools</CardTitle>
              <p className="text-sm text-slate-500">Tell us what you're already using</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Platform
                  </Label>
                  <Input
                    placeholder="e.g., Gmail, Outlook, Office 365"
                    value={formData.email_platform}
                    onChange={(e) => updateFormData('email_platform', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    E-commerce Platform
                  </Label>
                  <Input
                    placeholder="e.g., Shopify, WooCommerce, Magento"
                    value={formData.ecommerce_platform}
                    onChange={(e) => updateFormData('ecommerce_platform', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Payment Processor
                  </Label>
                  <Input
                    placeholder="e.g., Stripe, PayPal, Square"
                    value={formData.payment_processor}
                    onChange={(e) => updateFormData('payment_processor', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Appointment System
                  </Label>
                  <Input
                    placeholder="e.g., Calendly, Setmore, Square Appointments"
                    value={formData.appointment_system}
                    onChange={(e) => updateFormData('appointment_system', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Communication Tools (comma-separated)
                </Label>
                <Input
                  placeholder="e.g., Slack, Teams, WhatsApp Business, Discord"
                  value={formData.communication_tools.join(', ')}
                  onChange={(e) => updateFormData('communication_tools', e.target.value.split(',').map(t => t.trim()))}
                />
              </div>

              <div className="space-y-2">
                <Label>Current Manual Workflows to Automate</Label>
                <Textarea
                  placeholder="Describe your current manual processes (e.g., answering calls, taking messages, scheduling appointments, sending reminders)..."
                  value={formData.current_workflows}
                  onChange={(e) => updateFormData('current_workflows', e.target.value)}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Automation Goals & Pain Points</Label>
                <Textarea
                  placeholder="What problems are you trying to solve? What do you want automated? Any specific integration requirements?"
                  value={formData.automation_goals}
                  onChange={(e) => updateFormData('automation_goals', e.target.value)}
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Voice Assistant Configuration */}
        {currentStep === 5 && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>Voice Assistant Configuration</CardTitle>
              <p className="text-sm text-slate-500">Customize your AI agent's voice and behavior</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Voice Gender</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {['female', 'male'].map((gender) => (
                      <button
                        key={gender}
                        onClick={() => updateFormData('voice_preference', gender)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          formData.voice_preference === gender
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <p className="font-medium capitalize">{gender}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <Label>Voice Accent</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {['american', 'british', 'indian', 'australian'].map((accent) => (
                      <button
                        key={accent}
                        onClick={() => updateFormData('voice_accent', accent)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          formData.voice_accent === accent
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <p className="font-medium capitalize">{accent}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Greeting Message *</Label>
                <Textarea
                  placeholder="e.g., Hello! Thank you for calling [Business Name]. How may I help you today?"
                  value={formData.greeting_message}
                  onChange={(e) => updateFormData('greeting_message', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Upload Call Scripts (Optional)</Label>
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => handleFileUpload(e, 'call_scripts')}
                    disabled={uploading}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed rounded-lg p-4 hover:bg-slate-50 transition-all">
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-500">Upload call scripts or sample dialogues</span>
                    </div>
                  </div>
                </label>
                {formData.call_scripts.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {formData.call_scripts.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        {file.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Call Escalation Protocol</Label>
                <Textarea
                  placeholder="When should the AI transfer to a human? What issues require escalation?"
                  value={formData.escalation_protocol}
                  onChange={(e) => updateFormData('escalation_protocol', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>After-Hours Message</Label>
                <Textarea
                  placeholder="Message to play when calling outside business hours..."
                  value={formData.after_hours_message}
                  onChange={(e) => updateFormData('after_hours_message', e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: HelloBiz Service Listings */}
        {currentStep === 6 && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>HelloBiz Service Information</CardTitle>
              <p className="text-sm text-slate-500">Information for your HelloBiz marketplace listing</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Service Categories (comma-separated)</Label>
                <Input
                  placeholder="e.g., Plumbing, HVAC, Electrical, Consulting"
                  value={formData.service_categories.join(', ')}
                  onChange={(e) => updateFormData('service_categories', e.target.value.split(',').map(s => s.trim()))}
                />
              </div>

              <div className="space-y-2">
                <Label>Services You Offer *</Label>
                <Textarea
                  placeholder="List your main services in detail (one per line)..."
                  value={formData.pricing_structure}
                  onChange={(e) => updateFormData('pricing_structure', e.target.value)}
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label>Service Areas / Locations</Label>
                <Input
                  placeholder="e.g., Los Angeles County, Downtown NYC, Nationwide"
                  value={formData.service_areas}
                  onChange={(e) => updateFormData('service_areas', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Upload Service Images/Videos (Optional)</Label>
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => handleFileUpload(e, 'service_images')}
                    disabled={uploading}
                    multiple
                    className="hidden"
                  />
                  <div className="border-2 border-dashed rounded-lg p-4 hover:bg-slate-50 transition-all">
                    <div className="flex items-center justify-center gap-2">
                      <Image className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-500">Upload service photos or videos</span>
                    </div>
                  </div>
                </label>
                {formData.service_images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {formData.service_images.map((url, i) => (
                      <img key={i} src={url} alt={`Service ${i+1}`} className="w-full h-20 object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Customer Testimonials (Optional)</Label>
                <Textarea
                  placeholder="Add customer reviews or testimonials (one per line)..."
                  value={formData.testimonials}
                  onChange={(e) => updateFormData('testimonials', e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 7: Review & Submit */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Final Review & Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary */}
                <div className="flex items-center gap-4 mb-6">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover border-2 border-slate-200" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{formData.business_name}</h3>
                    <p className="text-slate-500">{formData.industry}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500 mb-1">Contact Info</p>
                    <p className="text-slate-900 font-medium">{formData.business_email}</p>
                    <p className="text-slate-600">{formData.business_phone}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500 mb-1">Voice</p>
                    <p className="text-slate-900 capitalize">
                      {formData.voice_preference} • {formData.voice_accent}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500 mb-1">Documents</p>
                    <p className="text-slate-900">{formData.uploaded_documents.length} uploaded</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500 mb-1">Integrations</p>
                    <p className="text-slate-900">{formData.crm_system} CRM • {formData.calendar_system} Calendar</p>
                  </div>
                </div>

                {/* Contact Preferences */}
                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-semibold text-slate-900">Setup Call Preferences</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Preferred Contact Method</Label>
                      <Select value={formData.preferred_contact} onValueChange={(v) => updateFormData('preferred_contact', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone Call</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Best Time for Setup Call</Label>
                      <Input
                        placeholder="e.g., Weekdays 2-4 PM EST"
                        value={formData.best_time_for_call}
                        onChange={(e) => updateFormData('best_time_for_call', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Implementation Timeline</Label>
                    <Select value={formData.implementation_timeline} onValueChange={(v) => updateFormData('implementation_timeline', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asap">ASAP (24-48 hours)</SelectItem>
                        <SelectItem value="week">Within 1 week</SelectItem>
                        <SelectItem value="month">Within 1 month</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-emerald-200 bg-emerald-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">What happens next?</h3>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Comprehensive email sent to implementation team
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Setup review call scheduled within 24 hours
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        AI agent configured with all integrations
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        FlowSync workflows automated
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        HelloBiz marketplace listing created
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Full platform ready within 48-72 hours
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < steps.length ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={
                (currentStep === 1 && (!formData.business_name || !formData.business_email || !formData.business_phone || !formData.industry || !formData.business_hours)) ||
                (currentStep === 5 && !formData.greeting_message) ||
                (currentStep === 6 && formData.service_categories.length === 0)
              }
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createSetupMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createSetupMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Submit Setup Request
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}