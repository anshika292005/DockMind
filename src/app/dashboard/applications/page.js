'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNavbar from '../../../components/DashboardNavbar';
import Sidebar from '../../../components/Sidebar';

export default function Applications() {
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
    
    if (role === 'hr') {
      router.push('/dashboard');
      return;
    }
    
    fetchApplications();
  }, [router]);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const candidateId = payload.userId;

      const res = await fetch(`http://localhost:8000/api/jobs/applications/${candidateId}`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (err) {
      console.error('Error fetching applications');
    } finally {
      setLoading(false);
    }
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
              <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
              <p className="text-gray-600 mt-2">Track your job applications and their status</p>
            </div>
            <div className="flex space-x-4">
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <span className="text-blue-600 font-semibold">{applications.length} Total Applications</span>
              </div>
              <button
                onClick={fetchApplications}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
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
                    <div className="text-sm text-gray-600">Total Applied</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{applications.filter(app => app.status === 'pending').length}</div>
                    <div className="text-sm text-gray-600">Pending</div>
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
                              <h3 className="text-xl font-semibold text-gray-900 mb-1">{application.job.title}</h3>
                              <p className="text-gray-600 font-medium">{application.job.company}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Location</p>
                              <p className="text-gray-700">{application.job.location}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Job Type</p>
                              <p className="text-gray-700 capitalize">{application.job.type}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Applied On</p>
                              <p className="text-gray-700">{new Date(application.createdAt).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">HR Contact</p>
                              <p className="text-gray-700">{application.job.hr.name}</p>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <p className="text-sm text-gray-500 mb-2">Job Description</p>
                            <p className="text-gray-700 text-sm leading-relaxed">
                              {application.job.description.length > 200 
                                ? `${application.job.description.substring(0, 200)}...` 
                                : application.job.description
                              }
                            </p>
                          </div>
                          
                          {application.response && (
                            <div className="mb-4">
                              <p className="text-sm text-gray-500 mb-2">HR Response</p>
                              <div className={`p-3 rounded-lg ${
                                application.status === 'accepted' ? 'bg-green-50 border border-green-200' :
                                application.status === 'rejected' ? 'bg-red-50 border border-red-200' :
                                'bg-blue-50 border border-blue-200'
                              }`}>
                                <p className="text-gray-700 text-sm">{application.response}</p>
                              </div>
                            </div>
                          )}
                          
                          {application.job.salary && (
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              {application.job.salary}
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
                    <p className="text-gray-500 mb-6">Start applying for jobs to track your applications here!</p>
                    <button
                      onClick={() => router.push('/dashboard/jobs')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Browse Jobs
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