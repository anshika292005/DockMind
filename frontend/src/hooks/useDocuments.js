import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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
    try {
      const res = await api.uploadDocument(file);
      const newDoc = {
        id: Date.now(),
        filename: res.data.filename || file.name,
        chunk_count: res.data.chunks_stored ?? 0,
        uploaded_at: new Date().toISOString()
      };
      setDocuments(prev => [...prev, newDoc]);
      return { success: true, doc: newDoc };
    } catch (e) {
      return { success: false, error: e };
    } finally {
      setUploading(false);
    }
  };

  const remove = async (filename) => {
    try {
      await api.deleteDocument(filename);
      setDocuments(prev => prev.filter(d => d.filename !== filename));
      return { success: true };
    } catch (e) {
      return { success: false, error: e };
    }
  };

  return { documents, loading, uploading, upload, remove, refresh: fetchDocuments };
}
