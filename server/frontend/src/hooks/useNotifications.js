import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../api';
import Cookies from "js-cookie";

const MAX_RETRIES = 5;
const BASE_DELAY = 1000;
const POLLING_INTERVAL = 3000;
const SSE_RETRY_INTERVAL = 30000;

export function useNotifications(isAuthenticated) {
  const eventSourceRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const sseRetryTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const lastTimestampRef = useRef(new Date().toISOString());

  useEffect(() => {
    if (!isAuthenticated) {
      // Clean up when not authenticated
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (sseRetryTimeoutRef.current) {
        clearTimeout(sseRetryTimeoutRef.current);
        sseRetryTimeoutRef.current = null;
      }
      return;
    }

    const showNotification = (notification) => {
      const typeStyles = {
        created: { type: 'success' },
        updated: { type: 'info' },
        deleted: { type: 'warning' },
        retrieved: { type: 'default' },
      };

      const style = typeStyles[notification.type] || { type: 'default' };
      toast(notification.message, { type: style.type });
    };

    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notification', {
          params: { since: lastTimestampRef.current },
        });

        const { notifications, timestamp } = response.data;

        notifications.forEach((notification) => {
          showNotification(notification);
        });

        if (timestamp) {
          lastTimestampRef.current = timestamp;
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    const startPolling = () => {
      if (pollingIntervalRef.current) return;

      console.log('Starting polling for notifications');
      pollingIntervalRef.current = setInterval(fetchNotifications, POLLING_INTERVAL);
    };

    const connectSSE = () => {
      const token = Cookies.get('auth_token');
        
      if (!token) {
        console.log('No token, falling back to polling');
        startPolling();
        return;
      }

      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const API_URL = import.meta.env.VITE_API_BASE_URL;
      const url = `${API_URL}/notification/stream?token=${encodeURIComponent(token)}`;

      console.log('Connecting to SSE...');
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connected');
        retryCountRef.current = 0;
        stopPolling();

        if (sseRetryTimeoutRef.current) {
          clearTimeout(sseRetryTimeoutRef.current);
          sseRetryTimeoutRef.current = null;
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          if (notification.id) {
            showNotification(notification);
            lastTimestampRef.current = notification.created_at || new Date().toISOString();
          }
        } catch (error) {
          // Ignore parse errors for heartbeats/empty messages
        }
      };

      eventSource.addEventListener('reconnect', () => {
        console.log('Server requested reconnect');
        eventSource.close();
        setTimeout(connectSSE, 100);
      });

      eventSource.onerror = (error) => {
        console.log('SSE connection error:', error);
        eventSource.close();
        retryCountRef.current++;

        if (retryCountRef.current > MAX_RETRIES) {
          console.log('SSE failed after max retries, falling back to polling');
          startPolling();

          // Keep trying SSE periodically
          sseRetryTimeoutRef.current = setTimeout(() => {
            console.log('Attempting SSE reconnection...');
            retryCountRef.current = 0;
            connectSSE();
          }, SSE_RETRY_INTERVAL);

          return;
        }

        const delay = BASE_DELAY * Math.pow(2, retryCountRef.current - 1);
        console.log(`SSE reconnecting in ${delay}ms (attempt ${retryCountRef.current})`);

        setTimeout(connectSSE, delay);
      };
    };

    // Try SSE first
    connectSSE();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      stopPolling();
      if (sseRetryTimeoutRef.current) {
        clearTimeout(sseRetryTimeoutRef.current);
      }
    };
  }, [isAuthenticated]);

  return null;
}
