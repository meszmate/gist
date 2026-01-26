import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Folder,
  Tag,
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Edit2,
  Share2,
  FileText,
  Brain,
  HelpCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { materialsApi, foldersApi, tagsApi, Material, Folder as FolderType, Tag as TagType } from '@/lib/api';
import { formatDate } from '@/lib/i18n';
import toast from 'react-hot-toast';

export function Library() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(searchParams.get('folder'));
  const [newFolderName, setNewFolderName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewTagDialog, setShowNewTagDialog] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [materialsRes, foldersRes, tagsRes] = await Promise.all([
          materialsApi.list({
            folder_id: selectedFolder || undefined,
            search: searchQuery || undefined,
          }),
          foldersApi.list(),
          tagsApi.list(),
        ]);
        setMaterials(materialsRes.data.materials || []);
        setFolders(foldersRes.data.folders || []);
        setTags(tagsRes.data.tags || []);
      } catch (error) {
        console.error('Failed to fetch library data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedFolder, searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      setSearchParams({ search: query });
    } else {
      searchParams.delete('search');
      setSearchParams(searchParams);
    }
  };

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolder(folderId);
    if (folderId) {
      setSearchParams({ folder: folderId });
    } else {
      searchParams.delete('folder');
      setSearchParams(searchParams);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const res = await foldersApi.create({ name: newFolderName });
      setFolders([...folders, res.data]);
      setNewFolderName('');
      setShowNewFolderDialog(false);
      toast.success(t('common.create') + ' ' + t('library.folders').toLowerCase());
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const res = await tagsApi.create({ name: newTagName });
      setTags([...tags, res.data]);
      setNewTagName('');
      setShowNewTagDialog(false);
      toast.success(t('common.create') + ' ' + t('library.tags').toLowerCase());
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      await materialsApi.delete(id);
      setMaterials(materials.filter((m) => m.id !== id));
      toast.success(t('common.delete'));
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const handleShareMaterial = async (id: string) => {
    try {
      const res = await materialsApi.share(id);
      await navigator.clipboard.writeText(res.data.share_url);
      toast.success(t('export.linkCopied'));
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{t('library.title')}</h1>
        <Link to="/">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('common.create')}
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[250px_1fr]">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Folders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Folder className="h-4 w-4" />
                {t('library.folders')}
              </h3>
              <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('library.newFolder')}</DialogTitle>
                  </DialogHeader>
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder={t('library.newFolder')}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <Button onClick={handleCreateFolder}>{t('common.create')}</Button>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleFolderSelect(null)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  !selectedFolder ? 'bg-accent' : 'hover:bg-accent/50'
                }`}
              >
                {t('library.allMaterials')}
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleFolderSelect(folder.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 ${
                    selectedFolder === folder.id ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: folder.color }}
                  />
                  {folder.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {t('library.tags')}
              </h3>
              <Dialog open={showNewTagDialog} onOpenChange={setShowNewTagDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('library.newTag')}</DialogTitle>
                  </DialogHeader>
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder={t('library.newTag')}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                  />
                  <Button onClick={handleCreateTag}>{t('common.create')}</Button>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs"
                  style={{ backgroundColor: tag.color + '20', color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Materials Grid */}
        <div>
          {materials.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('library.noMaterials')}</h3>
                <p className="text-muted-foreground mb-4">{t('library.createFirst')}</p>
                <Link to="/">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('common.create')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {materials.map((material) => (
                <Card key={material.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <Link to={`/${material.id}`} className="flex-1">
                        <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                          {material.title}
                        </CardTitle>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/${material.id}/edit`}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              {t('common.edit')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareMaterial(material.id)}>
                            <Share2 className="mr-2 h-4 w-4" />
                            {t('export.share')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteMaterial(material.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {material.summary}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        {material.flashcards && material.flashcards.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Brain className="h-3 w-3" />
                            {material.flashcards.length}
                          </span>
                        )}
                        {material.quiz_questions && material.quiz_questions.length > 0 && (
                          <span className="flex items-center gap-1">
                            <HelpCircle className="h-3 w-3" />
                            {material.quiz_questions.length}
                          </span>
                        )}
                      </div>
                      <span>{formatDate(material.created_at)}</span>
                    </div>
                    {material.tags && material.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {material.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                            style={{ backgroundColor: tag.color + '20', color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
