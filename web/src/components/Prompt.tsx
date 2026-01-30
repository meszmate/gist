import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import toast from 'react-hot-toast';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupTextarea,
} from './ui/input-group';
import { FileUpIcon, X, ChevronDown, ChevronUp, Folder } from 'lucide-react';
import { Spinner } from './ui/spinner';
import { formatBytes } from '@/lib/formatBytes';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { Folder as FolderType } from '@/lib/api';
import {
    validateFile,
    validateTotalSize,
    validateContentLength,
    type FileProcessingResult,
} from '@/lib/fileUtils';

export interface AIInputData {
    text: string;
    options: { summary: boolean; flashcards: boolean; quiz: boolean };
    difficulty: 'beginner' | 'standard' | 'advanced';
    flashcardCount: number;
    quizCount: number;
    turnstile: string;
    folderId?: string;
}

interface AIInputProps {
    onSubmit: (data: AIInputData) => Promise<void>;
    folders?: FolderType[];
}

type Difficulty = 'beginner' | 'standard' | 'advanced';

export function AIInput({ onSubmit, folders = [] }: AIInputProps) {
    const { t } = useTranslation();
    const [inputText, setInputText] = React.useState('');
    const [files, setFiles] = React.useState<FileList | null>(null);
    const [options, setOptions] = React.useState({
        summary: true,
        flashcards: true,
        quiz: true,
    });
    const [difficulty, setDifficulty] = React.useState<Difficulty>('standard');
    const [flashcardCount, setFlashcardCount] = React.useState(10);
    const [quizCount, setQuizCount] = React.useState(5);
    const [selectedFolderId, setSelectedFolderId] = React.useState<string>('');
    const [showAdvanced, setShowAdvanced] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [showTurnstile, setShowTurnstile] = React.useState(false);
    const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
    const [processingFiles, setProcessingFiles] = React.useState<string[]>([]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const turnstileRef = React.useRef<TurnstileInstance | null>(null);
    const abortControllerRef = React.useRef<AbortController | null>(null);

    const handleOptionChange = (opt: keyof typeof options) => {
        setOptions((p) => ({ ...p, [opt]: !p[opt] }));
    };

    // Cleanup abort controller on unmount
    React.useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    const removeFile = (index: number) => {
        if (!files) return;
        const dt = new DataTransfer();
        Array.from(files)
            .filter((_, i) => i !== index)
            .forEach((f) => dt.items.add(f));
        setFiles(dt.files);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = e.target.files;
        if (!newFiles || newFiles.length === 0) return;

        // Validate each file
        const validFiles: File[] = [];
        for (const file of Array.from(newFiles)) {
            const validation = validateFile(file);
            if (!validation.valid) {
                toast.error(`${file.name}: ${t(`files.${validation.error}`)}`);
            } else {
                validFiles.push(file);
            }
        }

        if (validFiles.length === 0) {
            e.target.value = '';
            return;
        }

        // Combine with existing files and validate total size
        const existingFiles = files ? Array.from(files) : [];
        const allFiles = [...existingFiles, ...validFiles];
        const totalValidation = validateTotalSize(allFiles);

        if (!totalValidation.valid) {
            toast.error(t(`files.${totalValidation.error}`));
            e.target.value = '';
            return;
        }

        // Create new FileList with all files
        const dt = new DataTransfer();
        allFiles.forEach((f) => dt.items.add(f));
        setFiles(dt.files);
        e.target.value = '';
    };

    const openFilePicker = () => fileInputRef.current?.click();

    const extractTextFromFile = async (file: File): Promise<string> => {
        const fileType = file.type;
        const fileName = file.name.toLowerCase();
        if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
            return new Promise((res, rej) => {
                const r = new FileReader();
                r.onload = (e) => res(e.target?.result as string);
                r.onerror = rej;
                r.readAsText(file);
            });
        }
        if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
            return new Promise((res, rej) => {
                const r = new FileReader();
                r.onload = async (e) => {
                    try {
                        const buf = e.target?.result as ArrayBuffer;
                        const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
                        let txt = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            txt += content.items.map((it) => ('str' in it ? (it as { str: string }).str : '')).join(' ') + '\n';
                        }
                        res(txt);
                    } catch (err) {
                        rej(err);
                    }
                };
                r.onerror = rej;
                r.readAsArrayBuffer(file);
            });
        }
        if (
            fileType ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            fileName.endsWith('.docx')
        ) {
            return new Promise((res, rej) => {
                const r = new FileReader();
                r.onload = async (e) => {
                    try {
                        const buf = e.target?.result as ArrayBuffer;
                        const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
                        res(value);
                    } catch (err) {
                        rej(err);
                    }
                };
                r.onerror = rej;
                r.readAsArrayBuffer(file);
            });
        }
        throw new Error(`Unsupported file type: ${file.type}`);
    };

    const processFiles = async (fileList: File[]): Promise<FileProcessingResult[]> => {
        const results: FileProcessingResult[] = [];

        for (const file of fileList) {
            // Check if aborted
            if (abortControllerRef.current?.signal.aborted) {
                break;
            }

            setProcessingFiles((prev) => [...prev, file.name]);

            try {
                const text = await extractTextFromFile(file);
                results.push({ fileName: file.name, success: true, text });
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                results.push({ fileName: file.name, success: false, error: errorMsg });
                toast.error(`${t('files.extractionFailed')}: ${file.name}`);
            } finally {
                setProcessingFiles((prev) => prev.filter((name) => name !== file.name));
            }
        }

        return results;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() && (!files || files.length === 0)) return;

        // Show Turnstile if not verified
        if (!turnstileToken) {
            setShowTurnstile(true);
            return;
        }

        // Create new abort controller for this submission
        abortControllerRef.current = new AbortController();

        setIsLoading(true);
        try {
            let combined = inputText.trim();
            if (files?.length) {
                const allowed = Array.from(files).filter((f) => {
                    const validation = validateFile(f);
                    return validation.valid;
                });

                const results = await processFiles(allowed);

                // Report if some files failed
                const failedCount = results.filter((r) => !r.success).length;
                if (failedCount > 0 && results.some((r) => r.success)) {
                    toast.error(t('errors.fileFailed'));
                }

                const successfulTexts = results
                    .filter((r) => r.success && r.text?.trim())
                    .map((r) => r.text!);

                if (successfulTexts.length) {
                    combined += (combined ? '\n\n---\n\n' : '') + successfulTexts.join('\n\n---\n\n');
                }
            }

            if (!combined.trim()) return;

            // Validate combined content length
            const contentValidation = validateContentLength(combined);
            if (!contentValidation.valid) {
                toast.error(t(`files.${contentValidation.error}`));
                return;
            }

            await onSubmit({
                text: combined,
                options,
                difficulty,
                flashcardCount,
                quizCount,
                turnstile: turnstileToken,
                folderId: selectedFolderId || undefined,
            });
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
            setTurnstileToken(null);
            setProcessingFiles([]);
            turnstileRef.current?.reset?.();
            abortControllerRef.current = null;
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="w-full mx-auto p-4 sm:p-6">
                <InputGroup className="w-full rounded-3xl sm:rounded-4xl p-5 bg-white dark:bg-neutral-900 shadow-sm">
                    <InputGroupTextarea
                        id="text-input"
                        placeholder={t('prompt.placeholder')}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="min-h-32 resize-none"
                    />

                    <InputGroupAddon
                        align="block-end"
                        className="flex flex-col gap-4 p-4 sm:p-0 sm:flex-row sm:items-center sm:gap-6"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".txt,.pdf,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        <InputGroupButton
                            variant="outline"
                            onClick={openFilePicker}
                            className="rounded-full h-12 w-12 flex items-center justify-center shrink-0"
                            asChild
                        >
                            <span>
                                <FileUpIcon className="h-5 w-5" />
                                <span className="sr-only">{t('files.uploadFiles')}</span>
                            </span>
                        </InputGroupButton>

                        {files && files.length > 0 && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground text-center sm:text-left mb-1">
                                    {files.length} {t('files.selected')}
                                </p>
                                <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 max-h-24 overflow-y-auto">
                                    {Array.from(files).map((f, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1 text-xs whitespace-nowrap"
                                        >
                                            <span className="truncate max-w-28 sm:max-w-40">{f.name}</span>
                                            <span className="text-muted-foreground">({formatBytes(f.size)})</span>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(i)}
                                                className="ml-1 text-destructive hover:text-destructive/80"
                                                aria-label={`Remove ${f.name}`}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {processingFiles.length > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                                        <Spinner className="h-3 w-3" />
                                        <span>{t('files.processing')}: {processingFiles.join(', ')}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col gap-3 sm:gap-2">
                            <Label className="text-sm w-full font-medium text-center">{t('prompt.options')}</Label>
                            <div className="flex flex-wrap gap-4 sm:gap-6">
                                {(['summary', 'flashcards', 'quiz'] as const).map((k) => (
                                    <div key={k} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={k}
                                            checked={options[k]}
                                            onCheckedChange={() => handleOptionChange(k)}
                                        />
                                        <Label htmlFor={k} className="cursor-pointer text-sm">
                                            {t(`prompt.include${k.charAt(0).toUpperCase() + k.slice(1)}`)}
                                        </Label>
                                    </div>
                                ))}
                            </div>

                            {/* Advanced options toggle */}
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
                            >
                                {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                {t('prompt.difficulty')} & {t('prompt.options')}
                            </button>

                            {/* Advanced options */}
                            {showAdvanced && (
                                <div className="space-y-4 pt-2 border-t">
                                    {/* Folder selector */}
                                    {folders.length > 0 && (
                                        <div>
                                            <Label className="text-sm mb-2 block">{t('prompt.saveToFolder')}</Label>
                                            <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={t('prompt.noFolder')}>
                                                        {selectedFolderId ? (
                                                            <span className="flex items-center gap-2">
                                                                <span
                                                                    className="w-3 h-3 rounded-full"
                                                                    style={{ backgroundColor: folders.find(f => f.id === selectedFolderId)?.color }}
                                                                />
                                                                {folders.find(f => f.id === selectedFolderId)?.name}
                                                            </span>
                                                        ) : (
                                                            t('prompt.noFolder')
                                                        )}
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">
                                                        <span className="flex items-center gap-2">
                                                            <Folder className="h-4 w-4 text-muted-foreground" />
                                                            {t('prompt.noFolder')}
                                                        </span>
                                                    </SelectItem>
                                                    {folders.map((folder) => (
                                                        <SelectItem key={folder.id} value={folder.id}>
                                                            <span className="flex items-center gap-2">
                                                                <span
                                                                    className="w-3 h-3 rounded-full"
                                                                    style={{ backgroundColor: folder.color }}
                                                                />
                                                                {folder.name}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {/* Difficulty selector */}
                                    <div>
                                        <Label className="text-sm mb-2 block">{t('prompt.difficulty')}</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {(['beginner', 'standard', 'advanced'] as const).map((d) => (
                                                <Button
                                                    key={d}
                                                    type="button"
                                                    variant={difficulty === d ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setDifficulty(d)}
                                                >
                                                    {t(`prompt.${d}`)}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Flashcard count */}
                                    {options.flashcards && (
                                        <div>
                                            <Label className="text-sm mb-2 block">
                                                {t('prompt.flashcardCount')}: {flashcardCount}
                                            </Label>
                                            <Slider
                                                value={[flashcardCount]}
                                                onValueChange={([v]) => setFlashcardCount(v)}
                                                min={5}
                                                max={30}
                                                step={5}
                                            />
                                        </div>
                                    )}

                                    {/* Quiz count */}
                                    {options.quiz && (
                                        <div>
                                            <Label className="text-sm mb-2 block">
                                                {t('prompt.quizCount')}: {quizCount}
                                            </Label>
                                            <Slider
                                                value={[quizCount]}
                                                onValueChange={([v]) => setQuizCount(v)}
                                                min={3}
                                                max={15}
                                                step={1}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <InputGroupButton
                            variant={"default"}
                            type="submit"
                            disabled={isLoading || (!inputText.trim() && (!files || files.length === 0))}
                            className="w-full sm:w-auto ml-auto rounded-full h-12 px-6 text-base flex items-center justify-center gap-2"
                        >
                            {isLoading && <Spinner className="h-4 w-4" />}
                            {isLoading ? t('prompt.generating') : t('prompt.generate')}
                            <span className="sr-only">{t('common.submit')}</span>
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
            </form>

            {/* Turnstile Modal */}
            <Dialog open={showTurnstile} onOpenChange={setShowTurnstile}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('turnstile.title')}</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center py-6">
                        <Turnstile
                            ref={turnstileRef}
                            siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                            onSuccess={(token) => {
                                setTurnstileToken(token);
                                setShowTurnstile(false);
                                // Auto-submit after verification
                                setTimeout(() => {
                                    const form = document.querySelector('form');
                                    form?.requestSubmit();
                                }, 300);
                            }}
                            onError={() => {
                                setTurnstileToken(null);
                            }}
                            onExpire={() => {
                                setTurnstileToken(null);
                            }}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setShowTurnstile(false);
                                setTurnstileToken(null);
                                turnstileRef.current?.reset?.();
                            }}
                        >
                            {t('common.cancel')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
