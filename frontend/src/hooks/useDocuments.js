import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle');

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDocuments();
      const docs = res.data?.documents ?? res.data ?? [];
      if (Array.isArray(docs)) {
        setDocuments(
          docs.map((doc, index) => ({
            id: `${doc.filename || index}`,
            filename: doc.filename,
            chunk_count: doc.chunks_stored ?? doc.chunk_count ?? 0,
            uploaded_at: doc.upload_timestamp ?? doc.uploaded_at ?? null,
          }))
        );
      }
    } catch (e) {
      console.error("Failed to fetch docs, using mock data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const upload = async (file) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');
    try {
      const res = await api.uploadDocument(file, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          const percent = Math.min(
            99,
            Math.round((event.loaded / event.total) * 100)
          );
          setUploadProgress(percent);
        },
      });

      setUploadStatus('processing');
      setUploadProgress(100);

      const payload = res.data || {};
      const newDoc = {
        id: payload.filename || file.name,
        filename: payload.filename || file.name,
        chunk_count: payload.chunks_stored ?? 0,
        uploaded_at: payload.upload_timestamp || new Date().toISOString(),
      };
      setDocuments(prev => {
        const filtered = prev.filter(doc => doc.filename !== newDoc.filename);
        return [newDoc, ...filtered];
      });

      // Refresh in the background so the UI does not stay stuck on a slow list fetch.
      void fetchDocuments().catch((e) => {
        console.error('Background document refresh failed:', e);
      });

      return {
        success: true,
        duplicate: payload.status === 'duplicate',
        doc: newDoc,
      };
    } catch (e) {
      setUploadStatus('error');
      return { success: false, error: e };
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus('idle');
    }
  };

  const remove = async (filename) => {
    try {
      await api.deleteDocument(filename);
      void fetchDocuments().catch((e) => {
        console.error('Background document refresh failed:', e);
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e };
    }
  };

  return {
    documents,
    loading,
    uploading,
    uploadProgress,
    uploadStatus,
    upload,
    remove,
    refresh: fetchDocuments,
  };
}
