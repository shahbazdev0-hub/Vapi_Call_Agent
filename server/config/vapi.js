const axios = require('axios');

class VapiClient {
  constructor() {
    // Your VAPI credentials
    this.apiKey = process.env.VAPI_API_KEY || '062624f8-95eb-454d-b667-da9859135703'; // Private key for API calls
    this.phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID || 'dee58b83-c33c-4ddd-8934-5d667e3aa426';
    this.assistantId = process.env.VAPI_ASSISTANT_ID || '038e0d0a-1f06-4e69-bfb3-93b057b2170c';
    this.baseURL = 'https://api.vapi.ai';
    
    if (!this.apiKey) {
      throw new Error('VAPI_API_KEY is required');
    }
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('🔗 VAPI Client initialized with:');
    console.log('📞 Phone Number ID:', this.phoneNumberId);
    console.log('🤖 Assistant ID:', this.assistantId);
    console.log('🔑 API Key:', this.apiKey ? 'Configured' : 'Missing');
  }

  /**
   * Create a new outbound call - REAL IMPLEMENTATION
   * @param {Object} callData - Call configuration
   * @returns {Promise<Object>} Call response
   */
  async createOutboundCall(callData) {
    try {
      console.log('🚀 Creating VAPI call for:', callData.name, 'at', callData.phoneNumber);

      const callPayload = {
        phoneNumberId: this.phoneNumberId,
        assistantId: this.assistantId,
        customer: {
          number: callData.phoneNumber,
          name: callData.name || 'Unknown'
        },
        assistantOverrides: {
          variableValues: {
            customerName: callData.name || 'Unknown',
            companyName: callData.company || 'Unknown Company',
            leadId: callData.leadId,
            orderId: callData.orderId
          }
        },
        metadata: {
          leadId: callData.leadId,
          orderId: callData.orderId,
          company: callData.company,
          retryAttempt: callData.retryAttempt || 0,
          timestamp: new Date().toISOString()
        }
      };

      console.log('📤 VAPI Call Payload:', JSON.stringify(callPayload, null, 2));

      const response = await this.client.post('/call', callPayload);

      console.log('✅ VAPI Call Created Successfully:');
      console.log('📱 Call ID:', response.data.id);
      console.log('📊 Status:', response.data.status);

      return {
        success: true,
        callId: response.data.id,
        status: response.data.status,
        data: response.data
      };

    } catch (error) {
      console.error('❌ VAPI call creation error:', error.response?.data || error.message);
      
      // Log detailed error information
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
        console.error('Data:', error.response.data);
      }

      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Get call status and details - REAL IMPLEMENTATION
   * @param {string} callId - Call ID
   * @returns {Promise<Object>} Call status
   */
  async getCallStatus(callId) {
    try {
      console.log('📊 Getting call status for:', callId);

      const response = await this.client.get(`/call/${callId}`);
      
      console.log('✅ Call status retrieved:');
      console.log('📱 Call ID:', response.data.id);
      console.log('📊 Status:', response.data.status);
      console.log('⏱️ Duration:', response.data.endedAt && response.data.startedAt 
        ? Math.round((new Date(response.data.endedAt) - new Date(response.data.startedAt)) / 1000) + 's'
        : 'In progress');

      return {
        success: true,
        data: {
          id: response.data.id,
          status: response.data.status,
          startedAt: response.data.startedAt,
          endedAt: response.data.endedAt,
          duration: response.data.endedAt && response.data.startedAt 
            ? Math.round((new Date(response.data.endedAt) - new Date(response.data.startedAt)) / 1000)
            : 0,
          phoneNumber: response.data.customer?.number,
          transcript: response.data.transcript,
          recording: response.data.recordingUrl,
          cost: response.data.cost,
          metadata: response.data.metadata
        }
      };

    } catch (error) {
      console.error('❌ VAPI call status error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get call transcript - REAL IMPLEMENTATION
   * @param {string} callId - Call ID
   * @returns {Promise<Object>} Call transcript
   */
  async getCallTranscript(callId) {
    try {
      console.log('📝 Getting transcript for call:', callId);

      const response = await this.client.get(`/call/${callId}`);
      
      const transcript = response.data.transcript || response.data.messages || '';
      
      console.log('✅ Transcript retrieved, length:', transcript.length);
      
      return {
        success: true,
        transcript: transcript,
        messages: response.data.messages || [],
        analysis: response.data.analysis
      };

    } catch (error) {
      console.error('❌ VAPI transcript error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * End a call - REAL IMPLEMENTATION
   * @param {string} callId - Call ID
   * @returns {Promise<Object>} End call response
   */
  async endCall(callId) {
    try {
      console.log('🛑 Ending call:', callId);

      const response = await this.client.patch(`/call/${callId}`, {
        status: 'ended'
      });

      console.log('✅ Call ended successfully');

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('❌ VAPI end call error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * List all calls - REAL IMPLEMENTATION
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Calls list
   */
  async listCalls(filters = {}) {
    try {
      console.log('📋 Listing calls with filters:', filters);

      const params = new URLSearchParams();
      if (filters.assistantId) params.append('assistantId', filters.assistantId);
      if (filters.phoneNumberId) params.append('phoneNumberId', filters.phoneNumberId);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await this.client.get(`/call?${params}`);

      console.log('✅ Calls retrieved:', response.data.length || 0);

      return {
        success: true,
        data: response.data,
        count: response.data.length || 0
      };

    } catch (error) {
      console.error('❌ VAPI list calls error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Check if current time is within calling hours
   * @param {string} startTime - Start time (HH:MM format)
   * @param {string} endTime - End time (HH:MM format)
   * @param {string} timezone - Timezone
   * @returns {boolean} Whether it's within calling hours
   */
  isWithinCallingHours(startTime = '09:00', endTime = '18:00', timezone = 'America/New_York') {
    try {
      const now = new Date();
      
      // Convert to specified timezone
      const timeInZone = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
      const currentTime = timeInZone.toTimeString().slice(0, 5); // HH:MM format
      
      console.log(`🕒 Current time in ${timezone}: ${currentTime}, Calling hours: ${startTime} - ${endTime}`);
      
      // Simple time comparison (assumes same day)
      const isWithinHours = currentTime >= startTime && currentTime <= endTime;
      
      console.log(`⏰ Within calling hours: ${isWithinHours}`);
      
      return isWithinHours;
    } catch (error) {
      console.error('❌ Error checking calling hours:', error);
      return false;
    }
  }

  /**
   * Test VAPI connection
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      console.log('🧪 Testing VAPI connection...');

      // Test by listing calls (should work if credentials are correct)
      const response = await this.client.get('/call?limit=1');
      
      console.log('✅ VAPI connection successful!');
      
      return {
        success: true,
        message: 'VAPI connection successful',
        data: {
          phoneNumberId: this.phoneNumberId,
          assistantId: this.assistantId,
          apiConnected: true
        }
      };

    } catch (error) {
      console.error('❌ VAPI connection failed:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data
      };
    }
  }
}

// Export singleton instance
module.exports = new VapiClient();