import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Upload, Search, AlertCircle } from "lucide-react";

export default function ContactsTab({
  contacts,
  isLoading,
  isError,
  onUploadContacts
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredContacts = contacts.filter((contact) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      contact.full_name?.toLowerCase().includes(term) ||
      contact.email?.toLowerCase().includes(term) ||
      contact.company?.toLowerCase().includes(term)
    );
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contacts Database</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contacts Database</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600 py-8 justify-center">
            <AlertCircle className="w-5 h-5" />
            <span>Failed to load contacts. Please try again.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Contacts Database</CardTitle>
            <CardDescription>{contacts.length} total contacts</CardDescription>
          </div>
          <Button variant="outline" onClick={onUploadContacts}>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 mb-4">
              No contacts yet. Upload a CSV to get started.
            </p>
            <Button onClick={onUploadContacts}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Contacts
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Contact List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredContacts.slice(0, 50).map((contact) => (
                <ContactRow key={contact.id} contact={contact} />
              ))}
            </div>

            {filteredContacts.length > 50 && (
              <p className="text-xs text-slate-500 text-center">
                Showing first 50 of {filteredContacts.length} contacts
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContactRow({ contact }) {
  const stageColors = {
    lead: "bg-blue-100 text-blue-700",
    prospect: "bg-amber-100 text-amber-700",
    customer: "bg-green-100 text-green-700",
    churned: "bg-red-100 text-red-700"
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">
          {contact.full_name || contact.email}
        </p>
        <p className="text-sm text-slate-500 truncate">
          {contact.email} {contact.phone && `• ${contact.phone}`}
        </p>
        {contact.tags?.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {contact.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs px-1.5 py-0"
              >
                {tag}
              </Badge>
            ))}
            {contact.tags.length > 3 && (
              <span className="text-xs text-slate-400">
                +{contact.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
      <Badge className={stageColors[contact.funnel_stage] || "bg-slate-100 text-slate-700"}>
        {contact.funnel_stage || "lead"}
      </Badge>
    </div>
  );
}