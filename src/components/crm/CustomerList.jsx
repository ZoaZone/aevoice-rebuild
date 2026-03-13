import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Search, Plus, Phone, Mail, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function CustomerList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    full_name: "",
    email: "",
    phone: "",
    company: "",
    funnel_stage: "lead",
    source: "manual",
  });

  const queryClient = useQueryClient();

  const { data: customers = [], isLoading, isError } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 200),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["customers"] });
      const previous = queryClient.getQueryData(["customers"]);
      queryClient.setQueryData(["customers"], (old = []) => [
        { ...newData, id: "optimistic-" + Date.now() },
        ...old,
      ]);
      setShowAddDialog(false);
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setNewCustomer({ full_name: "", email: "", phone: "", company: "", funnel_stage: "lead", source: "manual" });
      toast.success("Customer added successfully");
    },
    onError: (err, _data, context) => {
      if (context?.previous) queryClient.setQueryData(["customers"], context.previous);
      setShowAddDialog(true);
      toast.error(err.message || "Failed to add customer");
    },
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["customers"] });
  }, [queryClient]);

  const handleAddCustomer = () => {
    if (!newCustomer.email && !newCustomer.phone) {
      toast.error("Email or phone is required");
      return;
    }

    const clientId = clients[0]?.id;
    if (!clientId) {
      toast.error("No client found");
      return;
    }

    createCustomerMutation.mutate({
      ...newCustomer,
      client_id: clientId,
    });
  };

  const filteredCustomers = customers.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phone?.includes(term) ||
      c.company?.toLowerCase().includes(term)
    );
  });

  const stageColors = {
    lead: "bg-blue-100 text-blue-700",
    qualified: "bg-amber-100 text-amber-700",
    customer: "bg-green-100 text-green-700",
    churned: "bg-red-100 text-red-700",
  };

  const sourceIcons = {
    ai_call: Phone,
    import: Users,
    form: Mail,
    manual: Plus,
    widget: Building2,
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Customers
              </CardTitle>
              <CardDescription>
                {customers.length} total contacts from calls, forms, and imports
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Customer List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {isLoading && (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            )}

            {isError && (
              <div className="text-center py-8 text-red-500">
                Failed to load customers. Please try again.
              </div>
            )}

            {!isLoading && filteredCustomers.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No customers found</p>
                <p className="text-xs mt-1">
                  Customers from AI calls and forms will appear here
                </p>
              </div>
            )}

            {filteredCustomers.map((customer) => {
              const SourceIcon = sourceIcons[customer.source] || Users;
              return (
                <div
                  key={customer.id}
                  className="flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {customer.full_name || customer.email || customer.phone || "Unknown"}
                      </span>
                      <SourceIcon className="w-3 h-3 text-slate-400" title={customer.source} />
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      {customer.email && <span>{customer.email}</span>}
                      {customer.email && customer.phone && <span>•</span>}
                      {customer.phone && <span>{customer.phone}</span>}
                    </div>
                    {customer.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {customer.tags.slice(0, 3).map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                            {t}
                          </Badge>
                        ))}
                        {customer.tags.length > 3 && (
                          <span className="text-[10px] text-slate-400">
                            +{customer.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Badge className={stageColors[customer.funnel_stage] || "bg-slate-100 text-slate-700"}>
                    {customer.funnel_stage || "lead"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={newCustomer.full_name}
                onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="+1 555 123 4567"
              />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={newCustomer.company}
                onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                placeholder="Acme Inc"
              />
            </div>
            <div className="space-y-2">
              <Label>Funnel Stage</Label>
              <Select
                value={newCustomer.funnel_stage}
                onValueChange={(v) => setNewCustomer({ ...newCustomer, funnel_stage: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCustomer}
              disabled={createCustomerMutation.isPending}
            >
              {createCustomerMutation.isPending ? "Adding..." : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
    </PullToRefresh>
  );
}