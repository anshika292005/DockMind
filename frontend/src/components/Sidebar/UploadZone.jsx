import React, { useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { useToast } from '../../ui/Toast';

export function UploadZone({ upload, uploading }) {
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      addToast({ message: 'Only PDF files are supported.', type: 'error' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const res = await upload(file);
    if (res.success && res.duplicate) {
      addToast({ message: `${file.name} was already uploaded`, type: 'info' });
    } else if (res.success) {
      addToast({ message: `PDF uploaded — ${res.doc.chunk_count} chunks stored`, type: 'success' });
    } else {
      addToast({ message: 'Upload failed. Try again.', type: 'error' });
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-4 border-t border-border mt-auto">
      <input 
        type="file" 
        accept=".pdf"
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 bg-violet hover:bg-violet/90 text-white font-medium py-2.5 px-4 rounded-md transition-colors disabled:opacity-50"
      >
        <UploadCloud size={18} />
        {uploading ? 'Uploading...' : 'Upload PDF'}
      </button>
    </div>
  );
}
