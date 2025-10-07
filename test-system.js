#!/usr/bin/env node

/**
 * System Integration Test Script
 * Tests the complete lead calling system workflow
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test data
const testOrder = {
  customerName: 'Test Customer',
  customerEmail: 'test@example.com',
  customerPhone: '+1234567890',
  company: 'Test Company',
  callStartTime: '09:00',
  callEndTime: '17:00',
  timezone: 'America/New_York',
  maxRetries: 2
};

const testLeads = [
  {
    name: 'John Doe',
    phone: '+1234567890',
    company: 'Acme Corp',
    email: 'john@acme.com',
    title: 'Sales Manager'
  },
  {
    name: 'Jane Smith',
    phone: '+1987654321',
    company: 'Tech Solutions',
    email: 'jane@tech.com',
    title: 'CEO'
  }
];

class SystemTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.orderId = null;
    this.leadIds = [];
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running test: ${testName}`);
    const startTime = Date.now();
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'PASSED', duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${testName} - FAILED (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'FAILED', duration, error: error.message });
    }
  }

  async testHealthCheck() {
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    if (response.data.status !== 'OK') {
      throw new Error('Health check failed');
    }
  }

  async testCreateOrder() {
    const response = await axios.post(`${API_BASE_URL}/orders`, testOrder, { timeout: TEST_TIMEOUT });
    if (!response.data.success || !response.data.order) {
      throw new Error('Failed to create order');
    }
    this.orderId = response.data.order.id;
    console.log(`   Created order: ${this.orderId}`);
  }

  async testUploadSpreadsheet() {
    // Create test CSV content
    const csvContent = 'Name,Phone,Company,Email,Title\n' +
      testLeads.map(lead => 
        `${lead.name},${lead.phone},${lead.company},${lead.email},${lead.title}`
      ).join('\n');

    const formData = new FormData();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    formData.append('spreadsheet', blob, 'test-leads.csv');

    const response = await axios.post(
      `${API_BASE_URL}/upload/spreadsheet/${this.orderId}`,
      formData,
      { 
        timeout: TEST_TIMEOUT,
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );

    if (!response.data.success) {
      throw new Error(`Upload failed: ${response.data.error}`);
    }

    console.log(`   Uploaded ${response.data.data.totalLeads} leads`);
  }

  async testGetOrderStatus() {
    const response = await axios.get(`${API_BASE_URL}/orders/${this.orderId}`, { timeout: TEST_TIMEOUT });
    if (!response.data.success || !response.data.order) {
      throw new Error('Failed to get order status');
    }
    
    const order = response.data.order;
    if (order.status !== 'processing') {
      throw new Error(`Expected status 'processing', got '${order.status}'`);
    }

    console.log(`   Order status: ${order.status}, Leads: ${order.stats.totalLeads}`);
  }

  async testCallStatus() {
    const response = await axios.get(`${API_BASE_URL}/calls/status/${this.orderId}`, { timeout: TEST_TIMEOUT });
    if (!response.data.success) {
      throw new Error('Failed to get call status');
    }

    const callStatus = response.data.data;
    console.log(`   Call status: ${callStatus.isActive ? 'Active' : 'Inactive'}, Pending: ${callStatus.pendingLeads}`);
  }

  async testDashboardOverview() {
    const response = await axios.get(`${API_BASE_URL}/dashboard/overview`, { timeout: TEST_TIMEOUT });
    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to get dashboard overview');
    }

    const overview = response.data.data.overview;
    console.log(`   Dashboard stats - Orders: ${overview.totalOrders}, Leads: ${overview.totalLeads}, Calls: ${overview.totalCalls}`);
  }

  async testDownloadTemplate() {
    const response = await axios.get(`${API_BASE_URL}/upload/template/csv`, { timeout: TEST_TIMEOUT });
    if (response.status !== 200 || !response.data.includes('Name,Phone,Company')) {
      throw new Error('Failed to download CSV template');
    }

    console.log('   CSV template downloaded successfully');
  }

  async testValidation() {
    // Test with invalid data
    const invalidOrder = { ...testOrder, customerEmail: 'invalid-email' };
    
    try {
      await axios.post(`${API_BASE_URL}/orders`, invalidOrder, { timeout: TEST_TIMEOUT });
      throw new Error('Validation should have failed for invalid email');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('   Validation working correctly - rejected invalid email');
      } else {
        throw new Error('Unexpected validation behavior');
      }
    }
  }

  async testErrorHandling() {
    // Test with non-existent order
    try {
      await axios.get(`${API_BASE_URL}/orders/non-existent-id`, { timeout: TEST_TIMEOUT });
      throw new Error('Should have returned 404 for non-existent order');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('   Error handling working correctly - returned 404 for non-existent order');
      } else {
        throw new Error('Unexpected error handling behavior');
      }
    }
  }

  async testCleanup() {
    if (this.orderId) {
      try {
        await axios.delete(`${API_BASE_URL}/orders/${this.orderId}`, { timeout: TEST_TIMEOUT });
        console.log('   Test order cleaned up');
      } catch (error) {
        console.log(`   Warning: Failed to clean up test order: ${error.message}`);
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting System Integration Tests...\n');
    console.log(`API Base URL: ${API_BASE_URL}`);
    console.log(`Test Timeout: ${TEST_TIMEOUT}ms\n`);

    await this.runTest('Health Check', () => this.testHealthCheck());
    await this.runTest('Create Order', () => this.testCreateOrder());
    await this.runTest('Upload Spreadsheet', () => this.testUploadSpreadsheet());
    await this.runTest('Get Order Status', () => this.testGetOrderStatus());
    await this.runTest('Call Status', () => this.testCallStatus());
    await this.runTest('Dashboard Overview', () => this.testDashboardOverview());
    await this.runTest('Download Template', () => this.testDownloadTemplate());
    await this.runTest('Validation', () => this.testValidation());
    await this.runTest('Error Handling', () => this.testErrorHandling());
    await this.runTest('Cleanup', () => this.testCleanup());

    this.printResults();
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Total: ${this.results.passed + this.results.failed}`);
    
    const successRate = ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1);
    console.log(`🎯 Success Rate: ${successRate}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n📋 DETAILED RESULTS:');
    this.results.tests.forEach(test => {
      const icon = test.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${icon} ${test.name} (${test.duration}ms)`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (this.results.failed === 0) {
      console.log('🎉 All tests passed! The system is working correctly.');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed. Please check the errors above.');
      process.exit(1);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new SystemTester();
  tester.runAllTests().catch(error => {
    console.error('💥 Test runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = SystemTester;
