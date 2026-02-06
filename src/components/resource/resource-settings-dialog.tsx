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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Eye,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

interface ResourceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: string;
  initialSettings: {
    availableFrom: string | null;
    availableTo: string | null;
    visibleSections: { flashcards: boolean; summary: boolean; quiz: boolean };
    requireAuthToInteract: boolean;
  };
  onSaved: () => void;
}

export function ResourceSettingsDialog({
  open,
  onOpenChange,
  resourceId,
  initialSettings,
  onSaved,
}: ResourceSettingsDialogProps) {
  const [availableFrom, setAvailableFrom] = useState(
    initialSettings.availableFrom || ""
  );
  const [availableTo, setAvailableTo] = useState(
    initialSettings.availableTo || ""
  );
  const [visibleSections, setVisibleSections] = useState(
    initialSettings.visibleSections
  );
  const [requireAuth, setRequireAuth] = useState(
    initialSettings.requireAuthToInteract
  );
  const [isSaving, setIsSaving] = useState(false);

  const getAvailabilityStatus = () => {
    const now = new Date();
    if (availableFrom && new Date(availableFrom) > now) return "Opens soon";
    if (availableTo && new Date(availableTo) < now) return "Closed";
    return "Currently available";
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availableFrom: availableFrom || null,
          availableTo: availableTo || null,
          visibleSections,
          requireAuthToInteract: requireAuth,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Settings saved");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Resource Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Availability Schedule */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">Availability Schedule</h4>
              <Badge variant="outline" className="ml-auto text-xs">
                {getAvailabilityStatus()}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Available from</Label>
                <Input
                  type="datetime-local"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Available until</Label>
                <Input
                  type="datetime-local"
                  value={availableTo}
                  onChange={(e) => setAvailableTo(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty for no restrictions
            </p>
          </div>

          <Separator />

          {/* Content Visibility */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">
                Content Visibility (shared view)
              </h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Show Summary</Label>
                <Switch
                  checked={visibleSections.summary}
                  onCheckedChange={(checked) =>
                    setVisibleSections((s) => ({ ...s, summary: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Show Flashcards</Label>
                <Switch
                  checked={visibleSections.flashcards}
                  onCheckedChange={(checked) =>
                    setVisibleSections((s) => ({ ...s, flashcards: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Show Quiz</Label>
                <Switch
                  checked={visibleSections.quiz}
                  onCheckedChange={(checked) =>
                    setVisibleSections((s) => ({ ...s, quiz: checked }))
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Interaction Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">Interaction Settings</h4>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Require sign-in to interact</Label>
                <p className="text-xs text-muted-foreground">
                  Users must sign in to study flashcards or take quizzes
                </p>
              </div>
              <Switch
                checked={requireAuth}
                onCheckedChange={setRequireAuth}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
