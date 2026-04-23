"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe, Lock, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/hooks/use-locale";

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
  const { t } = useLocale();
  const [isRestricted, setIsRestricted] = useState(
    !!initialEmails && initialEmails.length > 0
  );
  const [emails, setEmails] = useState<string[]>(initialEmails || []);
  const [newEmail, setNewEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

      toast.success(t("resource.accessControlUpdated"));
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error(t("resource.failedUpdateAccess"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("resource.accessControl")}</DialogTitle>
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
                  {isRestricted ? t("resource.restrictedAccess") : t("resource.publicAccess")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isRestricted
                    ? t("resource.onlySpecificUsers")
                    : t("resource.anyoneWithLink")}
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
                <Label className="text-sm">{t("resource.addEmail")}</Label>
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

              {/* Email list */}
              <div className="space-y-2">
                <Label className="text-sm">
                  {t("resource.allowedViewers", { count: emails.length })}
                </Label>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-1">
                    {emails.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50"
                      >
                        <span className="text-sm truncate">{email}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => removeEmail(email)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {emails.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t("resource.noEmailsAdded")}
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
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
