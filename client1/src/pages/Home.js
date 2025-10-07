import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Upload, BarChart3, Clock, CheckCircle, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';

const Home = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalLeads: 0,
    totalCalls: 0,
    completedCalls: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/dashboard/overview');
      if (response.data.success) {
        setStats(response.data.data.overview);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Phone className="w-8 h-8 text-blue-600" />,
      title: 'Automated Calling',
      description: 'AI-powered calls using Vapi API with customizable scripts and time windows.'
    },
    {
      icon: <Upload className="w-8 h-8 text-green-600" />,
      title: 'Spreadsheet Upload',
      description: 'Upload CSV or Excel files with lead data directly to Supabase storage.'
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-purple-600" />,
      title: 'Detailed Reports',
      description: 'Generate comprehensive reports with call transcripts and lead verification.'
    },
    {
      icon: <Clock className="w-8 h-8 text-orange-600" />,
      title: 'Smart Scheduling',
      description: 'Configure calling hours and automatic retry logic for failed calls.'
    }
  ];

  const steps = [
    {
      number: '1',
      title: 'Create Order',
      description: 'Fill out your contact information and calling preferences.',
      action: 'Create Order',
      link: '/create-order'
    },
    {
      number: '2',
      title: 'Upload Leads',
      description: 'Upload your spreadsheet with lead information (Name, Phone, Company).',
      action: 'Upload Spreadsheet',
      link: null
    },
    {
      number: '3',
      title: 'Automatic Calling',
      description: 'Our system automatically calls leads during your specified hours.',
      action: 'View Progress',
      link: '/dashboard'
    },
    {
      number: '4',
      title: 'Receive Report',
      description: 'Get a detailed report via email with call transcripts and verified contacts.',
      action: 'View Reports',
      link: '/dashboard'
    }
  ];

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="spinner mx-auto mb-4"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Automated Lead Calling System
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Streamline your lead outreach with AI-powered calling, intelligent scheduling, 
          and comprehensive reporting. Upload your leads and let our system handle the rest.
        </p>
        <Link to="/create-order" className="btn btn-primary btn-lg">
          Get Started
        </Link>
      </div>

      {/* Stats Section */}
      <div className="stats-grid mb-12">
        <div className="stat-card">
          <div className="stat-value">{stats.totalOrders}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalLeads}</div>
          <div className="stat-label">Total Leads</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalCalls}</div>
          <div className="stat-label">Total Calls</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.completedCalls}</div>
          <div className="stat-label">Completed Calls</div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-center mb-8">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="card">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="card text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                {step.number}
              </div>
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-gray-600 mb-4">{step.description}</p>
              {step.link && (
                <Link to={step.link} className="btn btn-secondary btn-sm">
                  {step.action}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Requirements Section */}
      <div className="card">
        <h2 className="card-title mb-4">Spreadsheet Requirements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Required Fields</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• <strong>Name:</strong> Contact's full name</li>
              <li>• <strong>Phone:</strong> Phone number (any format)</li>
              <li>• <strong>Company:</strong> Company or organization name</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Optional Fields</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• <strong>Email:</strong> Contact's email address</li>
              <li>• <strong>Title:</strong> Job title or position</li>
              <li>• <strong>Address:</strong> Physical address</li>
              <li>• <strong>Notes:</strong> Additional information</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            Supported formats: CSV, XLSX, XLS
          </p>
          <div className="flex gap-2">
            <a 
              href="/api/upload/template/csv" 
              className="btn btn-secondary btn-sm"
              download
            >
              Download CSV Template
            </a>
            <a 
              href="/api/upload/template/excel" 
              className="btn btn-secondary btn-sm"
              download
            >
              Download Excel Template
            </a>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center mt-12">
        <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="text-gray-600 mb-6">
          Create your first order and start reaching out to your leads today.
        </p>
        <Link to="/create-order" className="btn btn-primary btn-lg">
          Create Your First Order
        </Link>
      </div>
    </div>
  );
};

export default Home;
