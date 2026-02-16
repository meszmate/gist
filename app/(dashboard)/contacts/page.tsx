"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronDown,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
  Mail,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import { useVimNavigation } from "@/lib/hooks/use-vim-navigation";
import { useVimContext } from "@/components/keyboard/vim-navigation-provider";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

type AddContactForm = z.infer<ReturnType<typeof createAddContactSchema>>;
type AddGroupForm = z.infer<ReturnType<typeof createAddGroupSchema>>;

function createAddContactSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().email(t("contacts.invalidEmail")),
    name: z.string().optional(),
    groupId: z.string().optional(),
    notes: z.string().optional(),
  });
}

function createAddGroupSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t("contacts.nameRequired")).max(100),
    color: z.string().optional(),
  });
}

interface Contact {
  id: string;
  email: string;
  name: string | null;
  hasAccount: boolean;
  notes: string | null;
  group: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

interface ContactGroup {
  id: string;
  name: string;
  color: string | null;
  contactCount: number;
}

async function fetchContacts(): Promise<Contact[]> {
  const res = await fetch("/api/contacts");
  if (!res.ok) throw new Error("Failed to fetch contacts");
  return res.json();
}

async function fetchGroups(): Promise<ContactGroup[]> {
  const res = await fetch("/api/contacts/groups");
  if (!res.ok) return [];
  return res.json();
}

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const { searchOpen, setSearchOpen } = useVimContext();
  const { t } = useLocale();

  const colorOptions = [
    { value: "red", label: t("settings.rose"), class: "bg-red-500" },
    { value: "orange", label: t("settings.orange"), class: "bg-orange-500" },
    { value: "yellow", label: t("settings.orange"), class: "bg-yellow-500" },
    { value: "green", label: t("settings.green"), class: "bg-green-500" },
    { value: "blue", label: t("settings.blue"), class: "bg-blue-500" },
    { value: "purple", label: t("settings.violet"), class: "bg-purple-500" },
  ];

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: fetchContacts,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["contact-groups"],
    queryFn: fetchGroups,
  });

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.name?.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = !selectedGroup || c.group?.id === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const { selectedIndex, setSelectedIndex } = useVimNavigation({
    itemCount: filteredContacts.length,
    enabled: !searchOpen && !addContactOpen && !addGroupOpen,
  });

  const addContactForm = useForm<AddContactForm>({
    resolver: zodResolver(createAddContactSchema(t)),
    defaultValues: {
      email: "",
      name: "",
      groupId: undefined,
      notes: "",
    },
  });

  const addGroupForm = useForm<AddGroupForm>({
    resolver: zodResolver(createAddGroupSchema(t)),
    defaultValues: {
      name: "",
      color: "",
    },
  });

  const addContact = useMutation({
    mutationFn: async (data: AddContactForm) => {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add contact");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setAddContactOpen(false);
      addContactForm.reset();
      toast.success(t("contacts.contactAdded"));
    },
    onError: () => {
      toast.error(t("contacts.failedAddContact"));
    },
  });

  const addGroup = useMutation({
    mutationFn: async (data: AddGroupForm) => {
      const res = await fetch("/api/contacts/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add group");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-groups"] });
      setAddGroupOpen(false);
      addGroupForm.reset();
      toast.success(t("contacts.groupCreated"));
    },
    onError: () => {
      toast.error(t("contacts.failedCreateGroup"));
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (contactId: string) => {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete contact");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(t("contacts.contactDeleted"));
    },
    onError: () => {
      toast.error(t("contacts.failedDeleteContact"));
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("contacts.title")}
        description={t("contacts.description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("contacts.title") },
        ]}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("contacts.newGroup")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("contacts.createGroup")}</DialogTitle>
                  <DialogDescription>
                    {t("contacts.createGroupDesc")}
                  </DialogDescription>
                </DialogHeader>
                <Form {...addGroupForm}>
                  <form
                    onSubmit={addGroupForm.handleSubmit((data) =>
                      addGroup.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={addGroupForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("contacts.groupName")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("contacts.groupNamePlaceholder")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addGroupForm.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("contacts.colorOptional")}</FormLabel>
                          <div className="flex gap-2">
                            {colorOptions.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                onClick={() => field.onChange(color.value)}
                                className={cn(
                                  "w-8 h-8 rounded-full transition-all",
                                  color.class,
                                  field.value === color.value &&
                                    "ring-2 ring-offset-2 ring-primary"
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={addGroup.isPending}>
                        {addGroup.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {t("contacts.createGroup")}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("contacts.addContact")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("contacts.addContact")}</DialogTitle>
                  <DialogDescription>
                    {t("contacts.addContactDesc")}
                  </DialogDescription>
                </DialogHeader>
                <Form {...addContactForm}>
                  <form
                    onSubmit={addContactForm.handleSubmit((data) =>
                      addContact.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={addContactForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("contacts.email")}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder={t("contacts.emailPlaceholder")}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addContactForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("contacts.nameOptional")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("contacts.namePlaceholder")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addContactForm.control}
                      name="groupId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("contacts.groupOptional")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("contacts.groupPlaceholder")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {groups.map((group) => (
                                <SelectItem key={group.id} value={group.id}>
                                  {group.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addContactForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("contacts.notesOptional")}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t("contacts.notesPlaceholder")}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={addContact.isPending}>
                        {addContact.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {t("contacts.addContact")}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Groups Sidebar */}
      {groups.length > 0 && (
        <Collapsible open={groupsOpen} onOpenChange={setGroupsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <span className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                {t("contacts.groups")} ({groups.length})
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  groupsOpen && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex items-center gap-2 flex-wrap p-2">
              <Badge
                variant={selectedGroup === null ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() => setSelectedGroup(null)}
              >
                {t("contacts.all")} ({contacts.length})
              </Badge>
              {groups.map((group) => (
                <Badge
                  key={group.id}
                  variant={selectedGroup === group.id ? "default" : "outline"}
                  className="cursor-pointer transition-colors gap-1"
                  onClick={() =>
                    setSelectedGroup(
                      selectedGroup === group.id ? null : group.id
                    )
                  }
                >
                  {group.color && (
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        `bg-${group.color}-500`
                      )}
                    />
                  )}
                  {group.name} ({group.contactCount})
                </Badge>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("contacts.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            autoFocus={searchOpen}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
          />
        </div>
      </div>

      {isLoading ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("contacts.contact")}</TableHead>
                <TableHead>{t("contacts.email")}</TableHead>
                <TableHead>{t("contacts.group")}</TableHead>
                <TableHead>{t("contacts.status")}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-48 bg-muted rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : filteredContacts.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title={t("contacts.noContactsFound")}
          description={
            search
              ? t("contacts.adjustSearchTerms")
              : t("contacts.addFirstContact")
          }
          action={
            !search
              ? {
                  label: t("contacts.addContact"),
                  onClick: () => setAddContactOpen(true),
                  icon: <Plus className="mr-2 h-4 w-4" />,
                }
              : undefined
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("contacts.contact")}</TableHead>
                <TableHead>{t("contacts.email")}</TableHead>
                <TableHead>{t("contacts.group")}</TableHead>
                <TableHead>{t("contacts.status")}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact, index) => (
                <TableRow
                  key={contact.id}
                  className={cn(
                    "animate-slide-up transition-colors",
                    selectedIndex === index && "bg-muted/50"
                  )}
                  style={{ animationDelay: `${index * 20}ms` }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium",
                          contact.hasAccount
                            ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {contact.name
                          ? contact.name.charAt(0).toUpperCase()
                          : contact.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">
                        {contact.name || "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {contact.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    {contact.group ? (
                      <Badge variant="outline" className="gap-1">
                        {contact.group.color && (
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full",
                              `bg-${contact.group.color}-500`
                            )}
                          />
                        )}
                        {contact.group.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.hasAccount ? (
                      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 gap-1">
                        <UserCheck className="h-3 w-3" />
                        {t("common.active")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <UserX className="h-3 w-3" />
                        {t("common.invited")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteContact.mutate(contact.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
