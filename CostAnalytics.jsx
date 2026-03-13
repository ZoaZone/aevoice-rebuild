import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  Building2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function CostAnalytics() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedAgencyId, setSelectedAgencyId] = useState(null);

  // Fetch admin cost summary
  const { data: costData, isLoading, error } = useQuery({
    queryKey: ['adminCostSummary', startDate, endDate, selectedAgencyId],
    queryFn: async () => {
      const response = await base44.asServiceRole.functions.invoke("trackTransactionCosts", {
        action: "getAdminCostSummary",
        startDate: startDate || null,
        endDate: endDate || null,
        agencyId: selectedAgencyId || null,
        limit: 100,
      });
      return response.data;
    },
  });

  // Fetch agencies for filter dropdown
  const { data: agencies } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      // Use entities API instead of direct db.query
      const agencies = await base44.asServiceRole.entities.Agency?.findAll?.({
        limit: 100,
        orderBy: 'name'
      });
      return agencies || [];
    },
  });

  const summary = costData?.summary || {};
  const agencyBreakdown = costData?.agencyBreakdown || [];

  // Calculate profit margin percentage
  const profitMargin = summary.totalGross > 0
    ? ((summary.totalNetProfit / summary.totalGross) * 100).toFixed(1)
    : 0;

  // Export to CSV
  const exportToCSV = () => {
    if (!agencyBreakdown || agencyBreakdown.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = [
      "Agency ID",
      "Transaction Count",
      "Total Gross",
      "Total Costs",
      "Net Profit",
      "Agency Share (75%)",
    ];

    const rows = agencyBreakdown.map(agency => [
      agency.agency_id || "N/A",
      agency.transaction_count,
      `$${parseFloat(agency.total_gross || 0).toFixed(2)}`,
      `$${parseFloat(agency.total_costs || 0).toFixed(2)}`,
      `$${parseFloat(agency.total_net_profit || 0).toFixed(2)}`,
      `$${parseFloat(agency.total_agency_share || 0).toFixed(2)}`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cost-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Cost Data</h3>
          <p className="text-sm text-gray-500">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div>
              <Label htmlFor="agency">Agency</Label>
              <Select value={selectedAgencyId || ""} onValueChange={setSelectedAgencyId}>
                <SelectTrigger id="agency">
                  <SelectValue placeholder="All Agencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Agencies</SelectItem>
                  {agencies?.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={exportToCSV} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Gross Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${(summary.totalGross || 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {summary.transactionCount || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Operating Costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${(summary.totalCosts || 0).toFixed(2)}
            </div>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>AI/LLM:</span>
                <span>${(summary.totalAiCost || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Voice/TTS:</span>
                <span>${(summary.totalVoiceCost || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Telephony:</span>
                <span>${(summary.totalTelephonyCost || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Overhead (10%):</span>
                <span>${(summary.totalOverhead || 0).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${(summary.totalNetProfit || 0).toFixed(2)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {profitMargin >= 50 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-yellow-500" />
              )}
              <span className="text-xs text-gray-500">{profitMargin}% margin</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              Revenue Split
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Agency Share (75%)</span>
                  <span className="font-semibold">
                    ${(summary.totalAgencyShare || 0).toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: "75%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Platform Share (25%)</span>
                  <span className="font-semibold">
                    ${(summary.totalPlatformShare || 0).toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-600 h-2 rounded-full"
                    style={{ width: "25%" }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Agencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {summary.agencyCount || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {summary.clientCount || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              BYOLLM Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {summary.byollmCount || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {summary.transactionCount > 0
                ? `${((summary.byollmCount / summary.transactionCount) * 100).toFixed(1)}%`
                : "0%"}{" "}
              of transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agency Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Agency Cost Breakdown
          </CardTitle>
          <CardDescription>
            Top agencies by gross revenue with cost analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agencyBreakdown.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No transaction data available for the selected filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">
                      Agency ID
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">
                      Transactions
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">
                      Gross Revenue
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">
                      Total Costs
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">
                      Net Profit
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">
                      Agency Share (75%)
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">
                      Margin
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {agencyBreakdown.map((agency, index) => {
                    const margin = agency.total_gross > 0
                      ? ((agency.total_net_profit / agency.total_gross) * 100).toFixed(1)
                      : 0;
                    
                    return (
                      <tr key={agency.agency_id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-600">
                            {agency.agency_id
                              ? `${agency.agency_id.substring(0, 8)}...`
                              : "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {agency.transaction_count || 0}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          ${parseFloat(agency.total_gross || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600">
                          ${parseFloat(agency.total_costs || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          ${parseFloat(agency.total_net_profit || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-indigo-600 font-semibold">
                          ${parseFloat(agency.total_agency_share || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge
                            variant={margin >= 50 ? "success" : margin >= 30 ? "warning" : "destructive"}
                          >
                            {margin}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
