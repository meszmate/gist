"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  Lock,
  Plus,
  X,
  Users,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  email: string;
  name: string | null;
  hasAccount: boolean;
  groupId: string | null;
}

interface ContactGroup {
  id: string;
  name: string;
}

interface AccessControlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: string;
  initialEmails: string[] | null;
  onSaved: () => void;
}

export function AccessControlDialog({
  open,
  onOpenChange,
  resourceId,
  initialEmails,
  onSaved,
}: AccessControlDialogProps) {
  const [isRestricted, setIsRestricted] = useState(
    !!initialEmails && initialEmails.length > 0
  );
  const [emails, setEmails] = useState<string[]>(initialEmails || []);
  const [newEmail, setNewEmail] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch contacts
  useEffect(() => {
    if (open) {
      fetch("/api/contacts")
        .then((res) => res.json())
        .then((data) => {
          setContacts(data.contacts || []);
          setContactGroups(data.groups || []);
        })
        .catch(() => {});
    }
  }, [open]);

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (email && !emails.includes(email) && email.includes("@")) {
      setEmails([...emails, email]);
      setNewEmail("");
    }
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email));
  };

  const importFromGroup = (groupId: string) => {
    const groupContacts = contacts.filter((c) => c.groupId === groupId);
    const newEmails = groupContacts
      .map((c) => c.email.toLowerCase())
      .filter((e) => !emails.includes(e));
    setEmails([...emails, ...newEmails]);
  };

  const importContact = (email: string) => {
    if (!emails.includes(email.toLowerCase())) {
      setEmails([...emails, email.toLowerCase()]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowedViewerEmails: isRestricted ? emails : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Access control updated");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Failed to update access control");
    } finally {
      setIsSaving(false);
    }
  };

  const contactByEmail = (email: string) =>
    contacts.find((c) => c.email.toLowerCase() === email.toLowerCase());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Access Control</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              {isRestricted ? (
                <Lock className="h-5 w-5 text-amber-600" />
              ) : (
                <Globe className="h-5 w-5 text-green-600" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {isRestricted ? "Restricted Access" : "Public Access"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isRestricted
                    ? "Only specific users can view"
                    : "Anyone with the link can view"}
                </p>
              </div>
            </div>
            <Switch
              checked={isRestricted}
              onCheckedChange={setIsRestricted}
            />
          </div>

          {isRestricted && (
            <>
              {/* Add email */}
              <div className="space-y-2">
                <Label className="text-sm">Add email</Label>
                <div className="flex gap-2">
                  <Input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addEmail();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button onClick={addEmail} size="icon" className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Import from contacts */}
              {contacts.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Import from contacts</Label>
                  <div className="flex gap-2">
                    {contactGroups.length > 0 && (
                      <Select onValueChange={importFromGroup}>
                        <SelectTrigger className="w-[180px]">
                          <Users className="mr-2 h-3.5 w-3.5" />
                          <SelectValue placeholder="Import group" />
                        </SelectTrigger>
                        <SelectContent>
                          {contactGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Select onValueChange={importContact}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts
                          .filter(
                            (c) =>
                              !emails.includes(c.email.toLowerCase())
                          )
                          .map((contact) => (
                            <SelectItem
                              key={contact.id}
                              value={contact.email}
                            >
                              {contact.name || contact.email}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Email list */}
              <div className="space-y-2">
                <Label className="text-sm">
                  Allowed viewers ({emails.length})
                </Label>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-1">
                    {emails.map((email) => {
                      const contact = contactByEmail(email);
                      return (
                        <div
                          key={email}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm truncate">{email}</span>
                            {contact?.name && (
                              <span className="text-xs text-muted-foreground">
                                ({contact.name})
                              </span>
                            )}
                            {contact?.hasAccount && (
                              <Badge
                                variant="outline"
                                className="text-xs gap-1 shrink-0"
                              >
                                <UserCheck className="h-3 w-3" />
                                Account
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => removeEmail(email)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                    {emails.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No emails added yet
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
