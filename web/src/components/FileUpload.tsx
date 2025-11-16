import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
    onFilesUpload: (files: File[]) => void;
    existingFiles: File[];
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesUpload, existingFiles }) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        onFilesUpload([...existingFiles, ...acceptedFiles]);
    }, [onFilesUpload, existingFiles]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/plain': ['.txt'],
            'text/markdown': ['.md'],
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/csv': ['.csv']
        },
        maxSize: 10 * 1024 * 1024 // 10MB
    });

    const removeFile = (index: number) => {
        const newFiles = existingFiles.filter((_, i) => i !== index);
        onFilesUpload(newFiles);
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
                <Upload className="w-5 h-5 inline mr-2 text-purple-600" />
                Upload files (optional)
            </label>

            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
            >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-2">
                    {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
                </p>
                <p className="text-sm text-gray-500">
                    or click to select files
                </p>
                <p className="text-xs text-gray-400 mt-2">
                    Supported: TXT, PDF, DOCX, MD, CSV (max 10MB each)
                </p>
            </div>

            {existingFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                    {existingFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center">
                                <File className="w-5 h-5 mr-2 text-gray-500" />
                                <span className="text-sm text-gray-700">{file.name}</span>
                                <span className="text-xs text-gray-500 ml-2">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                                className="h-8 w-8 p-0"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileUpload;
