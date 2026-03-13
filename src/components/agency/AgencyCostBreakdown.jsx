import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Loader2,
  AlertCircle,
  DollarSign as CostIcon,
  Zap,
  Mic,
  Phone,
  Server,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AgencyCostBreakdown({ agencyId }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch agency cost summary
  const { data: costData, isLoading, error } = useQuery({
    queryKey: ['agencyCostSummary', agencyId, startDate, endDate],
    queryFn: async () => {
      const response = await base44.functions.invoke("trackTransactionCosts", {
        action: "getAgencyCostSummary",
        agencyId,
        startDate: startDate || null,
        endDate: endDate || null,
      });
      return response.data;
    },
    enabled: !!agencyId,
  });

  const summary = costData?.summary || {};
  const recentTransactions = costData?.recentTransactions || [];

  // Calculate percentages for cost breakdown
  const totalCosts = summary.totalCosts || 0;
  const aiPercentage = totalCosts > 0 ? ((summary.totalAiCost / totalCosts) * 100).toFixed(1) : 0;
  const voicePercentage = totalCosts > 0 ? ((summary.totalVoiceCost / totalCosts) * 100).toFixed(1) : 0;
  const telephonyPercentage = totalCosts > 0 ? ((summary.totalTelephonyCost / totalCosts) * 100).toFixed(1) : 0;
  const overheadPercentage = totalCosts > 0 ? ((summary.totalOverhead / totalCosts) * 100).toFixed(1) : 0;

  const profitMargin = summary.totalGross > 0
    ? ((summary.totalNetProfit / summary.totalGross) * 100).toFixed(1)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>Error loading cost data: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filter by Date
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Model Explanation */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="text-lg">📊 Revenue Model: NET Profit Basis (75/25 Split)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-700">
            You receive <strong>75% of NET profit</strong> after platform operating costs are deducted:
          </p>
          <div className="bg-white p-4 rounded-lg border border-indigo-200">
            <p className="text-xs font-semibold text-gray-600 mb-2">CALCULATION FORMULA:</p>
            <div className="space-y-1 text-xs text-gray-700 font-mono">
              <div>Gross Sale: <span className="text-green-600">$100</span></div>
              <div>- AI/LLM Costs: <span className="text-red-600">$15</span></div>
              <div>- Voice/TTS Costs: <span className="text-red-600">$20</span></div>
              <div>- Telephony Costs: <span className="text-red-600">$10</span></div>
              <div>- Platform Overhead (10%): <span className="text-red-600">$10</span></div>
              <div className="border-t border-gray-300 mt-2 pt-2">
                <span className="text-gray-700">Net profit:</span> <span className="text-blue-600 font-bold">$45</span>
              </div>
              <div className="mt-2">
                <span className="font-semibold">Your 75% share:</span> <span className="text-indigo-600 font-bold">$33.75</span>
              </div>
              <div>
                <span className="text-gray-600">Platform 25% share:</span> <span className="text-gray-500">$11.25</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Gross Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              ${(summary.totalGross || 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {summary.transactionCount || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CostIcon className="h-4 w-4" />
              Operating Costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              ${(summary.totalCosts || 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {totalCosts > 0 ? `${((totalCosts / summary.totalGross) * 100).toFixed(1)}%` : "0%"} of gross
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${(summary.totalNetProfit || 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {profitMargin}% margin
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-indigo-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Your Share (75%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">
              ${(summary.totalAgencyShare || 0).toFixed(2)}
            </div>
            <p className="text-xs text-indigo-600 mt-1">
              Platform gets: ${(summary.totalPlatformShare || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
          <CardTitle>Cost Breakdown by Category</CardTitle>
          <CardDescription>Detailed breakdown of operating costs</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* AI/LLM */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">AI/LLM Costs</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">
                    ${(summary.totalAiCost || 0).toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">({aiPercentage}%)</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${aiPercentage}%` }}
                />
              </div>
            </div>

            {/* Voice/TTS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700">Voice/TTS Costs</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">
                    ${(summary.totalVoiceCost || 0).toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">({voicePercentage}%)</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${voicePercentage}%` }}
                />
              </div>
            </div>

            {/* Telephony */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700">Telephony Costs</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">
                    ${(summary.totalTelephonyCost || 0).toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">({telephonyPercentage}%)</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${telephonyPercentage}%` }}
                />
              </div>
            </div>

            {/* Platform Overhead */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Platform Overhead (10%)</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">
                    ${(summary.totalOverhead || 0).toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">({overheadPercentage}%)</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gray-500 h-2 rounded-full"
                  style={{ width: `${overheadPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest cost-tracked activities</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No transaction data available</p>
              <p className="text-xs mt-2">Cost tracking data will appear here as transactions occur</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-4 bg-gray-50 rounded-lg border hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{transaction.transaction_type}</Badge>
                        <span className="text-xs text-gray-500">
                          {format(new Date(transaction.transaction_date), "MMM dd, yyyy HH:mm")}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2">
                        <div>
                          <span className="text-gray-500">AI Cost:</span>
                          <span className="ml-1 font-medium">${parseFloat(transaction.ai_llm_cost).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Voice:</span>
                          <span className="ml-1 font-medium">${parseFloat(transaction.voice_tts_cost).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <span className="ml-1 font-medium">${parseFloat(transaction.telephony_cost).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Overhead:</span>
                          <span className="ml-1 font-medium">${parseFloat(transaction.platform_overhead_amount).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-semibold text-gray-900">
                        Net: ${parseFloat(transaction.net_profit).toFixed(2)}
                      </div>
                      <div className="text-xs text-indigo-600 font-medium">
                        Your 75%: ${parseFloat(transaction.agency_share_amount).toFixed(2)}
                      </div>
                      {transaction.byollm_applied && (
                        <Badge variant="secondary" className="mt-1 text-xs">BYOLLM</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
