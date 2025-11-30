'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNavbar from '../../../components/DashboardNavbar';
import Sidebar from '../../../components/Sidebar';

export default function CreateJob() {
  const [job, setJob] = useState({
    title: '',
    company: '',
    location: '',
    description: '',
    requirements: '',
    salary: '',
    type: 'full-time'
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const hrId = payload.userId;

      console.log('Sending job data:', job);
      console.log('HR ID:', hrId);

      const res = await fetch(`http://localhost:8000/api/jobs/create/${hrId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(job)
      });

      console.log('Response status:', res.status);
      
      if (res.ok) {
        const responseData = await res.json();
        console.log('Response data:', responseData);
        setMessage('Job created successfully!');
        setJob({
          title: '',
          company: '',
          location: '',
          description: '',
          requirements: '',
          salary: '',
          type: 'full-time'
        });
      } else {
        const responseText = await res.text();
        console.log('Error response:', responseText);
        try {
          const errorData = JSON.parse(responseText);
          setMessage(errorData.message || 'Failed to create job');
        } catch {
          setMessage(`Server error (${res.status}): API endpoint not found`);
        }
      }
    } catch (err) {
      console.error('Frontend error:', err);
      setMessage('Network error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setJob({ ...job, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <Sidebar />
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Job Posting</h1>
          
          {message && (
            <div className={`p-4 rounded-lg mb-6 ${message.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                <input
                  type="text"
                  name="title"
                  value={job.title}
                  onChange={handleChange}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                <input
                  type="text"
                  name="company"
                  value={job.company}
                  onChange={handleChange}
                  placeholder="e.g. Tech Corp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  name="location"
                  value={job.location}
                  onChange={handleChange}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Type</label>
                <select
                  name="type"
                  value={job.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Salary (Optional)</label>
              <input
                type="text"
                name="salary"
                value={job.salary}
                onChange={handleChange}
                placeholder="e.g. $80,000 - $120,000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Job Description</label>
              <textarea
                name="description"
                value={job.description}
                onChange={handleChange}
                rows={6}
                placeholder="Describe the role, responsibilities, and what you're looking for..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
              <textarea
                name="requirements"
                value={job.requirements}
                onChange={handleChange}
                rows={4}
                placeholder="List the required skills, experience, and qualifications..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
            >
              {saving ? 'Creating Job...' : 'Create Job Posting'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}