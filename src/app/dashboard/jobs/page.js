'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNavbar from '../../../components/DashboardNavbar';
import API from '@/lib/api';
import Sidebar from '../../../components/Sidebar';
import Pagination from '../../../components/Pagination';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0, limit: 10 });
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

  const fetchJobs = async (page = currentPage) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (location) params.append('location', location);
      if (company) params.append('company', company);
      if (type) params.append('type', type);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', page);
      params.append('limit', pagination.limit);
      
      const res = await fetch(`${API}/api/jobs/?${params}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setPagination(data.pagination || { total: 0, pages: 0, limit: 10 });
      } else {
        console.error('Failed to fetch jobs:', res.status);
        setJobs([]);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    setCurrentPage(1);
    fetchJobs(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setLoading(true);
    fetchJobs(page);
  };

  const clearFilters = () => {
    setSearch('');
    setLocation('');
    setCompany('');
    setType('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
    setLoading(true);
    fetchJobs(1);
  };

  const applyForJob = async (jobId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to apply for jobs');
        return;
      }
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      const candidateId = payload.userId;

      const res = await fetch(`${API}/api/jobs/apply/${jobId}/${candidateId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const responseData = await res.json();

      if (res.ok) {
        alert('Application submitted successfully!');
      } else {
        alert(responseData.message || 'Failed to apply for job');
      }
    } catch (err) {
      console.error('Error applying for job:', err);
      alert('Error applying for job. Please try again.');
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
              <input
                type="text"
                placeholder="Company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Job Types</option>
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="createdAt">Date Posted</option>
                  <option value="title">Job Title</option>
                  <option value="company">Company</option>
                  <option value="location">Location</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Order:</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search Jobs
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Clear Filters
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
          
          {!loading && jobs.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </main>
    </div>
  );
}