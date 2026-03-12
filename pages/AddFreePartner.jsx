import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit, CheckCircle, XCircle, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

export default function AddFreePartner() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [formData, setFormData] = useState({
    partner_id: "",
    name: "",
    website: "",
    email: "",
    business_name: "",
    industry: "other",
    is_active: true,
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['freePartners'],
    queryFn: () => base44.entities.FreePartner.list('-created_date'),
    enabled: user?.role === 'admin',
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FreePartner.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freePartners'] });
      toast.success("Free partner added successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to add partner: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FreePartner.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freePartners'] });
      toast.success("Partner updated successfully!");
      setIsDialogOpen(false);
      setEditingPartner(null);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to update partner: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FreePartner.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freePartners'] });
      toast.success("Partner deleted successfully!");
      setDeleteConfirmId(null);
    },
    onError: (error) => {
      toast.error("Failed to delete partner: " + error.message);
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: (partnerId) => base44.functions.invoke('createFreePartnerAgent', { partner_id: partnerId }),
    onSuccess: (data) => {
      toast.success(`Agents created successfully for ${data.data.partner}!`);
    },
    onError: (error) => {
      toast.error("Failed to create agents: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      partner_id: "",
      name: "",
      website: "",
      email: "",
      business_name: "",
      industry: "other",
      is_active: true,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (partner) => {
    setEditingPartner(partner);
    setFormData({
      partner_id: partner.partner_id,
      name: partner.name,
      website: partner.website,
      email: partner.email,
      business_name: partner.business_name,
      industry: partner.industry,
      is_active: partner.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPartner(null);
    resetForm();
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              You need administrator privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Free Partners Management</h1>
          <p className="text-slate-500 mt-1">Add and manage partners who get free AI agents</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Partner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPartner ? "Edit Partner" : "Add New Free Partner"}</DialogTitle>
              <DialogDescription>
                {editingPartner ? "Update partner details below" : "Fill in the details to add a new free partner"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partner_id">Partner ID (slug) *</Label>
                  <Input
                    id="partner_id"
                    placeholder="e.g., workautomation"
                    value={formData.partner_id}
                    onChange={(e) => setFormData({ ...formData, partner_id: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    required
                    disabled={editingPartner}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., WorkAutomation.app"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name *</Label>
                <Input
                  id="business_name"
                  placeholder="e.g., WorkAutomation - Process Automation Platform"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website URL *</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry *</Label>
                  <Select value={formData.industry} onValueChange={(v) => setFormData({ ...formData, industry: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="nonprofit">Nonprofit</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="is_active">Active Status</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <span className="text-sm text-slate-600">
                      {formData.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingPartner ? "Update Partner" : "Add Partner"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : partners.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No partners yet</h3>
            <p className="text-sm text-slate-500 mb-4">Add your first free partner to get started</p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add First Partner
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {partners.map((partner) => (
            <Card key={partner.id} className="border-l-4" style={{ borderLeftColor: partner.is_active ? '#10b981' : '#94a3b8' }}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{partner.name}</h3>
                      {partner.is_active ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                      <Badge variant="outline" className="capitalize">{partner.industry}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{partner.business_name}</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Partner ID:</span>
                        <p className="font-medium text-slate-900">{partner.partner_id}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Website:</span>
                        <p className="font-medium text-slate-900 truncate">
                          <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                            {partner.website}
                          </a>
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Email:</span>
                        <p className="font-medium text-slate-900">{partner.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createAgentMutation.mutate(partner.partner_id)}
                      disabled={!partner.is_active || createAgentMutation.isPending}
                      className="gap-2"
                    >
                      {createAgentMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      Create Agents
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(partner)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteConfirmId(partner.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Partner?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this partner from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}