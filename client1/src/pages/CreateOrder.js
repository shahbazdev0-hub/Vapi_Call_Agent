import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Save, Clock, Phone, Mail, User } from 'lucide-react';
import api from '../services/api';

const CreateOrder = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    company: '',
    callStartTime: '09:00',
    callEndTime: '18:00',
    timezone: 'America/New_York',
    maxRetries: 2,
    customScript: ''
  });
  const [errors, setErrors] = useState({});

  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKST)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Customer email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Please enter a valid email address';
    }

    if (formData.customerPhone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.customerPhone.replace(/[^\d+]/g, ''))) {
      newErrors.customerPhone = 'Please enter a valid phone number';
    }

    if (!formData.callStartTime) {
      newErrors.callStartTime = 'Call start time is required';
    }

    if (!formData.callEndTime) {
      newErrors.callEndTime = 'Call end time is required';
    }

    if (formData.callStartTime && formData.callEndTime) {
      const startTime = new Date(`2000-01-01T${formData.callStartTime}`);
      const endTime = new Date(`2000-01-01T${formData.callEndTime}`);
      
      if (startTime >= endTime) {
        newErrors.callEndTime = 'End time must be after start time';
      }
    }

    if (formData.maxRetries < 0 || formData.maxRetries > 5) {
      newErrors.maxRetries = 'Max retries must be between 0 and 5';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    setLoading(true);
    
    try {
      const response = await api.post('/orders', formData);
      
      if (response.data.success) {
        toast.success('Order created successfully!');
        navigate(`/upload/${response.data.order.id}`);
      } else {
        toast.error(response.data.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Create order error:', error);
      
      if (error.response?.data?.details) {
        // Validation errors from server
        const serverErrors = {};
        error.response.data.details.forEach(detail => {
          const field = detail.split(' ')[0].toLowerCase();
          serverErrors[field] = detail;
        });
        setErrors(serverErrors);
        toast.error('Please fix the validation errors');
      } else {
        toast.error(error.response?.data?.error || 'Failed to create order');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Create New Order</h1>
          <p className="text-gray-600">Fill out the form below to create a new lead calling order.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Customer Information */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center">
              <User className="mr-2" size={20} />
              Customer Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="customerName">
                  Customer Name *
                </label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  className={`form-input ${errors.customerName ? 'border-red-500' : ''}`}
                  placeholder="Enter customer name"
                />
                {errors.customerName && (
                  <div className="form-error">{errors.customerName}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="customerEmail">
                  Customer Email *
                </label>
                <input
                  type="email"
                  id="customerEmail"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleChange}
                  className={`form-input ${errors.customerEmail ? 'border-red-500' : ''}`}
                  placeholder="Enter email address"
                />
                {errors.customerEmail && (
                  <div className="form-error">{errors.customerEmail}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="customerPhone">
                  Customer Phone
                </label>
                <input
                  type="tel"
                  id="customerPhone"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleChange}
                  className={`form-input ${errors.customerPhone ? 'border-red-500' : ''}`}
                  placeholder="Enter phone number"
                />
                {errors.customerPhone && (
                  <div className="form-error">{errors.customerPhone}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="company">
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter company name"
                />
              </div>
            </div>
          </div>

          {/* Calling Configuration */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center">
              <Clock className="mr-2" size={20} />
              Calling Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="callStartTime">
                  Call Start Time *
                </label>
                <input
                  type="time"
                  id="callStartTime"
                  name="callStartTime"
                  value={formData.callStartTime}
                  onChange={handleChange}
                  className={`form-input ${errors.callStartTime ? 'border-red-500' : ''}`}
                />
                {errors.callStartTime && (
                  <div className="form-error">{errors.callStartTime}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="callEndTime">
                  Call End Time *
                </label>
                <input
                  type="time"
                  id="callEndTime"
                  name="callEndTime"
                  value={formData.callEndTime}
                  onChange={handleChange}
                  className={`form-input ${errors.callEndTime ? 'border-red-500' : ''}`}
                />
                {errors.callEndTime && (
                  <div className="form-error">{errors.callEndTime}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="timezone">
                  Timezone
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  className="form-select"
                >
                  {timezones.map(tz => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="maxRetries">
                  Max Retry Attempts
                </label>
                <input
                  type="number"
                  id="maxRetries"
                  name="maxRetries"
                  value={formData.maxRetries}
                  onChange={handleChange}
                  min="0"
                  max="5"
                  className={`form-input ${errors.maxRetries ? 'border-red-500' : ''}`}
                />
                {errors.maxRetries && (
                  <div className="form-error">{errors.maxRetries}</div>
                )}
                <div className="text-sm text-gray-500 mt-1">
                  Number of additional attempts for failed calls (0-5)
                </div>
              </div>
            </div>
          </div>

          {/* Custom Script */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center">
              <Phone className="mr-2" size={20} />
              Custom Call Script (Optional)
            </h3>
            
            <div className="form-group">
              <label className="form-label" htmlFor="customScript">
                Custom Script
              </label>
              <textarea
                id="customScript"
                name="customScript"
                value={formData.customScript}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Enter custom call script (optional). If left empty, default script will be used."
                rows="4"
              />
              <div className="text-sm text-gray-500 mt-1">
                Optional custom script for calls. Leave empty to use default script.
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? (
                <>
                  <div className="spinner mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="mr-2" size={16} />
                  Create Order
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Information Card */}
      <div className="card mt-6">
        <h3 className="font-semibold text-lg mb-2">What happens next?</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
          <li>After creating the order, you'll be redirected to upload your leads spreadsheet</li>
          <li>Upload a CSV or Excel file with your lead information</li>
          <li>Our system will validate the data and prepare for calling</li>
          <li>Calls will be made automatically during your specified hours</li>
          <li>You'll receive a detailed report via email once complete</li>
        </ol>
      </div>
    </div>
  );
};

export default CreateOrder;
