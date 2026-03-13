/**
 * Provider Management Dashboard
 * Admin interface for managing telephony providers (GSM, SIP, API)
 */

import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog';

import {
  AlertCircle,
  CheckCircle,
  WifiOff,
  Settings,
  Phone,
  Signal,
  TrendingUp
} from 'lucide-react';

import toast from 'react-hot-toast';

const ProviderManagement = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [healthMetrics, setHealthMetrics] = useState({});

  useEffect(() => {
    loadProviders();
    const interval = setInterval(loadProviders, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadProviders = async () => {
    try {
      const response = await base44.functions.invoke('telephony/manageProviders', {
        action: 'list'
      });

      if (response.data) {
        setProviders(response.data);

        const healthPromises = response.data.map((provider) =>
          loadProviderHealth(provider.id)
        );
        await Promise.allSettled(healthPromises);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const loadProviderHealth = async (providerId) => {
    try {
      const response = await base44.functions.invoke('telephony/manageProviders', {
        action: 'getHealth',
        providerId
      });

      if (response.data) {
        setHealthMetrics((prev) => ({
          ...prev,
          [providerId]: response.data
        }));
      }
    } catch (error) {
      console.error(`Failed to load health for ${providerId}:`, error);
    }
  };

  const testProviderConnection = async (providerId) => {
    const toastId = toast.loading('Testing connection...');
    try {
      const response = await base44.functions.invoke('telephony/manageProviders', {
        action: 'testConnection',
        providerId
      });

      if (response.data?.healthy) {
        toast.success('Connection successful!', { id: toastId });
      } else {
        toast.error('Connection failed', { id: toastId });
      }
    } catch (error) {
      toast.error(`Test failed: ${error.message}`, { id: toastId });
    }
  };

  const deleteProvider = async (providerId) => {
    if (!confirm('Are you sure you want to delete this provider?')) return;

    const toastId = toast.loading('Deleting provider...');
    try {
      await base44.functions.invoke('telephony/manageProviders', {
        action: 'delete',
        providerId
      });

      toast.success('Provider deleted successfully', { id: toastId });
      loadProviders();
    } catch (error) {
      toast.error(`Delete failed: ${error.message}`, { id: toastId });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Telephony Providers</h1>
          <p className="text-gray-600 mt-1">
            Manage GSM gateways, SIP trunks, and API providers
          </p>
        </div>

        <AddProviderDialog onSuccess={loadProviders} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Providers</p>
                <p className="text-2xl font-bold">{providers.length}</p>
              </div>
              <Phone className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {providers.filter((p) => p.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Channels</p>
                <p className="text-2xl font-bold">
                  {providers.reduce((sum, p) => sum + (p.channels_total || 0), 0)}
                </p>
              </div>
              <Signal className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-2xl font-bold text-blue-600">
                  {providers.reduce((sum, p) => sum + (p.channels_available || 0), 0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider List */}
      <Card>
        <CardHeader>
          <CardTitle>All Providers</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading providers...</div>
          ) : providers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No providers configured. Add your first provider to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  health={healthMetrics[provider.id]}
                  onTest={() => testProviderConnection(provider.id)}
                  onDelete={() => deleteProvider(provider.id)}
                  onRefresh={() => loadProviderHealth(provider.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const ProviderCard = ({ provider, health, onTest, onDelete, onRefresh }) => {
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-500', icon: CheckCircle, text: 'Active' },
      inactive: { color: 'bg-gray-500', icon: WifiOff, text: 'Inactive' },
      maintenance: { color: 'bg-yellow-500', icon: Settings, text: 'Maintenance' },
      error: { color: 'bg-red-500', icon: AlertCircle, text: 'Error' }
    };

    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const formatProviderType = (type) => {
    const types = {
      gsm_gateway: 'GSM Gateway',
      sip_trunk: 'SIP Trunk',
      api_provider: 'API Provider'
    };
    return types[type] || type;
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Phone className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">{provider.name}</h3>
            {getStatusBadge(provider.status)}
            <span className="text-sm text-gray-500">
              {formatProviderType(provider.provider_type)}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <div>
              <p className="text-xs text-gray-600">Priority</p>
              <p className="font-semibold">{provider.priority}</p>
            </div>

            <div>
              <p className="text-xs text-gray-600">Cost/Min</p>
              <p className="font-semibold">${provider.cost_per_minute?.toFixed(4)}</p>
            </div>

            <div>
              <p className="text-xs text-gray-600">Channels</p>
              <p className="font-semibold">
                {provider.channels_available}/{provider.channels_total}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600">Uptime</p>
              <p className="font-semibold">{provider.uptime_percentage?.toFixed(1)}%</p>
            </div>
          </div>

          {health && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-600">Healthy</p>
                  <p
                    className={
                      health.is_healthy
                        ? 'text-green-600 font-semibold'
                        : 'text-red-600 font-semibold'
                    }
                  >
                    {health.is_healthy ? 'Yes' : 'No'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-600">Latency</p>
                  <p className="font-semibold">{health.average_latency_ms}ms</p>
                </div>

                <div>
                  <p className="text-xs text-gray-600">Errors</p>
                  <p className="font-semibold">{health.error_count}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-600">Current Calls</p>
                  <p className="font-semibold">{health.current_calls}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 ml-4">
          <Button variant="outline" size="sm" onClick={onRefresh} title="Refresh health">
            <Settings className="w-4 h-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={onTest} title="Test connection">
            <CheckCircle className="w-4 h-4" />
          </Button>

          <Button variant="destructive" size="sm" onClick={onDelete} title="Delete provider">
            <AlertCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const AddProviderDialog = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    providerType: 'gsm_gateway',
    priority: 100,
    costPerMinute: 0.01,
    config: {
      host: '',
      port: 80,
      username: '',
      password: '',
      channels: 4
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Creating provider...');

    try {
      await base44.functions.invoke('telephony/manageProviders', {
        action: 'create',
        ...formData
      });

      toast.success('Provider created successfully!', { id: toastId });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error(`Failed to create provider: ${error.message}`, { id: toastId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Provider</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Telephony Provider</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Provider Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Office GSM Gateway"
              required
            />
          </div>

          <div>
            <Label>Provider Type</Label>
            <Select
              value={formData.providerType}
              onValueChange={(value) => setFormData({ ...formData, providerType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="gsm_gateway">GSM Gateway</SelectItem>
                <SelectItem value="sip_trunk">SIP Trunk</SelectItem>
                <SelectItem value="api_provider">API Provider</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Input
                type="number"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: parseInt(e.target.value) })
                }
              />
            </div>

            <div>
              <Label>Cost per Minute ($)</Label>
              <Input
                type="number"
                step="0.0001"
                value={formData.costPerMinute}
                onChange={(e) =>
                  setFormData({ ...formData, costPerMinute: parseFloat(e.target.value) })
                }
              />
            </div>
          </div>

          {formData.providerType === 'gsm_gateway' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Host</Label>
                  <Input
                    value={formData.config.host}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, host: e.target.value }
                      })
                    }
                    placeholder="192.168.1.100"
                    required
                  />
                </div>

                <div>
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={formData.config.port}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, port: parseInt(e.target.value) }
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Username</Label>
                  <Input
                    value={formData.config.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, username: e.target.value }
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={formData.config.password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, password: e.target.value }
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Number of Channels</Label>
                <Input
                  type="number"
                  value={formData.config.channels}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, channels: parseInt(e.target.value) }
                    })
                  }
                />
              </div>
            </>
          )}

          <Button type="submit" className="w-full">
            Create Provider
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProviderManagement;
