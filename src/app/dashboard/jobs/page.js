'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNavbar from '../../../components/DashboardNavbar';
import Sidebar from '../../../components/Sidebar';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    
    if (!token) {
      router.push('/login');
      return;
    }
    
    if (role === 'hr') {
      router.push('/dashboard');
      return;
    }
    
    fetchJobs();
  }, [router]);

  const fetchJobs = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (location) params.append('location', location);
      
      const res = await fetch(`http://localhost:8000/api/jobs/?${params}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error('Error fetching jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    fetchJobs();
  };

  const applyForJob = async (jobId) => {
    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const candidateId = payload.userId;

      console.log('Applying for job:', { jobId, candidateId });

      const res = await fetch(`http://localhost:8000/api/jobs/apply/${jobId}/${candidateId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const responseData = await res.json();
      console.log('Application response:', responseData);

      if (res.ok) {
        alert('Application submitted successfully!');
      } else {
        alert(responseData.message || 'Already applied or error occurred');
      }
    } catch (err) {
      console.error('Error applying for job:', err);
      alert('Error applying for job');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <Sidebar />
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Find Jobs</h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Job title or keywords"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search Jobs
              </button>
            </div>
          </div>

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
                        <span>• Posted by {job.hr.name}</span>
                      </div>
                    </div>
                    <div className="ml-6">
                      <button
                        onClick={() => applyForJob(job.id)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Apply Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {jobs.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No jobs found. Try adjusting your search criteria.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}