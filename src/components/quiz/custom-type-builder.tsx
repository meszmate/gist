"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SchemaField {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  required: boolean;
  description?: string;
  defaultValue?: string;
}

interface CustomTypeBuilderProps {
  initialData?: {
    slug: string;
    name: string;
    description: string;
    configSchema: Record<string, unknown>;
    answerSchema: Record<string, unknown>;
  };
  onSave: (data: {
    slug: string;
    name: string;
    description: string;
    configSchema: Record<string, unknown>;
    answerSchema: Record<string, unknown>;
  }) => void;
  onCancel: () => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function fieldsToSchema(fields: SchemaField[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of fields) {
    let fieldSchema: Record<string, unknown> = {
      type: field.type,
    };

    if (field.description) {
      fieldSchema.description = field.description;
    }

    if (field.defaultValue !== undefined && field.defaultValue !== "") {
      try {
        if (field.type === "number") {
          fieldSchema.default = parseFloat(field.defaultValue);
        } else if (field.type === "boolean") {
          fieldSchema.default = field.defaultValue === "true";
        } else if (field.type === "array" || field.type === "object") {
          fieldSchema.default = JSON.parse(field.defaultValue);
        } else {
          fieldSchema.default = field.defaultValue;
        }
      } catch {
        // Ignore parse errors
      }
    }

    if (field.type === "array") {
      fieldSchema.items = { type: "string" };
    }

    properties[field.name] = fieldSchema;

    if (field.required) {
      required.push(field.name);
    }
  }

  return {
    type: "object",
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

function schemaToFields(schema: Record<string, unknown>): SchemaField[] {
  const properties = (schema.properties || {}) as Record<string, Record<string, unknown>>;
  const required = (schema.required || []) as string[];

  return Object.entries(properties).map(([name, prop]) => ({
    id: generateId(),
    name,
    type: (prop.type || "string") as SchemaField["type"],
    required: required.includes(name),
    description: prop.description as string | undefined,
    defaultValue: prop.default !== undefined ? String(prop.default) : undefined,
  }));
}

export function CustomTypeBuilder({
  initialData,
  onSave,
  onCancel,
}: CustomTypeBuilderProps) {
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const [configFields, setConfigFields] = useState<SchemaField[]>(
    initialData?.configSchema
      ? schemaToFields(initialData.configSchema as Record<string, unknown>)
      : []
  );

  const [answerFields, setAnswerFields] = useState<SchemaField[]>(
    initialData?.answerSchema
      ? schemaToFields(initialData.answerSchema as Record<string, unknown>)
      : []
  );

  const addConfigField = () => {
    setConfigFields([
      ...configFields,
      {
        id: generateId(),
        name: "",
        type: "string",
        required: false,
      },
    ]);
  };

  const addAnswerField = () => {
    setAnswerFields([
      ...answerFields,
      {
        id: generateId(),
        name: "",
        type: "string",
        required: true,
      },
    ]);
  };

  const updateConfigField = (id: string, updates: Partial<SchemaField>) => {
    setConfigFields(
      configFields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const updateAnswerField = (id: string, updates: Partial<SchemaField>) => {
    setAnswerFields(
      answerFields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const removeConfigField = (id: string) => {
    setConfigFields(configFields.filter((f) => f.id !== id));
  };

  const removeAnswerField = (id: string) => {
    setAnswerFields(answerFields.filter((f) => f.id !== id));
  };

  const handleSubmit = () => {
    if (!slug || !name) return;

    onSave({
      slug: slug.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      name,
      description,
      configSchema: fieldsToSchema(configFields.filter((f) => f.name)),
      answerSchema: fieldsToSchema(answerFields.filter((f) => f.name)),
    });
  };

  const isValid =
    slug.length > 0 &&
    name.length > 0 &&
    answerFields.filter((f) => f.name).length > 0;

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (identifier)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my_question_type"
              pattern="[a-z0-9_]+"
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and underscores only
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Question Type"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this question type is used for..."
            rows={2}
          />
        </div>
      </div>

      {/* Config Schema */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Question Configuration</CardTitle>
              <p className="text-sm text-muted-foreground">
                Fields that define how the question is displayed
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addConfigField}>
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {configFields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No configuration fields yet. Add fields to customize question display.
            </p>
          ) : (
            configFields.map((field) => (
              <SchemaFieldEditor
                key={field.id}
                field={field}
                onChange={(updates) => updateConfigField(field.id, updates)}
                onRemove={() => removeConfigField(field.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Answer Schema */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Answer Schema</CardTitle>
              <p className="text-sm text-muted-foreground">
                Fields that define the correct answer format
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addAnswerField}>
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {answerFields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              At least one answer field is required.
            </p>
          ) : (
            answerFields.map((field) => (
              <SchemaFieldEditor
                key={field.id}
                field={field}
                onChange={(updates) => updateAnswerField(field.id, updates)}
                onRemove={() => removeAnswerField(field.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Schema Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Config Schema</p>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(
                  fieldsToSchema(configFields.filter((f) => f.name)),
                  null,
                  2
                )}
              </pre>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Answer Schema</p>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(
                  fieldsToSchema(answerFields.filter((f) => f.name)),
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid}>
          {initialData ? "Update Question Type" : "Create Question Type"}
        </Button>
      </div>
    </div>
  );
}

interface SchemaFieldEditorProps {
  field: SchemaField;
  onChange: (updates: Partial<SchemaField>) => void;
  onRemove: () => void;
}

function SchemaFieldEditor({ field, onChange, onRemove }: SchemaFieldEditorProps) {
  return (
    <div className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30">
      <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab" />

      <div className="flex-1 grid grid-cols-4 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Field Name</Label>
          <Input
            value={field.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="fieldName"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select
            value={field.type}
            onValueChange={(value) =>
              onChange({ type: value as SchemaField["type"] })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="string">String</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="array">Array</SelectItem>
              <SelectItem value="object">Object</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Default Value</Label>
          <Input
            value={field.defaultValue || ""}
            onChange={(e) => onChange({ defaultValue: e.target.value })}
            placeholder={
              field.type === "boolean"
                ? "true/false"
                : field.type === "array"
                ? '["a","b"]'
                : ""
            }
            className="h-8 text-sm"
          />
        </div>

        <div className="flex items-end gap-2">
          <div className="flex items-center gap-2">
            <Switch
              id={`required-${field.id}`}
              checked={field.required}
              onCheckedChange={(checked) => onChange({ required: checked })}
            />
            <Label htmlFor={`required-${field.id}`} className="text-xs">
              Required
            </Label>
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 mt-5"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
