import React, { useState } from 'react';
import { UploadZone } from './UploadZone';
import { DocumentItem } from './DocumentItem';
import { useDocuments } from '../../hooks/useDocuments';
import { FileUp, Files, Brain } from 'lucide-react';
import { useToast } from '../../ui/Toast';

export function DocumentManager({ memory }) {
  const { documents, loading, upload, uploading, uploadProgress, uploadStatus, remove } = useDocuments();
  const [isDragging, setIsDragging] = useState(false);
  const { addToast } = useToast();

  const { behaviorProfile = {}, resetMemory } = memory || {};

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files || []);
    const file = files[0];
    if (!file) return;

    if (files.length > 1) {
      addToast({ message: 'Upload one PDF at a time.', type: 'error' });
      return;
    }

    if (file.type !== 'application/pdf') {
      addToast({ message: 'Only PDF files are supported.', type: 'error' });
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
  };

  const profileKeys = Object.keys(behaviorProfile).filter(k => behaviorProfile[k]);

  return (
    <div 
      className="flex flex-col h-full w-full relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* === DOCUMENTS SECTION === */}
      <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-5">

        {/* Documents */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Files size={12} className="text-text-muted" />
            <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Documents & Chats
            </h2>
            {documents.length > 0 && (
              <span className="ml-auto text-[10px] font-mono bg-violet/10 text-violet px-1.5 py-0.5 rounded-full">
                {documents.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-10 bg-base rounded w-full" />
              <div className="h-10 bg-base rounded w-full" />
            </div>
          ) : documents.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center gap-2">
              <FileUp className="text-text-muted mb-1" size={24} />
              <p className="text-sm text-text-muted">Drop a PDF or click to upload</p>
              <p className="text-xs text-text-muted/60">Chat history appears under each document</p>
            </div>
          ) : (
            <div className="space-y-1">
              {documents.map((doc, idx) => (
                <DocumentItem
                  key={doc.id || doc.filename}
                  doc={doc}
                  index={idx}
                  memory={memory}
                  remove={remove}
                />
              ))}
            </div>
          )}
        </div>

        {/* === MEMORY PROFILE SECTION === */}
        {profileKeys.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Brain size={12} className="text-teal" />
              <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Learned Preferences
              </h2>
            </div>
            <div className="space-y-1.5">
              {profileKeys.map(key => (
                <div key={key} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-teal/5 border border-teal/10">
                  <span className="text-[10px] text-text-muted capitalize shrink-0 w-20 truncate">{key.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-text-primary truncate font-medium">
                    {Array.isArray(behaviorProfile[key])
                      ? behaviorProfile[key].join(', ')
                      : String(behaviorProfile[key])}
                  </span>
                </div>
              ))}
              <button
                onClick={resetMemory}
                className="w-full mt-1 text-[10px] text-text-muted hover:text-red-400 transition-colors text-center py-1"
              >
                Reset memory profile
              </button>
            </div>
          </div>
        )}
      </div>

      <UploadZone
        upload={upload}
        uploading={uploading}
        uploadProgress={uploadProgress}
        uploadStatus={uploadStatus}
      />

      {isDragging && (
        <div className="absolute inset-0 z-50 bg-violet/10 border-2 border-violet border-dashed flex items-center justify-center rounded-lg m-2 backdrop-blur-sm pointer-events-none">
          <div className="bg-surface px-4 py-2 rounded shadow flex items-center gap-2">
            <FileUp className="text-violet" size={20} />
            <span className="font-medium text-text-primary">Drop PDF to upload</span>
          </div>
        </div>
      )}
    </div>
  );
}
