import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FileUpload = ({ onFileSelect, disabled }) => {
  const [file, setFile] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (selectedFile.size > 50 * 1024 * 1024) { // 50MB
        alert("File is too large! Max size is 50MB.");
        return;
      }
      setFile(selectedFile);
      onFileSelect(selectedFile);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    disabled,
  });

  const removeFile = (e) => {
    e.stopPropagation();
    setFile(null);
    onFileSelect(null);
  };

  return (
    <div
      {...getRootProps()}
      className={`relative w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
        ${isDragActive ? 'border-orange-500 bg-orange-500/10' : 'border-gray-300 hover:border-orange-500'}
        ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <input {...getInputProps()} />
      <AnimatePresence>
        {file ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <FileIcon className="w-8 h-8 text-orange-500" />
              <div className="text-left">
                <p className="font-medium text-navy-900 truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-navy-600">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
              aria-label="Remove file"
              disabled={disabled}
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center space-y-3 text-center"
          >
            <UploadCloud className="w-10 h-10 text-orange-500" />
            <p className="text-navy-700">
              <span className="font-semibold text-orange-500">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-navy-600">CSV, XLS, or XLSX (max. 50MB)</p>
            <p className="text-xs text-navy-600">For files exceeding 50MB, contact us over email for a transfer and exclude the file from your order.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;