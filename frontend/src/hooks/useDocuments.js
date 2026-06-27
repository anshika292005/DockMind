import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const uploadProgressTimerRef = useRef(null);

  const stopUploadProgressTimer = useCallback(() => {
    if (uploadProgressTimerRef.current) {
      window.clearInterval(uploadProgressTimerRef.current);
      uploadProgressTimerRef.current = null;
    }
  }, []);

  const startUploadProgressTimer = useCallback(() => {
    stopUploadProgressTimer();
    uploadProgressTimerRef.current = window.setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        if (prev < 15) return prev + 2;
        if (prev < 55) return prev + 1;
        return Math.min(prev + 0.5, 90);
      });
    }, 700);
  }, [stopUploadProgressTimer]);

  const waitForUploadJob = useCallback(async (jobId) => {
    const startedAt = Date.now();
    const timeoutMs = 10 * 60 * 1000;

    while (Date.now() - startedAt < timeoutMs) {
      const res = await api.getUploadJob(jobId);
      const job = res.data || {};
      const progress = Number(job.progress);

      if (Number.isFinite(progress)) {
        setUploadProgress(Math.max(95, Math.min(progress, 100)));
      }

      if (job.status === 'success' || job.status === 'duplicate') {
        return job.result || job;
      }

      if (job.status === 'error') {
        throw new Error(job.message || 'Upload processing failed.');
      }

      await new Promise(resolve => window.setTimeout(resolve, 2000));
    }

    throw new Error('Upload processing timed out. Please try a smaller PDF.');
  }, []);

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

  useEffect(() => {
    return () => stopUploadProgressTimer();
  }, [stopUploadProgressTimer]);

  const upload = async (file) => {
    setUploading(true);
    setUploadProgress(8);
    setUploadStatus('connecting');
    startUploadProgressTimer();
    try {
      const res = await api.uploadDocument(file, {
        onUploadProgress: (event) => {
          setUploadStatus('uploading');
          if (!event.total) {
            setUploadProgress(prev => Math.max(prev, 25));
            return;
          }

          const percent = Math.round((event.loaded / event.total) * 100);
          if (percent >= 100) {
            setUploadStatus('processing');
            setUploadProgress(prev => Math.max(prev, 95));
            return;
          }

          setUploadProgress(prev => Math.max(prev, Math.min(percent, 95)));
        },
      });

      stopUploadProgressTimer();
      setUploadStatus('processing');
      setUploadProgress(95);

      const uploadPayload = res.data || {};
      const payload = uploadPayload.job_id
        ? await waitForUploadJob(uploadPayload.job_id)
        : uploadPayload;

      setUploadProgress(100);
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
      stopUploadProgressTimer();
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
