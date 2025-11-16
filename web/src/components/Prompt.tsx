import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import * as pdfjs from "pdfjs-dist"
import mammoth from "mammoth"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "./ui/input-group"
import { FileUpIcon } from "lucide-react"
import ProcessingModal from "./ProcessingModal"
import { Spinner } from "./ui/spinner"

interface AIInputProps {
    onSubmit: (data: {
        text: string
        options: {
            summary: boolean
            flashcards: boolean
            quiz: boolean
        }
    }) => void
}

export function AIInput({ onSubmit }: AIInputProps) {
    const [inputText, setInputText] = React.useState<string>("")
    const [files, setFiles] = React.useState<FileList | null>(null)
    const [options, setOptions] = React.useState({
        summary: true,
        flashcards: true,
        quiz: true,
    })
    const [isLoading, setIsLoading] = React.useState(false)

    const handleOptionChange = (option: keyof typeof options) => {
        setOptions((prev) => ({ ...prev, [option]: !prev[option] }))
    }

    const extractTextFromFile = async (file: File): Promise<string> => {
        const fileType = file.type
        const fileName = file.name.toLowerCase()

        // Text files
        if (fileType === "text/plain" || fileName.endsWith(".txt")) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = (e) => resolve(e.target?.result as string)
                reader.onerror = reject
                reader.readAsText(file)
            })
        }

        // PDF files
        if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target?.result as ArrayBuffer
                        const uint8Array = new Uint8Array(arrayBuffer)
                        const pdf = await pdfjs.getDocument({ data: uint8Array }).promise
                        let fullText = ""

                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i)
                            const content = await page.getTextContent()
                            const pageText = content.items
                                .map((item) => ("str" in item ? item.str : ""))
                                .join(" ")
                            fullText += pageText + "\n"
                        }
                        resolve(fullText)
                    } catch (err) {
                        reject(err)
                    }
                }
                reader.onerror = reject
                reader.readAsArrayBuffer(file)
            })
        }

        // DOCX files
        if (
            fileType ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            fileName.endsWith(".docx")
        ) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target?.result as ArrayBuffer
                        const result = await mammoth.extractRawText({ arrayBuffer })
                        resolve(result.value)
                    } catch (err) {
                        reject(err)
                    }
                }
                reader.onerror = reject
                reader.readAsArrayBuffer(file)
            })
        }

        throw new Error(`Unsupported file type: ${file.type}`)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputText.trim() && (!files || files.length === 0)) return

        setIsLoading(true)
        try {
            let combinedText = inputText.trim()

            if (files && files.length > 0) {
                const validFiles = Array.from(files).filter((file) => {
                    const ext = file.name.toLowerCase().split(".").pop()
                    return ["txt", "pdf", "docx"].includes(ext || "")
                })

                if (validFiles.length > 0) {
                    const fileTexts = await Promise.all(
                        validFiles.map((file) => extractTextFromFile(file).catch(() => ""))
                    )
                    const nonEmptyTexts = fileTexts.filter((t) => t.trim())
                    if (nonEmptyTexts.length > 0) {
                        combinedText +=
                            (combinedText ? "\n\n" : "") + nonEmptyTexts.join("\n\n---\n\n")
                    }
                }
            }

            if (!combinedText.trim()) {
                // Optionally show error
                return
            }

            onSubmit({ text: combinedText, options })
        } catch (err) {
            console.error("Error processing files:", err)
            // You might want to show a toast/notification here
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <form onSubmit={handleSubmit} className="w-full mx-auto p-6">
                <InputGroup className="w-full p-3 rounded-4xl bg-white">
                    <InputGroupTextarea
                        id="text-input"
                        placeholder="Paste your text here, or upload files below..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                    />

                    <InputGroupAddon align="block-end" className="w-full space-x-5">
                        <div className="relative">
                            <Input
                                id="file-upload"
                                type="file"
                                multiple
                                accept=".txt,.pdf,.docx"
                                onChange={(e) => setFiles(e.target.files)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />

                            <InputGroupButton
                                variant="outline"
                                className="rounded-full h-12 w-14 flex items-center justify-center"
                                asChild
                            >
                                <span>
                                    <FileUpIcon className="h-5 w-5" />
                                    <span className="sr-only">Upload files</span>
                                </span>
                            </InputGroupButton>
                        </div>
                        <p className="text-xs max-w-24 text-muted-foreground">
                            Supported: .txt, .pdf, .docx
                        </p>

                        <div className="space-y-3">
                            <Label>Generate</Label>
                            <div className="flex flex-wrap gap-6">
                                {(['summary', 'flashcards', 'quiz'] as const).map((key) => (
                                    <div key={key} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={key}
                                            checked={options[key]}
                                            onCheckedChange={() => handleOptionChange(key)}
                                        />
                                        <Label htmlFor={key} className="cursor-pointer capitalize">
                                            {key === 'quiz' ? 'Quiz Questions' : key}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>


                        <InputGroupButton
                            variant="default"
                            onClick={() => setIsLoading(true)}
                            className="rounded-full gap-2 ml-auto h-12 w-38 text-[16px] cursor-pointer flex items-center justify-center"
                        >
                            {isLoading &&
                                <Spinner />
                            }
                            Generate
                            <span className="sr-only">Send</span>
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
            </form>
            <ProcessingModal isOpen={isLoading} />
        </>
    )
}
