import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function FacebookInstagramSetup({ agentId, onSuccess }) {
  const [activeTab, setActiveTab] = useState('facebook');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState({ facebook: false, instagram: false });

  const [fbData, setFbData] = useState({
    page_id: '',
    access_token: ''
  });

  const [igData, setIgData] = useState({
    account_id: '',
    access_token: ''
  });

  const handleVerifyFacebook = async () => {
    if (!fbData.page_id || !fbData.access_token) {
      alert('Please fill in all Facebook fields');
      return;
    }

    setLoading(true);
    try {
      // Verify by attempting a simple API call
      const response = await fetch(`https://graph.facebook.com/v18.0/${fbData.page_id}?access_token=${fbData.access_token}`);
      
      if (response.ok) {
        setVerified(prev => ({ ...prev, facebook: true }));
        await onSuccess('facebook_dm', fbData);
        alert('✓ Facebook connection verified!');
      } else {
        alert('Invalid Page ID or Access Token. Please check and try again.');
      }
    } catch (error) {
      alert('Could not verify. Ensure token has page_messaging scope.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyInstagram = async () => {
    if (!igData.account_id || !igData.access_token) {
      alert('Please fill in all Instagram fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://graph.instagram.com/v18.0/${igData.account_id}?access_token=${igData.access_token}`);
      
      if (response.ok) {
        setVerified(prev => ({ ...prev, instagram: true }));
        await onSuccess('instagram_dm', igData);
        alert('✓ Instagram connection verified!');
      } else {
        alert('Invalid Account ID or Access Token. Please check and try again.');
      }
    } catch (error) {
      alert('Could not verify. Ensure token has instagram_basic scope.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle>Social Messaging Setup</CardTitle>
        <CardDescription>Connect your Facebook and Instagram to enable customer messaging</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('facebook')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'facebook'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Facebook Messenger
          </button>
          <button
            onClick={() => setActiveTab('instagram')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'instagram'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Instagram DM
          </button>
        </div>

        {activeTab === 'facebook' && (
          <div className="space-y-4">
            {verified.facebook && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-emerald-700">Facebook Messenger is connected!</span>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Facebook Page ID</Label>
              <Input
                placeholder="Your page ID (e.g., 123456789)"
                value={fbData.page_id}
                onChange={(e) => setFbData({ ...fbData, page_id: e.target.value })}
                disabled={verified.facebook}
              />
              <p className="text-xs text-slate-500">Find at: facebook.com/settings → Page settings → About this page</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Page Access Token</Label>
              <Input
                type="password"
                placeholder="Paste your page access token"
                value={fbData.access_token}
                onChange={(e) => setFbData({ ...fbData, access_token: e.target.value })}
                disabled={verified.facebook}
              />
              <p className="text-xs text-slate-500">
                Get from: facebook.com/developers → Your App → Messenger → Generate Token
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700">
                <strong>Required Scopes:</strong> pages_messaging, pages_read_user_profile, pages_manage_metadata
              </div>
            </div>

            <Button
              onClick={handleVerifyFacebook}
              disabled={loading || verified.facebook}
              className="w-full bg-[#4267B2] hover:bg-[#3b5998]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : verified.facebook ? (
                '✓ Connected'
              ) : (
                'Verify & Connect'
              )}
            </Button>
          </div>
        )}

        {activeTab === 'instagram' && (
          <div className="space-y-4">
            {verified.instagram && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-emerald-700">Instagram is connected!</span>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Instagram Business Account ID</Label>
              <Input
                placeholder="Your account ID"
                value={igData.account_id}
                onChange={(e) => setIgData({ ...igData, account_id: e.target.value })}
                disabled={verified.instagram}
              />
              <p className="text-xs text-slate-500">
                Found in: instagram.com → Settings → Basic Info
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Access Token</Label>
              <Input
                type="password"
                placeholder="Paste your Instagram access token"
                value={igData.access_token}
                onChange={(e) => setIgData({ ...igData, access_token: e.target.value })}
                disabled={verified.instagram}
              />
              <p className="text-xs text-slate-500">
                Get from: facebook.com/developers → Your App → Instagram Basic Display
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700">
                <strong>Required Scopes:</strong> instagram_basic, instagram_manage_messages
              </div>
            </div>

            <Button
              onClick={handleVerifyInstagram}
              disabled={loading || verified.instagram}
              className="w-full bg-gradient-to-r from-[#fd1d1d] via-[#833ab4] to-[#fcaf45] hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : verified.instagram ? (
                '✓ Connected'
              ) : (
                'Verify & Connect'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}