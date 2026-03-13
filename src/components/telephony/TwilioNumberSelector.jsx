import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Phone, Search, Loader2, CheckCircle2, MapPin
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TwilioNumberSelector({ clientId, onNumberSelected }) {
  const [step, setStep] = useState(1);
  const [twilioAuth, setTwilioAuth] = useState({ accountSid: "", authToken: "" });
  const [useWorkspaceCreds, setUseWorkspaceCreds] = useState(false);
  const [searchParams, setSearchParams] = useState({ areaCode: "212", country: "US" });
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [mode, setMode] = useState('platform'); // 'platform' (AEVOICE credits) | 'byo' (own Twilio)
  const [platformSubmitted, setPlatformSubmitted] = useState(false);
  const [platformReason, setPlatformReason] = useState('');
  const [verification, setVerification] = useState({ businessName: '', website: '', address: '', useCase: 'general' });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [agentOptions, setAgentOptions] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  // Reset BYO fields when switching to platform mode
  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (newMode === 'platform') {
      setTwilioAuth({ accountSid: "", authToken: "" });
      setUseWorkspaceCreds(false);
      setStep(1);
    }
  };

  // Use service-role backend to bypass RLS — ensures agents are always visible
  useEffect(() => {
    if (clientId) {
      base44.functions.invoke('getMyAgents', {})
        .then((res) => {
          const list = res.data?.agents || [];
          setAgentOptions(list);
          if (!selectedAgentId && list?.[0]?.id) setSelectedAgentId(list[0].id);
        })
        .catch(console.error);
    }
  }, [clientId]);

  const searchNumbersMutation = useMutation({
    mutationFn: async (params) => {
      const payload = {
        area_code: params.areaCode,
        country: params.country,
        limit: 20,
      };
      if (!useWorkspaceCreds) {
        payload.account_sid = twilioAuth.accountSid;
        payload.auth_token = twilioAuth.authToken;
      }
      const response = await base44.functions.invoke('searchTwilioNumbers', payload);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.numbers && data.numbers.length > 0) {
        setAvailableNumbers(data.numbers);
        setStep(3);
      } else {
        toast.error("No numbers found. Try a different area code.");
      }
    },
    onError: () => {
      toast.error("Failed to search numbers. Check your Twilio credentials.");
    }
  });

  const requestPlatformMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('provisionPlatformNumber', {
        client_id: clientId,
        country: searchParams.country,
        area_code: searchParams.areaCode,
        agent_id: selectedAgentId,
        verification,
        accept_terms: termsAccepted
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.status === 'allocated') {
        toast.success('Number allocated: ' + (data?.phoneNumber?.number_e164 || ''));
        if (onNumberSelected) onNumberSelected(data.phoneNumber);
      } else {
        setPlatformSubmitted(true);
        setPlatformReason(data?.reason || '');
        if (data?.reason === 'platform_credentials_missing') {
          toast.success('Request submitted. Platform provisioning pending—AEVOICE platform credentials not configured yet.');
        } else if (data?.reason === 'platform_twilio_search_failed' || data?.reason === 'platform_twilio_purchase_failed') {
          toast.success('Request submitted. Provisioning queued due to provider availability—We’ll notify you when ready.');
        } else {
          toast.success('Request submitted. We’ll notify you when the number is ready.');
        }
      }
    },
    onError: (error) => {
      toast.error('Request failed: ' + (error?.response?.data?.error || error.message));
    }
  });

  const purchaseNumberMutation = useMutation({
    mutationFn: async (phoneNumber) => {
      const response = await base44.functions.invoke('purchaseTwilioNumber', {
        account_sid: useWorkspaceCreds ? undefined : twilioAuth.accountSid,
        auth_token: useWorkspaceCreds ? undefined : twilioAuth.authToken,
        phone_number: phoneNumber,
        client_id: clientId,
        agent_id: selectedAgentId
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Phone number purchased and configured!");
      if (onNumberSelected) onNumberSelected(data.phoneNumber);
    },
    onError: (error) => {
      toast.error("Purchase failed: " + error.message);
    }
  });

  const handleSearchNumbers = () => {
    searchNumbersMutation.mutate(searchParams);
  };

  const handlePurchase = () => {
    if (!selectedNumber) return;
    purchaseNumberMutation.mutate(selectedNumber.phoneNumber);
  };

  return (
    <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-indigo-600" />
          Get a Phone Number
        </CardTitle>
        <CardDescription>
          Choose AEVOICE platform (credits) or bring your own Twilio account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Choose provider mode</Label>
          <RadioGroup
            value={mode}
            onValueChange={handleModeChange}
            className="grid sm:grid-cols-2 gap-3"
          >
            <div className={cn(
              "flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
              mode === 'platform' 
                ? 'border-emerald-400 bg-emerald-50 shadow-md' 
                : 'border-slate-200 hover:border-emerald-200 bg-white'
            )}>
              <RadioGroupItem value="platform" id="mode-platform" />
              <Label htmlFor="mode-platform" className="cursor-pointer flex-1">
                <div className="font-semibold text-slate-900">AEVOICE Default</div>
                <div className="text-xs text-slate-600">Use platform credits</div>
              </Label>
              {mode === 'platform' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            </div>
            <div className={cn(
              "flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
              mode === 'byo' 
                ? 'border-indigo-400 bg-indigo-50 shadow-md' 
                : 'border-slate-200 hover:border-indigo-200 bg-white'
            )}>
              <RadioGroupItem value="byo" id="mode-byo" />
              <Label htmlFor="mode-byo" className="cursor-pointer flex-1">
                <div className="font-semibold text-slate-900">Use My Twilio</div>
                <div className="text-xs text-slate-600">SID/Auth Token required</div>
              </Label>
              {mode === 'byo' && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
            </div>
          </RadioGroup>
        </div>
        {/* Platform Mode: AEVOICE credits, no keys needed */}
        {mode === 'platform' && (
          <div className="space-y-4">
            {platformSubmitted ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900">
                  <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="w-4 h-4" />Request submitted</div>
                  <p className="text-sm mt-1">
                    {platformReason === 'platform_credentials_missing'
                      ? 'Platform credentials are not configured yet; our team will complete provisioning and your Base44 credits will be used.'
                      : `We’re provisioning a number for ${searchParams.country}. You’ll see it appear in Phone Numbers and be billed per your plan.`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => onNumberSelected && onNumberSelected(null)}>Close</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 text-sm">
                  Numbers are billed to your AEVOICE plan (per-minute, per your subscription). No provider keys required.
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select value={searchParams.country} onValueChange={(v) => setSearchParams({ ...searchParams, country: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="GB">United Kingdom</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                        <SelectItem value="IN">India</SelectItem>
                        <SelectItem value="SG">Singapore</SelectItem>
                        <SelectItem value="DE">Germany</SelectItem>
                        <SelectItem value="FR">France</SelectItem>
                        <SelectItem value="ES">Spain</SelectItem>
                        <SelectItem value="IT">Italy</SelectItem>
                        <SelectItem value="NL">Netherlands</SelectItem>
                        <SelectItem value="SE">Sweden</SelectItem>
                        <SelectItem value="NO">Norway</SelectItem>
                        <SelectItem value="DK">Denmark</SelectItem>
                        <SelectItem value="IE">Ireland</SelectItem>
                        <SelectItem value="NZ">New Zealand</SelectItem>
                        <SelectItem value="ZA">South Africa</SelectItem>
                        <SelectItem value="BR">Brazil</SelectItem>
                        <SelectItem value="MX">Mexico</SelectItem>
                        <SelectItem value="JP">Japan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Area Code (Optional)</Label>
                    <Input
                      placeholder="e.g., 415, 212"
                      value={searchParams.areaCode}
                      onChange={(e) => setSearchParams({ ...searchParams, areaCode: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business / Entity Name</Label>
                    <Input
                      placeholder="Your company legal name"
                      value={verification.businessName}
                      onChange={(e) => setVerification({ ...verification, businessName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website (optional)</Label>
                    <Input
                      placeholder="https://example.com"
                      value={verification.website}
                      onChange={(e) => setVerification({ ...verification, website: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Registered Address</Label>
                  <Input
                    placeholder="Street, City, State, Postal, Country"
                    value={verification.address}
                    onChange={(e) => setVerification({ ...verification, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assign to Agent</Label>
                  <Select value={selectedAgentId} onValueChange={(v) => setSelectedAgentId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agentOptions.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name || 'Agent'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Use Case</Label>
                  <Select value={verification.useCase} onValueChange={(v) => setVerification({ ...verification, useCase: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select use case" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receptionist">Receptionist / Main line</SelectItem>
                      <SelectItem value="sales">Sales / Outreach</SelectItem>
                      <SelectItem value="support">Support / Helpdesk</SelectItem>
                      <SelectItem value="notifications">Notifications / Reminders</SelectItem>
                      <SelectItem value="general">General purpose</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(v) => setTermsAccepted(!!v)} />
                  <Label htmlFor="terms" className="text-sm text-slate-600">
                    I agree to AEVOICE telephony terms and certify the information provided is accurate and compliant with local regulations.
                  </Label>
                </div>
                <div className="text-xs text-slate-500">
                  Billing: number rental + per-minute usage will be charged against your AEVOICE plan credits/minutes. Overages follow your plan rates.
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => requestPlatformMutation.mutate()}
                    disabled={requestPlatformMutation.isPending || !clientId || !termsAccepted || !verification.businessName || !verification.address || !selectedAgentId}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {requestPlatformMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting Request...
                      </>
                    ) : (
                      'Request & Auto-Allocate'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 1: Twilio Credentials (BYO) */}
        {mode === 'byo' && step === 1 && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                You'll need your Twilio Account SID and Auth Token from{' '}
                <a href="https://console.twilio.com" target="_blank" className="underline font-medium" rel="noreferrer">
                  Twilio Console
                </a>
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Checkbox id="workspace-creds" checked={useWorkspaceCreds} onCheckedChange={(v) => setUseWorkspaceCreds(!!v)} />
              <Label htmlFor="workspace-creds" className="text-sm text-slate-700">Use workspace Twilio credentials (saved in secrets)</Label>
            </div>
            <div className="space-y-2">
              <Label>Twilio Account SID</Label>
              <Input
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={twilioAuth.accountSid}
                onChange={(e) => setTwilioAuth({ ...twilioAuth, accountSid: e.target.value })}
                disabled={useWorkspaceCreds}
              />
            </div>
            <div className="space-y-2">
              <Label>Twilio Auth Token</Label>
              <Input
                type="password"
                placeholder="Your auth token"
                value={twilioAuth.authToken}
                onChange={(e) => setTwilioAuth({ ...twilioAuth, authToken: e.target.value })}
                disabled={useWorkspaceCreds}
              />
            </div>
            <Button 
              onClick={() => setStep(2)}
              disabled={!(useWorkspaceCreds || (twilioAuth.accountSid && twilioAuth.authToken))}
              className="w-full bg-indigo-600"
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Search Parameters (BYO) */}
        {mode === 'byo' && step === 2 && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={searchParams.country} onValueChange={(v) => setSearchParams({ ...searchParams, country: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                    <SelectItem value="SG">Singapore</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="ES">Spain</SelectItem>
                    <SelectItem value="IT">Italy</SelectItem>
                    <SelectItem value="NL">Netherlands</SelectItem>
                    <SelectItem value="SE">Sweden</SelectItem>
                    <SelectItem value="NO">Norway</SelectItem>
                    <SelectItem value="DK">Denmark</SelectItem>
                    <SelectItem value="IE">Ireland</SelectItem>
                    <SelectItem value="NZ">New Zealand</SelectItem>
                    <SelectItem value="ZA">South Africa</SelectItem>
                    <SelectItem value="BR">Brazil</SelectItem>
                    <SelectItem value="MX">Mexico</SelectItem>
                    <SelectItem value="JP">Japan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Area Code (Optional)</Label>
                <Input
                  placeholder="e.g., 415, 212"
                  value={searchParams.areaCode}
                  onChange={(e) => setSearchParams({ ...searchParams, areaCode: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleSearchNumbers}
                disabled={searchNumbersMutation.isPending}
                className="flex-1 bg-indigo-600"
              >
                {searchNumbersMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search Numbers
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Select Number (BYO) */}
        {mode === 'byo' && step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Select a phone number to purchase:</p>
            <RadioGroup value={selectedNumber?.phoneNumber} onValueChange={(val) => {
              const num = availableNumbers.find(n => n.phoneNumber === val);
              setSelectedNumber(num);
            }}>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableNumbers.map((number) => (
                  <div 
                    key={number.phoneNumber}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      selectedNumber?.phoneNumber === number.phoneNumber
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <RadioGroupItem value={number.phoneNumber} id={number.phoneNumber} />
                    <Label htmlFor={number.phoneNumber} className="flex-1 cursor-pointer">
                      <p className="font-mono font-medium text-slate-900">{number.friendlyName || number.phoneNumber}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="w-3 h-3 mr-1" />
                          {number.locality || number.region}
                        </Badge>
                        {number.capabilities?.voice && (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700">Voice</Badge>
                        )}
                        {number.capabilities?.SMS && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">SMS</Badge>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Assign to Agent</Label>
                <Select value={selectedAgentId} onValueChange={(v) => setSelectedAgentId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name || 'Agent'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Back
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    disabled={!selectedNumber || !selectedAgentId || purchaseNumberMutation.isPending}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {purchaseNumberMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Purchasing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Purchase Number
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are about to purchase {selectedNumber?.friendlyName || selectedNumber?.phoneNumber}. Approx. cost: $1-$2/month plus usage. Proceed?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurchase}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}