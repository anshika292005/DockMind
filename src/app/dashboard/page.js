'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNavbar from '../../components/DashboardNavbar';
import Sidebar from '../../components/Sidebar';

export default function Dashboard() {
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ totalJobs: 0, applications: 0, myJobs: 0 });
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    const role = localStorage.getItem('userRole') || 'candidate';
    const name = localStorage.getItem('userName') || '';
    setUserRole(role);
    setUserName(name);
    
    fetchDashboardData(role);
  }, [router]);

  const fetchDashboardData = async (role) => {
    try {
      if (role === 'candidate') {
        // Fetch recent jobs for candidates
        const jobsRes = await fetch('http://localhost:8000/api/jobs/');
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          setJobs(jobsData.slice(0, 6)); // Show latest 6 jobs
          setStats(prev => ({ ...prev, totalJobs: jobsData.length }));
        }
        
        // Fetch application count
        const token = localStorage.getItem('token');
        const payload = JSON.parse(atob(token.split('.')[1]));
        const candidateId = payload.userId;
        
        const appsRes = await fetch(`http://localhost:8000/api/jobs/applications/${candidateId}`);
        if (appsRes.ok) {
          const appsData = await appsRes.json();
          setStats(prev => ({ ...prev, applications: appsData.length }));
        }
      } else {
        // Fetch HR's jobs and applications
        const token = localStorage.getItem('token');
        const payload = JSON.parse(atob(token.split('.')[1]));
        const hrId = payload.userId;
        
        const jobsRes = await fetch(`http://localhost:8000/api/jobs/hr/${hrId}`);
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          setJobs(jobsData.slice(0, 3)); // Show fewer jobs to make room for applications
          
          // Get all applications for HR's jobs
          const allApplications = [];
          let totalApplications = 0;
          
          for (const job of jobsData) {
            const appRes = await fetch(`http://localhost:8000/api/jobs/${job.id}/applications`);
            if (appRes.ok) {
              const applications = await appRes.json();
              totalApplications += applications.length;
              allApplications.push(...applications.slice(0, 2)); // Get latest 2 per job
            }
          }
          
          setApplications(allApplications.slice(0, 5)); // Show latest 5 applications
          
          setStats({
            myJobs: jobsData.length,
            totalApplications: totalApplications,
            activeJobs: jobsData.filter(job => new Date(job.createdAt) > new Date(Date.now() - 30*24*60*60*1000)).length
          });
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId, status) => {
    const response = prompt(`Enter response message for ${status} application (optional):`);
    
    try {
      const res = await fetch(`http://localhost:8000/api/jobs/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, response: response || '' })
      });

      if (res.ok) {
        // Refresh applications to show updated status
        const role = localStorage.getItem('userRole');
        await fetchDashboardData(role);
        alert(`Application ${status} successfully!`);
      } else {
        alert('Error updating application status');
      }
    } catch (err) {
      alert('Error updating application status');
    }
  };

  const applyForJob = async (jobId) => {
    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const candidateId = payload.userId;

      const res = await fetch(`http://localhost:8000/api/jobs/apply/${jobId}/${candidateId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        alert('Application submitted successfully!');
      } else {
        alert('Already applied or error occurred');
      }
    } catch (err) {
      alert('Error applying for job');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar />
        <Sidebar />
        <main className="ml-64 mt-14 p-6">
          <div className="text-center">Loading dashboard...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <Sidebar />
      <main className="ml-64 mt-14 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Welcome back, {userName}!</h1>
            <p className="text-gray-600 mt-1 text-sm">
              {userRole === 'candidate' ? 'Find your next opportunity' : 'Manage your job postings'}
            </p>
          </div>

          {/* Role-based Dashboard Content */}
          {userRole === 'candidate' ? (
            // CANDIDATE DASHBOARD
            <>
              {/* Stats Cards for Candidates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Available Jobs</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalJobs}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">My Applications</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.applications}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Profile Status</p>
                      <p className="text-2xl font-bold text-gray-900">Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // HR DASHBOARD
            <>
              {/* Stats Cards for HR */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">My Job Posts</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.myJobs}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Applications</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalApplications || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Posts</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeJobs || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">This Month</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeJobs || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions for HR */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">Post a New Job</h3>
                  <p className="text-blue-100 mb-4">Create and publish job openings to attract top talent</p>
                  <button
                    onClick={() => router.push('/dashboard/create-job')}
                    className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                  >
                    Create Job Post
                  </button>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">Manage Applications</h3>
                  <p className="text-green-100 mb-4">Review and manage candidate applications</p>
                  <button
                    onClick={() => router.push('/dashboard/manage-jobs')}
                    className="bg-white text-green-600 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors font-medium"
                  >
                    View Applications
                  </button>
                </div>
              </div>
              
              {/* Recent Applications Section for HR */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">Recent Applications</h2>
                    <button
                      onClick={() => router.push('/dashboard/hr-applications')}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View All
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  {applications.length > 0 ? (
                    <div className="space-y-4">
                      {applications.map((application) => (
                        <div key={application.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{application.candidate.name}</h3>
                              <p className="text-gray-600 text-sm">Applied for: {application.job.title}</p>
                              <p className="text-gray-500 text-sm">{application.candidate.email}</p>
                              <div className="flex items-center mt-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  application.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                                </span>
                                <span className="text-gray-400 text-xs ml-2">
                                  {new Date(application.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            {application.status === 'pending' && (
                              <div className="ml-4 flex space-x-2">
                                <button
                                  onClick={() => updateApplicationStatus(application.id, 'accepted')}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => updateApplicationStatus(application.id, 'rejected')}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No applications yet. Applications will appear here when candidates apply to your jobs.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Jobs Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {userRole === 'candidate' ? 'Latest Job Opportunities' : 'Recent Job Posts'}
                </h2>
                <button
                  onClick={() => router.push(userRole === 'candidate' ? '/dashboard/jobs' : '/dashboard/manage-jobs')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All
                </button>
              </div>
            </div>
            <div className="p-6">
              {jobs.length > 0 ? (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{job.title}</h3>
                          <p className="text-gray-600 mb-2">{job.company} • {job.location}</p>
                          <p className="text-gray-700 text-sm mb-3">{job.description.substring(0, 150)}...</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{job.type}</span>
                            {job.salary && <span>• {job.salary}</span>}
                            <span>• {new Date(job.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {userRole === 'candidate' && (
                          <div className="ml-4">
                            <button
                              onClick={() => applyForJob(job.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              Apply Now
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {userRole === 'candidate' ? 'No jobs available at the moment.' : 'No job posts yet. Create your first job posting!'}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
