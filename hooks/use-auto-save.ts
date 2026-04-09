"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseAutoSaveOptions {
  entityType: string;
  entityId: string | null;
  data: Record<string, unknown>;
  isDirty: boolean;
  intervalMs?: number;
  enabled?: boolean;
}

export function useAutoSave({
  entityType,
  entityId,
  data,
  isDirty,
  intervalMs = 30000,
  enabled = true,
}: UseAutoSaveOptions) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState<Record<string, unknown> | null>(null);
  const lastSavedRef = useRef<string>("");

  // Check for existing draft on mount
  useEffect(() => {
    if (!enabled) return;

    const params = new URLSearchParams({ entityType });
    if (entityId) params.set("entityId", entityId);

    fetch(`/api/drafts?${params}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.draft) {
          setHasDraft(true);
          setDraftData(result.draft.data);
        }
      })
      .catch(() => {});
  }, [entityType, entityId, enabled]);

  // Auto-save on interval when dirty
  useEffect(() => {
    if (!enabled || !isDirty) return;

    const save = () => {
      const serialized = JSON.stringify(data);
      if (serialized === lastSavedRef.current) return;

      lastSavedRef.current = serialized;
      fetch("/api/drafts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, data }),
      }).catch(() => {});
    };

    const interval = setInterval(save, intervalMs);
    return () => clearInterval(interval);
  }, [enabled, isDirty, data, entityType, entityId, intervalMs]);

  const clearDraft = useCallback(() => {
    const params = new URLSearchParams({ entityType });
    if (entityId) params.set("entityId", entityId);

    fetch(`/api/drafts?${params}`, { method: "DELETE" }).catch(() => {});
    setHasDraft(false);
    setDraftData(null);
  }, [entityType, entityId]);

  const dismissDraft = useCallback(() => {
    setHasDraft(false);
    setDraftData(null);
    clearDraft();
  }, [clearDraft]);

  return { hasDraft, draftData, clearDraft, dismissDraft };
}
