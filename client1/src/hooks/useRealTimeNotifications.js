// Create this file: src/hooks/useRealTimeNotifications.js

import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

const useRealTimeNotifications = (orderId, options = {}) => {
  const eventSourceRef = useRef(null);
  const {
    onCallStarted,
    onCallCompleted,
    onCallFailed,
    showToasts = true,
    autoReconnect = true
  } = options;

  useEffect(() => {
    if (!orderId) return;

    console.log('🔔 Setting up real-time notifications for order:', orderId);

    const connectEventSource = () => {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new EventSource connection
      const eventSource = new EventSource(`/api/calls/events/${orderId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ Real-time connection established');
        if (showToasts) {
          toast.success('Real-time updates connected', { 
            autoClose: 2000,
            position: 'bottom-right'
          });
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 Real-time notification received:', data);

          // Handle different notification types
          switch (data.type) {
            case 'connected':
              console.log('🔗 Connected to real-time updates');
              break;

            case 'heartbeat':
              // Silent heartbeat - no action needed
              break;

            case 'call_started':
              console.log('📞 Call started notification:', data.data);
              if (showToasts) {
                toast.info(`📞 Call started to ${data.data.phoneNumber}`, {
                  autoClose: 3000
                });
              }
              if (onCallStarted) {
                onCallStarted(data.data);
              }
              break;

            case 'call_completed':
              console.log('✅ Call completed notification:', data.data);
              if (showToasts) {
                toast.success(
                  `✅ Call completed! ${data.data.duration}s conversation (${data.data.quality} quality)`,
                  { autoClose: 5000 }
                );
              }
              if (onCallCompleted) {
                onCallCompleted(data.data);
              }
              break;

            case 'call_failed':
              console.log('❌ Call failed notification:', data.data);
              if (showToasts) {
                const retryMessage = data.data.willRetry ? ' - Will retry automatically' : '';
                toast.error(`❌ Call failed: ${data.data.error}${retryMessage}`, {
                  autoClose: 5000
                });
              }
              if (onCallFailed) {
                onCallFailed(data.data);
              }
              break;

            case 'transcript_update':
              console.log('📝 Transcript update:', data.data);
              // Could trigger UI updates for live transcript viewing
              break;

            default:
              console.log('📡 Unknown notification type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing notification:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ EventSource error:', error);
        
        if (showToasts) {
          toast.error('Real-time connection lost. Attempting to reconnect...', {
            autoClose: 3000
          });
        }

        // Auto-reconnect after a delay
        if (autoReconnect) {
          setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connectEventSource();
          }, 5000);
        }
      };
    };

    // Initial connection
    connectEventSource();

    // Cleanup function
    return () => {
      console.log('🔌 Disconnecting real-time notifications');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [orderId, onCallStarted, onCallCompleted, onCallFailed, showToasts, autoReconnect]);

  // Manual disconnect function
  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  // Check if connected
  const isConnected = eventSourceRef.current?.readyState === EventSource.OPEN;

  return {
    isConnected,
    disconnect
  };
};

export default useRealTimeNotifications;