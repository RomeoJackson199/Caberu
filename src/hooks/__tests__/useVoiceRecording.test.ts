import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoiceRecording } from '../useVoiceRecording';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/hooks/useLanguage');
jest.mock('@/lib/logger');
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

// Mock MediaRecorder
class MockMediaRecorder {
  state = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  static instances: MockMediaRecorder[] = [];

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    MockMediaRecorder.instances.push(this);
  }

  start() {
    this.state = 'recording';
    // Simulate data available event after a short time
    setTimeout(() => {
      if (this.ondataavailable) {
        const audioData = new Uint8Array([1, 2, 3, 4, 5]);
        this.ondataavailable({ data: new Blob([audioData], { type: 'audio/webm' }) });
      }
    }, 100);
  }

  stop() {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop();
    }
  }
}

// Mock MediaStream
class MockMediaStream {
  tracks: MediaStreamTrack[] = [];

  constructor() {
    this.tracks = [
      {
        stop: jest.fn(),
        kind: 'audio',
        enabled: true,
      } as unknown as MediaStreamTrack,
    ];
  }

  getTracks() {
    return this.tracks;
  }
}

describe('useVoiceRecording', () => {
  const mockToast = { toast: jest.fn() };
  const mockT = {
    error: 'Error',
    voiceProcessingError: 'Voice processing error',
    microphoneAccessError: 'Microphone access denied',
  };

  let mockMediaStream: MockMediaStream;
  let originalMediaDevices: typeof navigator.mediaDevices;
  let originalMediaRecorder: typeof MediaRecorder;

  beforeEach(() => {
    jest.clearAllMocks();
    MockMediaRecorder.instances = [];

    // Setup mocks
    (useToast as jest.Mock).mockReturnValue(mockToast);
    (useLanguage as jest.Mock).mockReturnValue({ t: mockT });

    // Create mock media stream
    mockMediaStream = new MockMediaStream();

    // Save originals
    originalMediaDevices = navigator.mediaDevices;
    originalMediaRecorder = global.MediaRecorder;

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockResolvedValue(mockMediaStream),
      },
      configurable: true,
      writable: true,
    });

    // Mock MediaRecorder
    global.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;
  });

  afterEach(() => {
    // Restore originals
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
      writable: true,
    });
    global.MediaRecorder = originalMediaRecorder;
  });

  describe('initial state', () => {
    it('should initialize with isRecording as false', () => {
      const onTranscription = jest.fn();
      const { result } = renderHook(() => useVoiceRecording({ onTranscription }));

      expect(result.current.isRecording).toBe(false);
    });

    it('should return startRecording and stopRecording functions', () => {
      const onTranscription = jest.fn();
      const { result } = renderHook(() => useVoiceRecording({ onTranscription }));

      expect(typeof result.current.startRecording).toBe('function');
      expect(typeof result.current.stopRecording).toBe('function');
    });
  });

  describe('startRecording', () => {
    it('should request microphone access with correct audio constraints', async () => {
      const onTranscription = jest.fn();
      const { result } = renderHook(() => useVoiceRecording({ onTranscription }));

      await act(async () => {
        await result.current.startRecording();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    });

    it('should set isRecording to true when recording starts', async () => {
      const onTranscription = jest.fn();
      const { result } = renderHook(() => useVoiceRecording({ onTranscription }));

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
    });

    it('should show recording started toast', async () => {
      const onTranscription = jest.fn();
      const { result } = renderHook(() => useVoiceRecording({ onTranscription }));

      await act(async () => {
        await result.current.startRecording();
      });

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Enregistrement en cours',
        description: 'Parlez maintenant...',
      });
    });

    it('should handle microphone access error', async () => {
      const onTranscription = jest.fn();
      const error = new Error('Permission denied');
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useVoiceRecording({ onTranscription }));

      await act(async () => {
        await result.current.startRecording();
      });

      expect(logger.error).toHaveBeenCalledWith('Error starting recording:', error);
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: mockT.error,
        description: mockT.microphoneAccessError,
        variant: 'destructive',
      });
      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('stopRecording', () => {
    it('should set isRecording to false when recording stops', async () => {
      const onTranscription = jest.fn();
      const { result } = renderHook(() => useVoiceRecording({ onTranscription }));

      // Start recording
      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);

      // Stop recording
      act(() => {
        result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
    });

    it('should not throw when called without active recording', () => {
      const onTranscription = jest.fn();
      const { result } = renderHook(() => useVoiceRecording({ onTranscription }));

      expect(() => {
        act(() => {
          result.current.stopRecording();
        });
      }).not.toThrow();
    });

    it('should stop media stream tracks', async () => {
      const onTranscription = jest.fn();
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { text: 'Hello world' },
        error: null,
      });

      const { result } = renderHook(() => useVoiceRecording({ onTranscription }));

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.stopRecording();
      });

      // Wait for onstop handler to process
      await waitFor(() => {
        expect(mockMediaStream.tracks[0].stop).toHaveBeenCalled();
      });
    });
  });

  describe('voice transcription', () => {
    it('should process audio and call onTranscription with result', async () => {
      const onTranscription = jest.fn();
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { text: 'Hello world' },
        error: null,
      });

      const { result } = renderHook(() => useVoiceRecording({ onTranscription }));

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalledWith('voice-to-text', {
          body: expect.objectContaining({
            audio: expect.any(String),
          }),
        });
      });

      await waitFor(() => {
        expect(onTranscription).toHaveBeenCalledWith('Hello world');
      });
    });

    it('should show success toast with transcribed text', async () => {
      const onTranscription = jest.fn();
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { text: 'Hello world' },
        error: null,
      });

      const { result } = renderHook(() => useVoiceRecording({ onTranscription }));

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Message vocal recu',
          description: '"Hello world"',
        });
      });
    });

    it('should show error toast when no text is detected', async () => {
      const onTranscription = jest.fn();
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { text: '' },
        error: null,
      });

      const { result } = renderHook(() => useVoiceRecording({ onTranscription }));

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Aucun texte detecte',
          description: 'Veuillez reessayer',
          variant: 'destructive',
        });
      });

      expect(onTranscription).not.toHaveBeenCalled();
    });

    it('should show error toast when text is only whitespace', async () => {
      const onTranscription = jest.fn();
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { text: '   ' },
        error: null,
      });

      const { result } = renderHook(() => useVoiceRecording({ onTranscription }));

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Aucun texte detecte',
          description: 'Veuillez reessayer',
          variant: 'destructive',
        });
      });

      expect(onTranscription).not.toHaveBeenCalled();
    });

    it('should handle voice-to-text API error', async () => {
      const onTranscription = jest.fn();
      const error = new Error('API error');
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error,
      });

      const { result } = renderHook(() => useVoiceRecording({ onTranscription }));

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith('Error processing voice message:', error);
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: mockT.error,
          description: mockT.voiceProcessingError,
          variant: 'destructive',
        });
      });

      expect(onTranscription).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should stop media stream tracks on unmount', async () => {
      const onTranscription = jest.fn();
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { text: 'Hello' },
        error: null,
      });

      const { result, unmount } = renderHook(() => useVoiceRecording({ onTranscription }));

      await act(async () => {
        await result.current.startRecording();
      });

      unmount();

      // The cleanup should have stopped the tracks
      expect(mockMediaStream.tracks[0].stop).toHaveBeenCalled();
    });
  });
});
