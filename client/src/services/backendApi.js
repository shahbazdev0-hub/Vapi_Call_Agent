import axios from 'axios';

// Your backend URL - make sure this matches where your backend is running
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

const backendApi = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
backendApi.interceptors.request.use(
  (config) => {
    console.log('Making request to:', config.baseURL + config.url);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
backendApi.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.data);
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return Promise.reject(error);
  }
);

// Order Management
export const createBackendOrder = async (orderData) => {
  try {
    // Prepare data matching backend expectations
    const payload = {
      customerName: orderData.customerName || orderData.customerEmail?.split('@')[0] || 'Customer',
      customerEmail: orderData.customerEmail || orderData.email, // Handle both field names
      callStartTime: '09:00',
      callEndTime: '18:00',
      timezone: 'America/New_York',
      maxRetries: 2,
    };

    // Only add optional fields if they have values
    if (orderData.customerPhone) {
      payload.customerPhone = orderData.customerPhone;
    }
    if (orderData.company) {
      payload.company = orderData.company;
    }
    if (orderData.customScript) {
      payload.customScript = orderData.customScript;
    }

    console.log('Sending to backend:', payload);

    const response = await backendApi.post('/orders', payload);
    return response.data;
  } catch (error) {
    console.error('Create backend order error:', error);
    // Log the actual error response for debugging
    if (error.response) {
      console.error('Backend validation error:', error.response.data);
    }
    throw error;
  }
};

// Spreadsheet Upload
export const uploadSpreadsheet = async (orderId, file) => {
  try {
    const formData = new FormData();
    formData.append('spreadsheet', file);
    
    const response = await backendApi.post(`/upload/spreadsheet/${orderId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Upload spreadsheet error:', error);
    throw error;
  }
};

// Start Calling Process
export const startCalling = async (orderId) => {
  try {
    const response = await backendApi.post(`/calls/start/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Start calling error:', error);
    throw error;
  }
};

// Get Call Status
export const getCallStatus = async (orderId) => {
  try {
    const response = await backendApi.get(`/calls/status/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Get call status error:', error);
    throw error;
  }
};

// Generate Report
export const generateReport = async (orderId) => {
  try {
    const response = await backendApi.post(`/reports/generate/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Generate report error:', error);
    throw error;
  }
};

// Get Order Details
export const getOrderDetails = async (orderId) => {
  try {
    const response = await backendApi.get(`/orders/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Get order details error:', error);
    throw error;
  }
};

export default backendApi;