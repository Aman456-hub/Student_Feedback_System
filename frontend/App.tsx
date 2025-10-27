  import React, { useState, useEffect } from 'react';
  import axios from 'axios';
  import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
  import { Upload, MessageSquare, BarChart3, TrendingUp } from 'lucide-react';
  import './App.css';

  const API_BASE_URL = 'http://localhost:8000';

  interface Analytics {
    total_feedback: number;
    positive_count: number;
    negative_count: number;
    neutral_count: number;
    positive_percentage: number;
    negative_percentage: number;
    neutral_percentage: number;
  }

  interface Theme {
    keyword: string;
    frequency: number;
    sentiment: string;
  }

  interface FeedbackSubmission {
    text: string;
    category: string;
  }

  const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'submit' | 'upload' | 'analytics'>('submit');
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [themes, setThemes] = useState<Theme[]>([]);
    const [feedback, setFeedback] = useState<FeedbackSubmission>({ text: '', category: 'general' });
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
      fetchAnalytics();
      fetchThemes();
    }, []);

    const fetchAnalytics = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/analytics`);
        setAnalytics(response.data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };

    const fetchThemes = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/themes`);
        setThemes(response.data.themes);
      } catch (error) {
        console.error('Error fetching themes:', error);
      }
    };

    const submitFeedback = async () => {
      if (!feedback.text.trim()) {
        setMessage('Please enter feedback text');
        return;
      }

      setLoading(true);
      try {
        await axios.post(`${API_BASE_URL}/api/feedback`, feedback);
        setMessage('Feedback submitted successfully!');
        setFeedback({ text: '', category: 'general' });
        await fetchAnalytics();
        await fetchThemes();
      } catch (error) {
        setMessage('Error submitting feedback');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    const uploadFile = async () => {
      if (!file) {
        setMessage('Please select a file');
        return;
      }

      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post(`${API_BASE_URL}/api/feedback/bulk`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessage(response.data.message);
        setFile(null);
        await fetchAnalytics();
        await fetchThemes();
      } catch (error) {
        setMessage('Error uploading file');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    const pieData = analytics ? [
      { name: 'Positive', value: analytics.positive_count, color: '#10B981' },
      { name: 'Negative', value: analytics.negative_count, color: '#EF4444' },
      { name: 'Neutral', value: analytics.neutral_count, color: '#6B7280' },
    ] : [];

    const barData = themes.slice(0, 10).map(theme => ({
      keyword: theme.keyword,
      frequency: theme.frequency,
      color: theme.sentiment === 'positive' ? '#10B981' : 
            theme.sentiment === 'negative' ? '#EF4444' : '#6B7280'
    }));

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
            Student Feedback Sentiment Analysis
          </h1>

          {/* Navigation Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg shadow-md p-1">
              <button
                onClick={() => setActiveTab('submit')}
                className={`px-6 py-3 rounded-md flex items-center gap-2 ${
                  activeTab === 'submit' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <MessageSquare size={20} />
                Submit Feedback
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-6 py-3 rounded-md flex items-center gap-2 ${
                  activeTab === 'upload' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Upload size={20} />
                Bulk Upload
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-6 py-3 rounded-md flex items-center gap-2 ${
                  activeTab === 'analytics' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <BarChart3 size={20} />
                Analytics
              </button>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className="mb-6 p-4 bg-blue-100 border border-blue-300 rounded-lg text-blue-800 text-center">
              {message}
            </div>
          )}

          {/* Submit Feedback Tab */}
          {activeTab === 'submit' && (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">Submit Individual Feedback</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={feedback.category}
                  onChange={(e) => setFeedback({ ...feedback, category: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="course">Course</option>
                  <option value="faculty">Faculty</option>
                  <option value="facilities">Facilities</option>
                  <option value="events">Events</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback Text
                </label>
                <textarea
                  value={feedback.text}
                  onChange={(e) => setFeedback({ ...feedback, text: e.target.value })}
                  placeholder="Enter your feedback here..."
                  rows={6}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={submitFeedback}
                disabled={loading}
                className="w-full bg-blue-500 text-white py-3 rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Processing...' : 'Submit Feedback'}
              </button>
            </div>
          )}

          {/* Bulk Upload Tab */}
          {activeTab === 'upload' && (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">Bulk Upload Feedback</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV/Excel File
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  File should contain a 'text' column with feedback data. Optional 'category' column.
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>

              <button
                onClick={uploadFile}
                disabled={loading || !file}
                className="w-full bg-green-500 text-white py-3 rounded-md hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Upload size={20} />
                {loading ? 'Processing...' : 'Upload and Analyze'}
              </button>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Feedback</p>
                        <p className="text-3xl font-bold text-gray-900">{analytics.total_feedback}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Positive</p>
                        <p className="text-3xl font-bold text-green-600">{analytics.positive_percentage}%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Negative</p>
                        <p className="text-3xl font-bold text-red-600">{analytics.negative_percentage}%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-red-500 rotate-180" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Neutral</p>
                        <p className="text-3xl font-bold text-gray-600">{analytics.neutral_percentage}%</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-gray-500" />
                    </div>
                  </div>
                </div>
              )}

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sentiment Distribution */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold mb-4">Sentiment Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Top Keywords */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold mb-4">Top Keywords</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="keyword" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="frequency" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Keywords Table */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4">Keywords by Sentiment</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Keyword
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Frequency
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sentiment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {themes.map((theme, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {theme.keyword}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {theme.frequency}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              theme.sentiment === 'positive' 
                                ? 'bg-green-100 text-green-800'
                                : theme.sentiment === 'negative'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {theme.sentiment}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  export default App;