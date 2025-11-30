'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNavbar from '../../../components/DashboardNavbar';
import Sidebar from '../../../components/Sidebar';

export default function ManageJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchJobs();
  }, [router]);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const hrId = payload.userId;
      
      const res = await fetch(`http://localhost:8000/api/jobs/hr/${hrId}`);
      if (res.ok) {
        const jobsData = await res.json();
        
        // Fetch application counts for each job
        const jobsWithApplications = await Promise.all(
          jobsData.map(async (job) => {
            try {
              const appRes = await fetch(`http://localhost:8000/api/jobs/${job.id}/applications`);
              if (appRes.ok) {
                const applications = await appRes.json();
                return { ...job, applicationCount: applications.length };
              }
            } catch (err) {
              console.error('Error fetching applications for job', job.id);
            }
            return { ...job, applicationCount: 0 };
          })
        );
        
        setJobs(jobsWithApplications);
      }
    } catch (err) {
      console.error('Error fetching jobs');
    } finally {
      setLoading(false);
    }
  };

  const deleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    try {
      const res = await fetch(`http://localhost:8000/api/jobs/${jobId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setJobs(jobs.filter(job => job.id !== jobId));
        alert('Job deleted successfully');
      }
    } catch (err) {
      alert('Error deleting job');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <Sidebar />
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Manage Jobs</h1>
          
          {loading ? (
            <div className="text-center">Loading jobs...</div>
          ) : (
            <div className="space-y-6">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{job.title}</h3>
                      <p className="text-gray-600 mb-2">{job.company} • {job.location}</p>
                      <p className="text-gray-700 mb-4">{job.description.substring(0, 200)}...</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{job.type}</span>
                        {job.salary && <span>• {job.salary}</span>}
                        <span>• {job.applicationCount || 0} applications</span>
                        <span>• Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="ml-6 space-x-2">
                      <button
                        onClick={() => router.push(`/dashboard/edit-job/${job.id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteJob(job.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {jobs.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No jobs posted yet. Create your first job posting!
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}