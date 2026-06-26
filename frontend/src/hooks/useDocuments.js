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

      await fetchDocuments();

      if (payload.status === 'duplicate') {
        return {
          success: true,
          duplicate: true,
          doc: {
            id: payload.filename || file.name,
            filename: payload.filename || file.name,
            chunk_count: 0,
            uploaded_at: new Date().toISOString(),
          },
        };
      }

      const newDoc = {
        id: payload.filename || file.name,
        filename: payload.filename || file.name,
        chunk_count: payload.chunks_stored ?? 0,
        uploaded_at: payload.upload_timestamp || new Date().toISOString(),
      };
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
      await fetchDocuments();
      return { success: true };
    } catch (e) {
      return { success: false, error: e };
    }
  };

  return { documents, loading, uploading, upload, remove, refresh: fetchDocuments };
}
