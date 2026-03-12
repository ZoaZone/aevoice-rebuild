import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Check,
  Star,
  Zap,
  Phone,
  Clock,
  ArrowRight,
  Sparkles,
  Shield,
  Headphones,
  Crown,
  Building2,
  FileAudio,
  X,
  Plus,
  Globe,
  AlertTriangle,
  RefreshCw,
  FileText,
  Mail
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function Pricing() {
    const [isAnnual, setIsAnnual] = useState(false);
    const [loading, setLoading] = useState(null);
    const [showCustomQuote, setShowCustomQuote] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    // Check for payment success from Stripe redirect
    useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('success') === 'true') {
        setPaymentSuccess(true);
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          window.location.href = createPageUrl("Dashboard");
        }, 3000);
      }
    }, []);
  const [customQuote, setCustomQuote] = useState({
    companyName: "",
    email: "",
    phone: "",
    estimatedMinutes: 10000,
    multiplier: 1,
    includeRecording: false,
    recordingRetention: "monthly", // daily, weekly, monthly
    transferToServer: false,
    serverDetails: "",
    requirements: ""
  });

  // Products are hardcoded below - no need to fetch from Stripe for display

  // Recording add-on prices
  const recordingAddons = {
    regular: 50, // $50 for regular plans
    mega: 0.10   // 10% of $1000 = $100
  };

  const plans = [
            {
              id: 'sri-plan',
              name: 'Sri Plan',
              description: 'Website Voice Assistant - Standalone Platform',
              price: 10,
              priceId: 'price_sri_monthly',
              stripeProductId: 'prod_sri',
              credits: 0,
              features: [
                'Embed AI on your website',
                'Auto-learn from your site',
                'Handle tasks within site',
                'Voice + Chat interface',
                'Works independently',
                'No phone system needed',
                '$10/mo or $50 one-time',
                'Uses credits at $0.12/min'
              ],
              special: true,
              color: 'from-purple-500 to-pink-600',
              logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg'
            },
            {
              id: 'aeva-mini',
              name: 'Aeva Mini',
              description: 'Perfect for small businesses with low call volume',
              price: 100,
              priceId: 'price_1SYvuWLh1QiuPaDbfpWQmbOO',
              stripeProductId: 'prod_TVxq1n0d5MhReA',
              credits: 300,
              features: [
                '300 voice minutes included',
                '1 AI Agent',
                'Attach up to 1 Phone Number',
                'Basic analytics',
                'Email support',
                'BYO Twilio integration',
                '20+ AI voice options',
                '+ Voice Chatbot addon available ($10/mo or $50 one-time)'
              ],
              recordingAddon: 25,
              color: 'from-[#8b9dc3] to-[#a8b5cf]',
              logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/c0440c7bb_IMG_5882.PNG'
            },
            {
              id: 'aeva-micro',
              name: 'Aeva Micro',
              description: 'For growing businesses with moderate usage',
              price: 35,
              priceId: 'price_1SYw1uLh1QiuPaDb51go7mCS',
              stripeProductId: 'prod_TVxxwfEbBqZAuW',
              credits: 0, // Pay as you go
              features: [
                'Pay-as-you-go credits ($0.15/min)',
                '3 AI Agents',
                'Attach up to 2 Phone Numbers',
                'Advanced analytics',
                'Priority support',
                'Multi-language support',
                'IVR menus',
                'Premium ElevenLabs voices',
                '+ Voice Chatbot addon available ($10/mo or $50 one-time)'
              ],
              recordingAddon: 25,
              popular: true,
              color: 'from-[#8b9dc3] to-[#a8b5cf]',
              logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/fc03c9ad7_IMG_5883.PNG'
            },
            {
              id: 'aeva-medium',
              name: 'Aeva Medium',
              description: 'For large organizations with heavy usage',
              price: 250,
              priceId: 'price_1SYw9DLh1QiuPaDbBT0WebLM',
              stripeProductId: 'prod_TVy5DBBxJVEBks',
              credits: 1666,
              features: [
                '1,666 voice minutes ($0.15/min)',
                'Unlimited AI Agents',
                'Attach Unlimited Phone Numbers',
                'API access',
                'Dedicated support',
                'All premium voices',
                '✨ Sri Assistant (Website AI) INCLUDED',
                'Chatbot uses plan credits at $0.12/min'
              ],
              recordingAddon: 25,
              color: 'from-[#4a7cc9] to-[#5c8fd6]',
              logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/0b561957e_IMG_5884.PNG'
            },
            {
              id: 'aeva-mega',
              name: 'Aeva Mega',
              description: 'For large enterprises with high volume needs',
              price: 1000,
              priceId: 'price_1SYwSuLh1QiuPaDbzolpuQAb',
              stripeProductId: 'prod_TVyPTaOZXhO7PL',
              credits: 7000,
              features: [
                '7,000+ voice minutes ($0.1425/min)',
                'Unlimited AI Agents',
                'Attach Unlimited Phone Numbers',
                'Full API access',
                'Dedicated account manager',
                'Voice cloning access',
                'Priority processing',
                '5% discount on credits',
                '✨ Sri Assistant (Website AI) INCLUDED',
                'Chatbot uses plan credits at $0.12/min'
              ],
              recordingAddon: 100, // 10% of $1000
              color: 'from-[#0033a0] to-[#0052cc]',
              logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/4ed2a541f_IMG_5885.PNG',
              mega: true
            }
          ];

  /*
   * RECORDING & TRANSCRIPTION COST ANALYSIS
   * ========================================
   * 
   * YOUR COSTS (per minute of recording):
   * - Whisper API (transcription): ~$0.006/min
   * - Cloud storage (S3/GCS): ~$0.001/min (negligible)
   * - Processing overhead: ~$0.003/min
   * - Total cost per minute: ~$0.01/min
   * 
   * PRICING TO CLIENTS:
   * - Regular plans (Beginner/Starter/Enterprise): +$50/month
   *   → Break-even at 5,000 minutes recorded
   *   → Profit if usage < 5,000 min/month
   * 
   * - Mega Plan: +$100/month (10% of $1000)
   *   → Break-even at 10,000 minutes recorded
   *   → Profit if usage < 10,000 min/month
   * 
   * RECOMMENDATION:
   * - $50/mo is good for low-medium volume (profitable)
   * - Consider $30/mo for Beginner (300 min = $3 cost)
   * - $100/mo for Mega is generous margin
   */

  // Calculate custom quote pricing
  const calculateCustomPrice = () => {
    const basePrice = 1000 * customQuote.multiplier;
    const creditPrice = 0.1425; // 5% discount from $0.15
    const totalMinutes = 7000 * customQuote.multiplier;
    const recordingCost = basePrice * 0.10; // 10% for recording
    return {
      basePrice,
      creditPrice,
      totalMinutes,
      recordingCost,
      totalWithRecording: basePrice + recordingCost
    };
  };

  const handleCustomQuoteSubmit = async () => {
    setLoading('custom');
    try {
      const totalPrice = (1000 * customQuote.multiplier) + (customQuote.includeRecording ? 100 * customQuote.multiplier : 0);
      
      await base44.integrations.Core.SendEmail({
        to: customQuote.email,
        subject: `Your Aeva Mega Plan Quote - $${totalPrice.toLocaleString()}/mo`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #e11d48, #ec4899); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">🚀 Your Aeva Mega Plan</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
              <h2>Hi ${customQuote.companyName},</h2>
              <p>Thank you for choosing AEVOICE! Here's your custom package summary:</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">📦 Package Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; color: #64748b;">Package Size:</td><td style="text-align: right; font-weight: bold;">${customQuote.multiplier}x ($${(1000 * customQuote.multiplier).toLocaleString()}/mo)</td></tr>
                  <tr><td style="padding: 8px 0; color: #64748b;">Voice Minutes:</td><td style="text-align: right; font-weight: bold;">~${(7000 * customQuote.multiplier).toLocaleString()} min/mo</td></tr>
                  <tr><td style="padding: 8px 0; color: #64748b;">Credit Rate:</td><td style="text-align: right; font-weight: bold; color: #10b981;">$0.1425/min (5% off)</td></tr>
                  ${customQuote.includeRecording ? `
                  <tr><td style="padding: 8px 0; color: #64748b;">Recording Add-on:</td><td style="text-align: right; font-weight: bold;">+$${(100 * customQuote.multiplier).toLocaleString()}/mo</td></tr>
                  <tr><td style="padding: 8px 0; color: #64748b;">Retention Policy:</td><td style="text-align: right; font-weight: bold; text-transform: capitalize;">${customQuote.recordingRetention}</td></tr>
                  <tr><td style="padding: 8px 0; color: #64748b;">Server Transfer:</td><td style="text-align: right; font-weight: bold;">${customQuote.transferToServer ? 'Yes' : 'No'}</td></tr>
                  ` : ''}
                  <tr style="border-top: 2px solid #e2e8f0;"><td style="padding: 12px 0; font-weight: bold; font-size: 18px;">Total Monthly:</td><td style="text-align: right; font-weight: bold; font-size: 24px; color: #6366f1;">$${totalPrice.toLocaleString()}/mo</td></tr>
                </table>
              </div>

              ${customQuote.includeRecording ? `
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;"><strong>📁 Recording Policy:</strong> You'll receive email reminders 3 days before auto-deletion. After 30 days, all recordings are permanently deleted unless transferred to your server.</p>
              </div>
              ` : ''}

              <p>Our team will contact you within 24 hours to finalize your setup.</p>
              
              <p>Best regards,<br><strong>AEVOICE Team</strong></p>
            </div>
          </div>
        `
      });

      // Also send to admin
      await base44.integrations.Core.SendEmail({
        to: "admin@nexvoice.ai",
        subject: `🔔 New Aeva Mega Request - ${customQuote.companyName} - $${totalPrice.toLocaleString()}/mo`,
        body: `
          <h2>New Mega Plan Quote Request</h2>
          <p><strong>Company:</strong> ${customQuote.companyName}</p>
          <p><strong>Email:</strong> ${customQuote.email}</p>
          <p><strong>Phone:</strong> ${customQuote.phone || 'Not provided'}</p>
          <hr>
          <h3>Package Configuration:</h3>
          <p><strong>Multiplier:</strong> ${customQuote.multiplier}x</p>
          <p><strong>Base Price:</strong> $${(1000 * customQuote.multiplier).toLocaleString()}/mo</p>
          <p><strong>Voice Minutes:</strong> ~${(7000 * customQuote.multiplier).toLocaleString()}</p>
          <p><strong>Recording Add-on:</strong> ${customQuote.includeRecording ? `Yes (+$${(100 * customQuote.multiplier).toLocaleString()}/mo)` : 'No'}</p>
          ${customQuote.includeRecording ? `
          <p><strong>Retention Policy:</strong> ${customQuote.recordingRetention}</p>
          <p><strong>Server Transfer:</strong> ${customQuote.transferToServer ? 'Yes' : 'No'}</p>
          ${customQuote.serverDetails ? `<p><strong>Server Details:</strong> ${customQuote.serverDetails}</p>` : ''}
          ` : ''}
          <p><strong>Total Monthly:</strong> $${totalPrice.toLocaleString()}</p>
          <hr>
          <p><strong>Requirements:</strong></p>
          <p>${customQuote.requirements || 'None specified'}</p>
        `
      });

      setShowCustomQuote(false);
      alert("Quote submitted! Check your email for confirmation. Our team will contact you within 24 hours.");
    } catch (error) {
      console.error(error);
      alert("Error submitting quote. Please try again.");
    }
    setLoading(null);
  };

  // Stripe Payment Links (FREE - no custom domain needed)
  const paymentLinks = {
    'aeva-mini': 'https://buy.stripe.com/6oU4gAchEgey1LLev82ZO0b',
    'aeva-micro': 'https://buy.stripe.com/dRm5kEdlI2nIdut72G2ZO0a',
    'aeva-medium': 'https://buy.stripe.com/00w3cw4Pc6DYdutev82ZO09',
    'aeva-mega': 'https://buy.stripe.com/dRm28sepM8M6bml4Uy2ZO07',
    'recording-addon': 'https://buy.stripe.com/bJeeVedlI1jE4XX1Im2ZO08',
  };

  const handleSubscribe = (planId) => {
    setLoading(planId);
    
    const paymentLink = paymentLinks[planId];
    
    if (paymentLink) {
      // Open in new tab (works better from iframe)
      window.open(paymentLink, '_blank');
      setLoading(null);
    } else {
      alert("Payment link not configured. Please contact care@aevoice.ai");
      setLoading(null);
    }
  };

  // Show success message if payment completed
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Card className="max-w-md text-center border-0 shadow-xl">
          <CardContent className="py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
            <p className="text-slate-600 mb-6">
              Thank you for subscribing to AEVOICE. Redirecting to your dashboard...
            </p>
            <Link to={createPageUrl("Dashboard")}>
              <Button className="bg-[#0e4166] hover:bg-[#0a2540]">
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl("Home")} className="flex items-center gap-3">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG" 
              alt="AEVOICE" 
              className="w-10 h-10 rounded-xl object-cover"
            />
            <span className="font-bold text-xl text-slate-900">AEVOICE</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
                Home
              </Button>
            </Link>
            <Link to={createPageUrl("Dashboard")}>
              <Button className="bg-[#0e4166] hover:bg-[#0a2540]">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center pt-12 pb-12 px-4">
        <div className="flex justify-center mb-6">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/bf537c7c7_AevoiceLogo.JPG" 
                  alt="AEVOICE" 
                  className="w-24 h-24 rounded-2xl object-cover shadow-lg"
                />
              </div>
              <Badge className="mb-4 bg-[#0e4166]/10 text-[#0e4166] border-[#0e4166]/20 py-2 px-3">
                <Sparkles className="w-3 h-3 mr-2" />
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/e41d7c8f7_IMG_5886.jpg" 
                  alt="AEVOICE" 
                  className="h-4 object-contain inline-block mr-1"
                />
                <span>- Simple, Transparent Pricing</span>
              </Badge>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Start with a plan that fits your needs. Scale up as you grow.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <span className={cn("text-sm", !isAnnual ? "text-slate-900 font-medium" : "text-slate-500")}>
            Monthly
          </span>
          <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
          <span className={cn("text-sm", isAnnual ? "text-slate-900 font-medium" : "text-slate-500")}>
            Annual
            <Badge className="ml-2 bg-emerald-100 text-emerald-700 text-xs">Save 10%</Badge>
          </span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
          {plans.map((plan) => {
            const displayPrice = isAnnual ? Math.round(plan.price * 0.9) : plan.price;

            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative border-2 transition-all duration-300 hover:shadow-xl",
                  plan.popular
                    ? "border-[#0e4166] shadow-lg shadow-[#0e4166]/20 scale-105"
                    : plan.mega
                    ? "border-[#0033a0] shadow-lg shadow-[#0033a0]/20"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#0e4166] text-white px-4 py-1 shadow-lg">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                {plan.special && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-1 shadow-lg">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Website AI
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pt-8">
                  <div className={cn(
                    "w-20 h-20 mx-auto mb-4",
                    plan.special && "rounded-full border-4 border-purple-500/30 shadow-lg shadow-purple-500/50"
                  )}>
                    <img 
                      src={plan.logo} 
                      alt={plan.name}
                      className={cn(
                        "w-full h-full",
                        plan.special ? "object-cover rounded-full" : "object-contain"
                      )}
                    />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <p className="text-slate-500 text-sm mt-2">{plan.description}</p>
                </CardHeader>

                <CardContent className="pt-4">
                  <div className="text-center mb-8">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold text-slate-900">${displayPrice}</span>
                      <span className="text-slate-500">/month</span>
                    </div>
                    {isAnnual && (
                      <p className="text-sm text-emerald-600 mt-1">
                        Billed ${displayPrice * 12}/year
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Recording Add-on */}
                  {plan.recordingAddon && (
                    <div className="p-3 bg-slate-50 rounded-lg mb-6">
                      <div className="flex items-center gap-2 text-sm">
                        <FileAudio className="w-4 h-4 text-indigo-600" />
                        <span className="font-medium">Recording & Transcription</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        +${plan.recordingAddon}/mo {plan.mega && "(10% of package)"}
                      </p>
                    </div>
                  )}

                  {plan.mega ? (
                    <div className="space-y-2">
                      <Button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={loading === plan.id}
                        className="w-full py-5 text-base font-semibold bg-gradient-to-r from-[#0033a0] to-[#0052cc] hover:from-[#002080] hover:to-[#0044aa]"
                      >
                        {loading === plan.id ? "Redirecting..." : (
                          <>
                            Subscribe Now
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCustomQuote(true)}
                        className="w-full py-4 text-sm font-medium border-[#0033a0]/30 text-[#0033a0] hover:bg-[#0033a0]/5"
                      >
                        Need More? Custom Quote
                      </Button>
                    </div>
                  ) : plan.special ? (
                    <Link to={createPageUrl("VoiceChatbotPlans")}>
                      <Button
                        className="w-full py-5 text-base font-semibold bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500"
                      >
                        View Sri Plans
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loading === plan.id}
                      className={cn(
                        "w-full py-5 text-base font-semibold",
                        plan.popular
                          ? "bg-gradient-to-r from-[#0e4166] to-cyan-600 hover:from-[#0a2540] hover:to-cyan-700 shadow-lg shadow-cyan-500/25"
                          : "bg-[#0e4166] hover:bg-[#0a2540]"
                      )}
                    >
                      {loading === plan.id ? "Redirecting..." : (
                        <>
                          Get Started
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <p className="text-slate-500 mb-6">Trusted by businesses worldwide</p>
          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex items-center gap-2 text-slate-600">
              <Shield className="w-5 h-5 text-emerald-500" />
              <span>SSL Secured</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-5 h-5 text-blue-500" />
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Headphones className="w-5 h-5 text-purple-500" />
              <span>99.9% Uptime</span>
            </div>
          </div>
        </div>

        {/* Custom Enterprise Section */}
        <Card className="mt-12 border-2 border-[#0e4166]/20 bg-gradient-to-r from-[#0e4166]/5 to-cyan-50">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0e4166] to-cyan-600 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Custom Enterprise Solution</h3>
                  <p className="text-slate-600">
                    Unlimited usage for MNCs & large organizations. $1,000 packages with 5% credit discount.
                  </p>
                </div>
              </div>
              <a href="mailto:care@aevoice.ai?subject=Enterprise%20Plan%20Inquiry" className="inline-block">
                <Button 
                  size="lg"
                  className="bg-[#0e4166] hover:bg-[#0a2540]"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Sales
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Voice Chatbot Information */}
        <Card className="mt-8 border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-lg mb-2">Website Voice Chatbot Options</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <p className="font-semibold text-slate-900 mb-1">Mini & Micro Plans</p>
                    <p className="text-slate-600">Optional addon: $10/mo or $50 one-time. Uses credits at $0.12/min.</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <p className="font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      Medium Plan
                    </p>
                    <p className="text-slate-600">Voice Chatbot INCLUDED FREE. Uses plan credits at $0.12/min.</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <p className="font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      Mega Plan
                    </p>
                    <p className="text-slate-600">Voice Chatbot INCLUDED FREE. Uses plan credits at $0.12/min.</p>
                  </div>
                </div>
                <Link to={createPageUrl("VoiceChatbotPlans")} className="inline-block mt-4">
                  <Button variant="outline" className="border-purple-500 text-purple-700 hover:bg-purple-50">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    View Voice Chatbot Plans
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Transfer Policy */}
        <Card className="mt-6 border-2 border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Credit Transfer Policy</h3>
                <p className="text-slate-600 text-sm">
                  <strong>Unused credits never expire!</strong> You can transfer unused credits to a different plan 
                  or to another account within the AEVOICE platform. Credits are non-refundable but fully transferable.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal Disclaimers */}
        <Card className="mt-6 border border-amber-200 bg-amber-50/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Important Terms & Disclaimers
                </h3>
                <div className="text-sm text-slate-600 space-y-2">
                  <p>
                    <strong>Telephony Provider Responsibility:</strong> Phone numbers are obtained from third-party 
                    providers (e.g., Twilio). All telecom regulations, compliance, usage policies, and associated 
                    charges are governed by the agreement between you (the user) and your chosen telephony provider. 
                    AEVOICE acts solely as an intermediary platform connecting your AI agents to your telephony services.
                  </p>
                  <p>
                    <strong>SaaS Terms:</strong> AEVOICE is a Software-as-a-Service (SaaS) platform. All purchases 
                    are final and non-refundable. By subscribing, you agree to our Terms of Service and acknowledge 
                    that refunds are not available for subscription fees or purchased credits.
                  </p>
                  <p>
                    <strong>Compliance:</strong> You are responsible for ensuring your use of AI voice agents complies 
                    with all applicable laws, including TCPA, GDPR, and local telemarketing regulations.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Link */}
        <div className="mt-12 text-center">
          <p className="text-slate-600">
            Have questions?{" "}
            <Link to={createPageUrl("HelpCenter")} className="text-indigo-600 hover:underline font-medium">
              Check our FAQ
            </Link>
          </p>
        </div>

        {/* Company Info */}
        <div className="mt-8 pt-8 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            AEVOICE is a product of <strong>Zoa Zone Services LLC, USA</strong>
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Contact us: <a href="mailto:care@aevoice.ai" className="text-[#0e4166] hover:underline font-medium">care@aevoice.ai</a>
          </p>
        </div>
        </div>

      {/* Custom Mega Plan Configurator Dialog */}
      <Dialog open={showCustomQuote} onOpenChange={setShowCustomQuote}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#0033a0]" />
            Aeva Mega Configurator
            </DialogTitle>
            <DialogDescription>
              Build your custom enterprise package. Unlimited scalability with 5% credit discount.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Company Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input
                  placeholder="Acme Corporation"
                  value={customQuote.companyName}
                  onChange={(e) => setCustomQuote({ ...customQuote, companyName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Business Email *</Label>
                <Input
                  type="email"
                  placeholder="contact@company.com"
                  value={customQuote.email}
                  onChange={(e) => setCustomQuote({ ...customQuote, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="+1 (555) 000-0000"
                  value={customQuote.phone}
                  onChange={(e) => setCustomQuote({ ...customQuote, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Package Multiplier */}
            <Card className="border-2 border-[#0033a0]/20 bg-[#0033a0]/5">
              <CardContent className="p-4">
                <Label className="text-base font-semibold">Package Size</Label>
                <p className="text-xs text-slate-500 mb-4">
                  Each $1,000 package = ~7,000 minutes at $0.1425/min (5% discount)
                </p>
                <div className="flex items-center justify-center gap-6">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCustomQuote({ ...customQuote, multiplier: Math.max(1, customQuote.multiplier - 1) })}
                    className="h-12 w-12"
                  >
                    -
                  </Button>
                  <div className="text-center min-w-[150px]">
                    <p className="text-4xl font-bold text-[#0033a0]">{customQuote.multiplier}x</p>
                    <p className="text-lg font-medium text-slate-700">${(1000 * customQuote.multiplier).toLocaleString()}/month</p>
                    <p className="text-sm text-slate-500">~{(7000 * customQuote.multiplier).toLocaleString()} minutes</p>
                  </div>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCustomQuote({ ...customQuote, multiplier: customQuote.multiplier + 1 })}
                    className="h-12 w-12"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recording & Transcription Add-on */}
            <Card className={cn(
              "border-2 transition-all",
              customQuote.includeRecording ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <FileAudio className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">Recording & Transcription</Label>
                      <p className="text-sm text-slate-500">+${(100 * customQuote.multiplier).toLocaleString()}/mo (10% of package)</p>
                    </div>
                  </div>
                  <Switch
                    checked={customQuote.includeRecording}
                    onCheckedChange={(checked) => setCustomQuote({ ...customQuote, includeRecording: checked })}
                  />
                </div>

                {customQuote.includeRecording && (
                  <div className="space-y-4 pt-4 border-t">
                    {/* Retention Policy */}
                    <div className="space-y-2">
                      <Label>Auto-Delete Schedule</Label>
                      <p className="text-xs text-slate-500">Recordings will be automatically deleted after this period. You'll receive a reminder 3 days before deletion.</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'daily', label: 'Daily', desc: '24 hours' },
                          { value: 'weekly', label: 'Weekly', desc: '7 days' },
                          { value: 'monthly', label: 'Monthly', desc: '30 days' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setCustomQuote({ ...customQuote, recordingRetention: option.value })}
                            className={cn(
                              "p-3 rounded-lg border-2 text-center transition-all",
                              customQuote.recordingRetention === option.value
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-slate-200 hover:border-slate-300"
                            )}
                          >
                            <p className="font-medium">{option.label}</p>
                            <p className="text-xs text-slate-500">{option.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Transfer to Server Option */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Transfer to Your Server</Label>
                          <p className="text-xs text-slate-500">Auto-transfer recordings to your designated server/desktop</p>
                        </div>
                        <Switch
                          checked={customQuote.transferToServer}
                          onCheckedChange={(checked) => setCustomQuote({ ...customQuote, transferToServer: checked })}
                        />
                      </div>
                      {customQuote.transferToServer && (
                        <Textarea
                          placeholder="Enter your server details (SFTP/S3/Azure Blob/API endpoint)..."
                          value={customQuote.serverDetails}
                          onChange={(e) => setCustomQuote({ ...customQuote, serverDetails: e.target.value })}
                          rows={2}
                          className="mt-2"
                        />
                      )}
                    </div>

                    {/* Info Box */}
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-800">
                        <strong>Note:</strong> You'll receive an email reminder with download link 3 days before auto-deletion. 
                        After 30 days, all recordings are permanently deleted unless transferred to your server.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="bg-slate-900 text-white">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Your Custom Package Summary
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-slate-400">Base Package:</p>
                  <p className="font-medium">${(1000 * customQuote.multiplier).toLocaleString()}/mo</p>
                  <p className="text-slate-400">Voice Minutes:</p>
                  <p className="font-medium">~{(7000 * customQuote.multiplier).toLocaleString()} min</p>
                  <p className="text-slate-400">Credit Rate:</p>
                  <p className="font-medium text-emerald-400">$0.1425/min (5% off)</p>
                  {customQuote.includeRecording && (
                    <>
                      <p className="text-slate-400">Recording Add-on:</p>
                      <p className="font-medium">+${(100 * customQuote.multiplier).toLocaleString()}/mo</p>
                      <p className="text-slate-400">Retention:</p>
                      <p className="font-medium capitalize">{customQuote.recordingRetention}</p>
                    </>
                  )}
                  <div className="col-span-2 border-t border-slate-700 my-2"></div>
                  <p className="text-white font-semibold">Total Monthly:</p>
                  <p className="text-xl font-bold text-emerald-400">
                    ${((1000 * customQuote.multiplier) + (customQuote.includeRecording ? 100 * customQuote.multiplier : 0)).toLocaleString()}/mo
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Additional Requirements */}
            <div className="space-y-2">
              <Label>Additional Requirements</Label>
              <Textarea
                placeholder="Tell us about your use case, integration needs, compliance requirements..."
                value={customQuote.requirements}
                onChange={(e) => setCustomQuote({ ...customQuote, requirements: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCustomQuote(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCustomQuoteSubmit}
              disabled={loading === 'custom' || !customQuote.companyName || !customQuote.email}
              className="bg-gradient-to-r from-[#0033a0] to-[#0052cc] hover:from-[#002080] hover:to-[#0044aa]"
            >
              {loading === 'custom' ? "Submitting..." : "Submit & Get Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}