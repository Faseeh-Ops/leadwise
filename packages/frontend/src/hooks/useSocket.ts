import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '../store/appStore';

export function useSocket(): void {
  const socketRef = useRef<Socket | null>(null);
  const { setConnected, setQueueMetrics, addActivity, updateLead, isAuthenticated } = useAppStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = io('/', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      addActivity({ type: 'info', message: 'Real-time connection established' });
    });

    socket.on('disconnect', () => {
      setConnected(false);
      addActivity({ type: 'warning', message: 'Real-time connection lost — reconnecting...' });
    });

    socket.on('queue:metrics', (metrics) => {
      setQueueMetrics(metrics);
    });

    socket.on('job:active', (data: { jobId: string; queue: string; data: { targetUrl?: string; leadId?: string } }) => {
      addActivity({
        type: 'info',
        message: `[${data.queue}] Job ${data.jobId} started${data.data.targetUrl ? ` → ${data.data.targetUrl}` : ''}`,
        queue: data.queue,
        leadId: data.data.leadId,
      });
    });

    socket.on('job:completed', (data: { jobId: string; queue: string; leadId?: string }) => {
      addActivity({
        type: 'success',
        message: `[${data.queue}] Job ${data.jobId} completed`,
        queue: data.queue,
        leadId: data.leadId,
      });
    });

    socket.on('job:failed', (data: { jobId: string; queue: string; error: string }) => {
      addActivity({
        type: 'error',
        message: `[${data.queue}] Job ${data.jobId} failed: ${data.error}`,
        queue: data.queue,
      });
    });

    socket.on('lead:updated', (data: { leadId: string; status: string }) => {
      updateLead(data.leadId, { status: data.status as Lead['status'] });
      addActivity({
        type: 'info',
        message: `Lead status → ${data.status}`,
        leadId: data.leadId,
      });
    });

    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, [isAuthenticated]);
}

// Needed for the updateLead type
import type { Lead } from '../api/leads';
