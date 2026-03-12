import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Phone, Search, Loader2, CheckCircle2, MapPin, Globe } from "lucide-react";
import { toast } from "sonner";

export default function TwilioNumberSelector({ clientId, onNumberSelected }) {
  const [step, setStep] = useState(1);
  const [twilioAuth, setTwilioAuth] = useState({ accountSid: "", authToken: "" });
  const [searchParams, setSearchParams] = useState({ areaCode: "", country: "US" });
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [searchingNumbers, setSearchingNumbers] = useState(false);

  const searchNumbersMutation = useMutation({
    mutationFn: async (params) => {
      const response = await base44.functions.invoke('searchTwilioNumbers', {
        account_sid: twilioAuth.accountSid,
        auth_token: twilioAuth.authToken,
        area_code: params.areaCode,
        country: params.country
      });
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

  const purchaseNumberMutation = useMutation({
    mutationFn: async (phoneNumber) => {
      const response = await base44.functions.invoke('purchaseTwilioNumber', {
        account_sid: twilioAuth.accountSid,
        auth_token: twilioAuth.authToken,
        phone_number: phoneNumber,
        client_id: clientId
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
    setSearchingNumbers(true);
    searchNumbersMutation.mutate(searchParams);
  };

  const handlePurchase = () => {
    if (!selectedNumber) return;
    purchaseNumberMutation.mutate(selectedNumber.phoneNumber);
  };

  return (
    <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-indigo-600" />
          Get Twilio Number (Beta)
        </CardTitle>
        <CardDescription>
          Purchase and configure a phone number directly from Twilio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Twilio Credentials */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                You'll need your Twilio Account SID and Auth Token from{" "}
                <a href="https://console.twilio.com" target="_blank" className="underline font-medium">
                  Twilio Console
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Twilio Account SID</Label>
              <Input
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={twilioAuth.accountSid}
                onChange={(e) => setTwilioAuth({ ...twilioAuth, accountSid: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Twilio Auth Token</Label>
              <Input
                type="password"
                placeholder="Your auth token"
                value={twilioAuth.authToken}
                onChange={(e) => setTwilioAuth({ ...twilioAuth, authToken: e.target.value })}
              />
            </div>
            <Button 
              onClick={() => setStep(2)}
              disabled={!twilioAuth.accountSid || !twilioAuth.authToken}
              className="w-full bg-indigo-600"
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Search Parameters */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  placeholder="US"
                  value={searchParams.country}
                  onChange={(e) => setSearchParams({ ...searchParams, country: e.target.value })}
                />
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

        {/* Step 3: Select Number */}
        {step === 3 && (
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handlePurchase}
                disabled={!selectedNumber || purchaseNumberMutation.isPending}
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
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}