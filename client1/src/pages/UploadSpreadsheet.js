import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';
import api from '../services/api';

const UploadSpreadsheet = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      if (response.data.success) {
        setOrder(response.data.order);
      } else {
        toast.error('Order not found');
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      toast.error('Failed to load order details');
      navigate('/');
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast.error('Please select a file first');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('spreadsheet', uploadedFile);

      const response = await api.post(`/upload/spreadsheet/${orderId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setUploadResult(response.data.data);
        toast.success('Spreadsheet uploaded successfully!');
        
        // Redirect to order status page after a short delay
        setTimeout(() => {
          navigate(`/order/${orderId}`);
        }, 2000);
      } else {
        toast.error(response.data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      if (error.response?.data?.validationErrors) {
        // Show validation errors
        const errors = error.response.data.validationErrors;
        let errorMessage = 'Validation errors found:\n';
        errors.forEach((error, index) => {
          errorMessage += `${index + 1}. Row ${error.row}: ${error.errors.join(', ')}\n`;
        });
        toast.error(errorMessage);
      } else {
        toast.error(error.response?.data?.error || 'Upload failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async (type) => {
    try {
      const response = await api.get(`/upload/template/${type}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_template.${type}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download template');
    }
  };

  if (!order) {
    return (
      <div className="text-center py-8">
        <div className="spinner mx-auto mb-4"></div>
        <p>Loading order details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Order Info */}
      <div className="card mb-6">
        <div className="card-header">
          <h1 className="card-title">Upload Leads Spreadsheet</h1>
          <p className="text-gray-600">Upload your leads data for order {orderId}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Order Details</h3>
            <div className="space-y-1 text-sm">
              <p><strong>Customer:</strong> {order.customerName}</p>
              <p><strong>Email:</strong> {order.customerEmail}</p>
              <p><strong>Company:</strong> {order.company || 'N/A'}</p>
              <p><strong>Calling Hours:</strong> {order.callStartTime} - {order.callEndTime} {order.timezone}</p>
              <p><strong>Max Retries:</strong> {order.maxRetries}</p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Status</h3>
            <span className={`status-badge status-${order.status}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title">Upload File</h2>
          <p className="text-gray-600">Drag and drop your spreadsheet or click to browse</p>
        </div>

        <div
          {...getRootProps()}
          className={`file-upload ${isDragActive ? 'dragover' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="file-upload-icon mx-auto" />
          <p className="file-upload-text">
            {isDragActive
              ? 'Drop the file here...'
              : 'Drag & drop a spreadsheet here, or click to select'
            }
          </p>
          <p className="file-upload-hint">
            Supports CSV, XLS, XLSX files up to 10MB
          </p>
        </div>

        {uploadedFile && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <FileText className="text-green-600 mr-2" size={20} />
              <div>
                <p className="font-medium text-green-800">{uploadedFile.name}</p>
                <p className="text-sm text-green-600">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={!uploadedFile || loading}
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <div className="spinner mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2" size={16} />
                Upload Spreadsheet
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="card-title flex items-center">
              <CheckCircle className="text-green-600 mr-2" size={20} />
              Upload Successful
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{uploadResult.totalLeads}</div>
              <div className="text-sm text-gray-600">Total Leads</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{uploadResult.validLeads}</div>
              <div className="text-sm text-gray-600">Valid Leads</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {uploadResult.totalLeads - uploadResult.validLeads}
              </div>
              <div className="text-sm text-gray-600">Invalid Rows</div>
            </div>
          </div>

          {uploadResult.validationErrors && uploadResult.validationErrors.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-medium text-yellow-800 mb-2 flex items-center">
                <AlertCircle className="mr-2" size={16} />
                Validation Warnings
              </h3>
              <div className="text-sm text-yellow-700">
                {uploadResult.validationErrors.slice(0, 5).map((error, index) => (
                  <div key={index} className="mb-1">
                    Row {error.row}: {error.errors.join(', ')}
                  </div>
                ))}
                {uploadResult.validationErrors.length > 5 && (
                  <div>... and {uploadResult.validationErrors.length - 5} more errors</div>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 text-center">
            <p className="text-gray-600 mb-2">Redirecting to order status page...</p>
            <div className="spinner mx-auto"></div>
          </div>
        </div>
      )}

      {/* Requirements and Templates */}
      <div className="card">
        <h2 className="card-title mb-4">File Requirements</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Required Columns</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• <strong>Name:</strong> Contact's full name</li>
              <li>• <strong>Phone:</strong> Phone number (any format)</li>
              <li>• <strong>Company:</strong> Company or organization name</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Optional Columns</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• <strong>Email:</strong> Contact's email address</li>
              <li>• <strong>Title:</strong> Job title or position</li>
              <li>• <strong>Address:</strong> Physical address</li>
              <li>• <strong>Notes:</strong> Additional information</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="font-semibold mb-2">Download Templates</h3>
          <p className="text-sm text-gray-600 mb-3">
            Use these templates to ensure your data is formatted correctly.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => downloadTemplate('csv')}
              className="btn btn-secondary btn-sm"
            >
              <Download className="mr-1" size={14} />
              CSV Template
            </button>
            <button
              onClick={() => downloadTemplate('excel')}
              className="btn btn-secondary btn-sm"
            >
              <Download className="mr-1" size={14} />
              Excel Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadSpreadsheet;
