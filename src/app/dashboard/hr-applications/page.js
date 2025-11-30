'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNavbar from '../../../components/DashboardNavbar';
import Sidebar from '../../../components/Sidebar';

export default function HRApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    
    if (!token) {
      router.push('/login');
      return;
    }
    
    if (role === 'candidate') {
      router.push('/dashboard');
      return;
    }
    
    fetchApplications();
  }, [router]);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const hrId = payload.userId;

      console.log('HR ID:', hrId);

      // First get HR's jobs, then get applications for those jobs
      const jobsRes = await fetch(`http://localhost:8000/api/jobs/hr/${hrId}`);
      if (jobsRes.ok) {
        const jobs = await jobsRes.json();
        console.log('HR Jobs:', jobs);
        
        // Get all applications for HR's jobs
        const allApplications = [];
        for (const job of jobs) {
          console.log(`Fetching applications for job ${job.id}:`, job.title);
          const appRes = await fetch(`http://localhost:8000/api/jobs/${job.id}/applications`);
          if (appRes.ok) {
            const jobApplications = await appRes.json();
            console.log(`Applications for job ${job.id}:`, jobApplications);
            allApplications.push(...jobApplications);
          } else {
            console.log(`No applications found for job ${job.id}`);
          }
        }
        console.log('All applications:', allApplications);
        setApplications(allApplications);
      } else {
        console.log('Failed to fetch HR jobs');
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId, status, response = '') => {
    try {
      const res = await fetch(`http://localhost:8000/api/jobs/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, response })
      });

      if (res.ok) {
        // Refresh applications from database to ensure real data
        await fetchApplications();
        alert(`Application ${status} successfully!`);
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Error updating application status');
      }
    } catch (err) {
      alert('Error updating application status');
    }
  };

  const handleStatusUpdate = (applicationId, status) => {
    const response = prompt(`Enter response message for ${status} application (optional):`);
    updateApplicationStatus(applicationId, status, response || '');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <Sidebar />
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Job Applications</h1>
              <p className="text-gray-600 mt-2">Review and manage candidate applications</p>
            </div>
            <div className="bg-blue-50 px-4 py-2 rounded-lg">
              <span className="text-blue-600 font-semibold">{applications.length} Total Applications</span>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading applications...</span>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{applications.length}</div>
                    <div className="text-sm text-gray-600">Total Applications</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{applications.filter(app => app.status === 'pending').length}</div>
                    <div className="text-sm text-gray-600">Pending Review</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{applications.filter(app => app.status === 'accepted').length}</div>
                    <div className="text-sm text-gray-600">Accepted</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{applications.filter(app => app.status === 'rejected').length}</div>
                    <div className="text-sm text-gray-600">Rejected</div>
                  </div>
                </div>
              </div>

              {/* Applications List */}
              <div className="space-y-4">
                {applications.map((application) => (
                  <div key={application.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900 mb-1">{application.candidate.name}</h3>
                              <p className="text-gray-600 font-medium">Applied for: {application.job.title}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Email</p>
                              <p className="text-gray-700">{application.candidate.email}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Phone</p>
                              <p className="text-gray-700">{application.candidate.phoneNumber}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Applied On</p>
                              <p className="text-gray-700">{new Date(application.createdAt).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}</p>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <p className="text-sm text-gray-500 mb-2">Job Details</p>
                            <p className="text-gray-700 text-sm">{application.job.company} • {application.job.location} • {application.job.type}</p>
                          </div>
                          
                          <div className="mb-4">
                            {application.response && (
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-500 mb-1">Response Message:</p>
                                <p className="text-gray-700 text-sm">{application.response}</p>
                              </div>
                            )}
                          </div>
                          
                          {application.status === 'pending' && (
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleStatusUpdate(application.id, 'accepted')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(application.id, 'rejected')}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {applications.length === 0 && (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
                    <p className="text-gray-500 mb-6">Applications will appear here when candidates apply to your job postings.</p>
                    <button
                      onClick={() => router.push('/dashboard/create-job')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Job Post
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}