import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { logger } from '@/lib/logger';

interface UseVoiceRecordingOptions {
  onTranscription: (text: string) => void;
}

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function useVoiceRecording({ onTranscription }: UseVoiceRecordingOptions): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Cleanup media stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  const processVoiceMessage = async (audioBlob: Blob) => {
    try {
      // Convert audio to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Send to voice-to-text edge function
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (error) throw error;

      const transcribedText = data.text;

      if (transcribedText && transcribedText.trim()) {
        onTranscription(transcribedText);
        toast({
          title: "Message vocal recu",
          description: `"${transcribedText}"`,
        });
      } else {
        toast({
          title: "Aucun texte detecte",
          description: "Veuillez reessayer",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Error processing voice message:', error);
      toast({
        title: t.error,
        description: t.voiceProcessingError,
        variant: "destructive",
      });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processVoiceMessage(audioBlob);

        // Stop all tracks
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setMediaStream(null);
        }
      };

      setMediaRecorder(recorder);
      setMediaStream(stream);
      recorder.start();
      setIsRecording(true);

      toast({
        title: "Enregistrement en cours",
        description: "Parlez maintenant...",
      });

    } catch (error) {
      logger.error('Error starting recording:', error);
      toast({
        title: t.error,
        description: t.microphoneAccessError,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
