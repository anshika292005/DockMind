'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNavbar from '../../../components/DashboardNavbar';
import Sidebar from '../../../components/Sidebar';

export default function Profile() {
  const [profile, setProfile] = useState({
    location: '',
    rolesLookingFor: '',
    technicalSkills: '',
    softSkills: '',
    toolsTech: '',
    degree: '',
    university: '',
    graduationYear: '',
    workExperience: ''
  });
  const [userData, setUserData] = useState({ name: '', email: '', phoneNumber: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
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
    
    fetchProfile();
  }, [router]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;

      // Fetch user data
      const userRes = await fetch(`http://localhost:8000/api/auth/user/${userId}`);
      if (userRes.ok) {
        const user = await userRes.json();
        setUserData({ name: user.name, email: user.email, phoneNumber: user.phoneNumber });
      }

      // Fetch profile data
      const profileRes = await fetch(`http://localhost:8000/api/profile/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
      }
    } catch (err) {
      console.log('Profile not found, creating new one');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;

      const res = await fetch(`http://localhost:8000/api/profile/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });

      if (res.ok) {
        setMessage('Profile updated successfully!');
      } else {
        setMessage('Failed to update profile');
      }
    } catch (err) {
      setMessage('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar />
        <Sidebar />
        <main className="ml-64 mt-16 p-8">
          <div className="text-center">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <Sidebar />
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>
          
          {message && (
            <div className={`p-4 rounded-lg mb-6 ${message.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="border-b border-gray-200 pb-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={userData.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="text"
                    value={userData.phoneNumber}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                    disabled
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={userData.email}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                    disabled
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location (City, State)</label>
              <input
                type="text"
                name="location"
                value={profile.location || ''}
                onChange={handleChange}
                placeholder="e.g. San Francisco, CA"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">What roles you're looking for</label>
              <textarea
                name="rolesLookingFor"
                value={profile.rolesLookingFor || ''}
                onChange={handleChange}
                rows={3}
                placeholder="e.g. Software Engineer, Frontend Developer, Full Stack Developer"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Technical Skills</label>
              <textarea
                name="technicalSkills"
                value={profile.technicalSkills || ''}
                onChange={handleChange}
                rows={3}
                placeholder="e.g. Java, Python, HTML/CSS, React, SQL"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Soft Skills</label>
              <textarea
                name="softSkills"
                value={profile.softSkills || ''}
                onChange={handleChange}
                rows={3}
                placeholder="e.g. Communication, teamwork, time management"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tools & Technologies</label>
              <textarea
                name="toolsTech"
                value={profile.toolsTech || ''}
                onChange={handleChange}
                rows={3}
                placeholder="e.g. Git, VS Code, Figma, Docker, AWS"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Degree</label>
                <input
                  type="text"
                  name="degree"
                  value={profile.degree || ''}
                  onChange={handleChange}
                  placeholder="e.g. Bachelor of Science"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">College/University</label>
                <input
                  type="text"
                  name="university"
                  value={profile.university || ''}
                  onChange={handleChange}
                  placeholder="e.g. Stanford University"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Graduation Year</label>
                <input
                  type="text"
                  name="graduationYear"
                  value={profile.graduationYear || ''}
                  onChange={handleChange}
                  placeholder="e.g. 2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Work Experience</label>
              <textarea
                name="workExperience"
                value={profile.workExperience || ''}
                onChange={handleChange}
                rows={4}
                placeholder="Describe your work experience, internships, projects..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}