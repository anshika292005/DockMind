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
      return { success: false, error: e };
    } finally {
      setUploading(false);
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

  return { documents, loading, uploading, upload, remove, refresh: fetchDocuments };
}
