import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Stethoscope,
  Home,
  ShoppingCart,
  Scale,
  Car,
  Sparkles,
  CheckCircle2,
  Search
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const industryTemplates = [
  {
    id: "real-estate",
    icon: Building2,
    name: "Real Estate",
    color: "from-blue-500 to-cyan-500",
    description: "Property inquiries, showings, and lead qualification",
    systemPrompt: `You are a professional AI receptionist for a real estate agency.

Your role is to:
- Answer property inquiries and provide listing information
- Schedule property showings and virtual tours
- Qualify leads (budget, timeline, location preferences)
- Collect contact information for follow-up
- Transfer urgent matters to available agents

Property Info to Share:
- Available listings (homes, condos, commercial)
- Pricing ranges and neighborhoods
- Property features and amenities
- Financing options and mortgage pre-approval

Be professional, enthusiastic, and helpful. Always ask qualifying questions to understand buyer/renter needs.`,
    greeting: "Thank you for calling [Agency Name] Real Estate! I'm here to help you find your perfect property. Are you looking to buy, rent, or would you like information about one of our listings?",
    knowledgeTopics: [
      "Current property listings with prices, locations, and features",
      "Neighborhood information and school districts",
      "Mortgage and financing options",
      "Home buying/renting process steps",
      "Agent availability and showing schedules"
    ]
  },
  {
    id: "dental-medical",
    icon: Stethoscope,
    name: "Dental/Medical",
    color: "from-emerald-500 to-teal-500",
    description: "Appointment booking, insurance verification, patient intake",
    systemPrompt: `You are a professional AI receptionist for a dental/medical practice.

Your role is to:
- Book, reschedule, and confirm appointments
- Verify insurance information
- Conduct initial patient intake
- Handle emergency triage (route urgently if needed)
- Answer questions about services and procedures

Important Information:
- Office hours and location
- Accepted insurance providers
- New patient vs existing patient procedures
- Emergency protocol

Be empathetic, professional, and reassuring. Prioritize urgent medical situations.`,
    greeting: "Thank you for calling [Practice Name]. I'm here to help with appointments, insurance questions, or any other needs. How may I assist you today?",
    knowledgeTopics: [
      "List of services and procedures offered",
      "Insurance providers accepted",
      "New patient intake requirements",
      "Office hours and emergency contact",
      "Common treatment FAQs and pricing"
    ]
  },
  {
    id: "home-services",
    icon: Home,
    name: "Home Services",
    color: "from-amber-500 to-orange-500",
    description: "Quote requests, emergency dispatch, service scheduling",
    systemPrompt: `You are a professional AI receptionist for a home services company (plumbing, HVAC, electrical, etc.).

Your role is to:
- Schedule service appointments
- Provide initial quotes and price estimates
- Dispatch emergency services
- Answer questions about services offered
- Collect job details and customer information

Services Information:
- Emergency vs scheduled service
- Service areas covered
- Pricing structure
- Technician availability

Be responsive, helpful, and solution-focused. Prioritize emergencies.`,
    greeting: "Thank you for calling [Company Name] Home Services! Whether it's an emergency or scheduled service, I'm here to help. What can we assist you with today?",
    knowledgeTopics: [
      "Service offerings (plumbing, HVAC, electrical, etc.)",
      "Emergency response time and availability",
      "Service area coverage map",
      "Pricing structure and estimates",
      "Warranties and guarantees"
    ]
  },
  {
    id: "ecommerce",
    icon: ShoppingCart,
    name: "E-commerce",
    color: "from-purple-500 to-pink-500",
    description: "Order status, returns, product questions",
    systemPrompt: `You are a professional AI customer service agent for an e-commerce business.

Your role is to:
- Answer product questions and provide recommendations
- Check order status and shipping information
- Process returns and exchanges
- Handle billing inquiries
- Collect feedback and resolve issues

Key Information:
- Product catalog and specifications
- Shipping policies and delivery times
- Return/exchange policy
- Payment and security information

Be friendly, helpful, and product-knowledgeable. Focus on customer satisfaction.`,
    greeting: "Hi! Thanks for contacting [Store Name]. I can help with orders, products, returns, or any questions. What brings you here today?",
    knowledgeTopics: [
      "Product catalog with descriptions and pricing",
      "Shipping and delivery policies",
      "Return and exchange procedures",
      "Warranty information",
      "Common product FAQs"
    ]
  },
  {
    id: "legal",
    icon: Scale,
    name: "Legal Services",
    color: "from-slate-600 to-slate-800",
    description: "Consultation booking, case intake, document requests",
    systemPrompt: `You are a professional AI receptionist for a law firm.

Your role is to:
- Schedule consultations with attorneys
- Conduct initial case intake
- Answer general questions about practice areas
- Collect client information securely
- Transfer to paralegals or attorneys when needed

Practice Areas:
- [List your firm's specialties]
- Initial consultation process
- Fee structures
- Confidentiality assurance

Be professional, discreet, and empathetic. Maintain strict confidentiality.`,
    greeting: "Thank you for calling [Law Firm Name]. I'm here to help schedule consultations, answer questions about our services, or connect you with our legal team. How may I assist you?",
    knowledgeTopics: [
      "Practice areas and attorney specialties",
      "Consultation fees and billing structure",
      "Required documents for different case types",
      "Attorney availability and credentials",
      "Confidentiality and privacy policies"
    ]
  },
  {
    id: "automotive",
    icon: Car,
    name: "Automotive",
    color: "from-red-500 to-rose-500",
    description: "Service scheduling, parts inquiry, test drive booking",
    systemPrompt: `You are a professional AI receptionist for an automotive dealership/service center.

Your role is to:
- Schedule service appointments
- Book test drives
- Answer questions about inventory
- Provide parts information
- Route sales inquiries to sales team

Key Information:
- Service department hours
- Available inventory
- Parts availability
- Financing options
- Service specials

Be enthusiastic, knowledgeable, and customer-focused.`,
    greeting: "Thank you for calling [Dealership Name]! Whether you need service, sales, or parts, I'm here to help. What can I do for you today?",
    knowledgeTopics: [
      "Vehicle inventory and pricing",
      "Service department capabilities",
      "Parts catalog and pricing",
      "Financing and lease options",
      "Current promotions and specials"
    ]
  }
];

export default function IndustryTemplates() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Client.filter({ contact_email: user.email });
    },
    enabled: !!user,
  });

  const currentClient = clients[0];

  const createAgentMutation = useMutation({
    mutationFn: async (template) => {
      if (!currentClient?.id) {
        throw new Error("Please complete account setup first");
      }

      // Create agent from template
      const agent = await base44.entities.Agent.create({
        client_id: currentClient.id,
        name: `${template.name} Assistant`,
        description: template.description,
        agent_type: 'receptionist',
        system_prompt: template.systemPrompt,
        greeting_message: template.greeting,
        voice_provider: 'elevenlabs',
        voice_id: 'nova',
        language: 'en-US',
        personality: {
          formality: 60,
          friendliness: 70,
          verbosity: 50,
          empathy: 65
        },
        status: 'draft'
      });

      return agent;
    },
    onSuccess: (agent) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success("Agent created from template!");
      navigate(createPageUrl("AgentBuilder") + `?edit=${agent.id}`);
    },
  });

  const filteredTemplates = industryTemplates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Industry Templates</h1>
        <p className="text-slate-500 mt-2">
          Pre-built AI agents for specific industries - just customize and deploy
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-base"
        />
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900">No templates found</h3>
          <p className="text-slate-500">Try adjusting your search terms</p>
        </div>
      ) : (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <Card 
              key={template.id} 
              className="border-0 shadow-lg hover:shadow-xl transition-all group"
            >
              <CardHeader>
                <div className={cn(
                  "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 group-hover:scale-110 transition-transform",
                  template.color
                )}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Sample Greeting:</Label>
                  <p className="text-sm text-slate-700 italic bg-slate-50 p-3 rounded-lg">
                    "{template.greeting.substring(0, 120)}..."
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Includes:</Label>
                  <div className="space-y-1">
                    {template.knowledgeTopics.slice(0, 3).map((topic, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{topic}</span>
                      </div>
                    ))}
                    {template.knowledgeTopics.length > 3 && (
                      <p className="text-xs text-slate-400 pl-5">
                        +{template.knowledgeTopics.length - 3} more topics
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => createAgentMutation.mutate(template)}
                  disabled={createAgentMutation.isPending || !currentClient}
                  className={cn("w-full bg-gradient-to-r", template.color)}
                >
                  {createAgentMutation.isPending ? (
                    "Creating..."
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Use This Template
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}

      {/* Custom Template CTA */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardContent className="p-8 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-indigo-600" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">Need a Custom Template?</h3>
          <p className="text-slate-600 mb-6">
            Contact us to create a custom industry template for your specific needs
          </p>
          <Button className="bg-indigo-600">
            Request Custom Template
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}