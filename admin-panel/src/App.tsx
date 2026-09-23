import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, UserX, CheckCircle, RefreshCw } from 'lucide-react';
import './App.css';

const API_URL = 'http://localhost:3000/api';

function App() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/moderation/admin/reports`);
      setReports(data.reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleBanUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently ban this user?')) return;
    try {
      await axios.post(`${API_URL}/moderation/admin/ban`, { userId, reason: 'Banned via Admin Panel' });
      alert('User banned successfully');
      fetchReports();
    } catch (error) {
      console.error('Error banning user:', error);
      alert('Failed to ban user');
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <ShieldAlert size={32} color="#f43f5e" />
        <h1>VYBE Admin Dashboard</h1>
        <button onClick={fetchReports} disabled={loading} className="refresh-btn">
          <RefreshCw size={20} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </header>

      <main className="admin-main">
        <div className="reports-section">
          <h2>Active Reports ({reports.filter((r: any) => r.status === 'pending').length})</h2>
          
          <div className="reports-grid">
            {reports.map((report: any) => (
              <div key={report._id} className={`report-card ${report.status}`}>
                <div className="report-header">
                  <span className="status-badge">{report.status.toUpperCase()}</span>
                  <span className="date">{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
                
                <div className="report-details">
                  <p><strong>Reported User:</strong> {report.reportedUserId?.username || 'Unknown'} (Age: {report.reportedUserId?.age})</p>
                  <p><strong>User Status:</strong> <span className={report.reportedUserId?.status === 'banned' ? 'text-danger' : 'text-success'}>{report.reportedUserId?.status}</span></p>
                  <p><strong>Reported By:</strong> {report.reporterId?.username || 'Unknown'}</p>
                  <div className="reason-box">
                    <strong>Reason:</strong>
                    <p>{report.reason}</p>
                  </div>
                </div>

                <div className="report-actions">
                  {report.reportedUserId?.status !== 'banned' && (
                    <button 
                      className="ban-btn" 
                      onClick={() => handleBanUser(report.reportedUserId?._id)}
                    >
                      <UserX size={18} /> Ban User
                    </button>
                  )}
                  {report.status === 'resolved' && (
                    <div className="resolved-mark">
                      <CheckCircle size={18} color="#10b981" /> Resolved
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {reports.length === 0 && !loading && (
              <div className="empty-state">No reports found. Good job!</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
