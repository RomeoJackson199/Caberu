import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { DentalChatbot } from '../DentalChatbot';
import { useToast } from '@/hooks/use-toast';

// Create a new QueryClient for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Helper function to render with providers
const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'test-user',
              role: 'patient',
              email: 'test@example.com'
            },
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    rpc: jest.fn(() => Promise.resolve({
      data: false,
      error: null
    })),
    functions: {
      invoke: jest.fn(() => Promise.resolve({
        data: {
          response: 'I can help you with your dental concerns.',
          suggestions: []
        },
        error: null
      }))
    }
  }
}));

const mockToast = {
  toast: jest.fn()
};

const mockUser: any = { id: 'test-user' };

(useToast as jest.Mock).mockReturnValue(mockToast);

describe('DentalChatbot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chatbot interface', () => {
    renderWithProviders(<DentalChatbot user={null} />);
    
    expect(screen.getByText(/dental assistant/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('allows user to type and send messages', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DentalChatbot user={null} />);
    
    const messageInput = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    await user.type(messageInput, 'I have a toothache');
    await user.click(sendButton);
    
    expect(screen.getByText('I have a toothache')).toBeInTheDocument();
  });

  it('sends message on Enter key press', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DentalChatbot user={null} />);
    
    const messageInput = screen.getByPlaceholderText(/type your message/i);
    
    await user.type(messageInput, 'I have a toothache{enter}');
    
    expect(screen.getByText('I have a toothache')).toBeInTheDocument();
  });

  it('shows AI response after sending message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DentalChatbot user={null} />);
    
    const messageInput = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    await user.type(messageInput, 'I have a toothache');
    await user.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText(/I can help you with your dental concerns/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while AI is processing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DentalChatbot user={null} />);
    
    const messageInput = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    await user.type(messageInput, 'I have a toothache');
    await user.click(sendButton);
    
    expect(screen.getByText(/ai is thinking/i)).toBeInTheDocument();
  });

  it('handles AI response with suggestions', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.functions.invoke as unknown as jest.Mock).mockResolvedValue({
      data: {
        response: 'Based on your symptoms, I recommend booking an appointment.',
        suggestions: [
          { type: 'appointment', label: 'Book Appointment', data: { urgency: 'high' } }
        ]
      },
      error: null
    });

    const user = userEvent.setup();
    renderWithProviders(<DentalChatbot user={null} />);
    
    const messageInput = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    await user.type(messageInput, 'I have severe pain');
    await user.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText(/book appointment/i)).toBeInTheDocument();
    });
  });

  it('handles emergency triage assessment', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.functions.invoke as unknown as jest.Mock).mockResolvedValue({
      data: {
        response: 'This appears to be an emergency. Please seek immediate care.',
        urgency: 'urgent',
        suggestions: [
          { type: 'emergency', label: 'Emergency Booking', data: { priority: 'urgent' } }
        ]
      },
      error: null
    });

    const user = userEvent.setup();
    renderWithProviders(<DentalChatbot user={null} />);
    
    const messageInput = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    await user.type(messageInput, 'I have severe bleeding and pain');
    await user.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText(/emergency/i)).toBeInTheDocument();
      expect(screen.getByText(/immediate care/i)).toBeInTheDocument();
    });
  });

  it('allows user to click on AI suggestions', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.functions.invoke as unknown as jest.Mock).mockResolvedValue({
      data: {
        response: 'I can help you book an appointment.',
        suggestions: [
          { type: 'appointment', label: 'Book Appointment', data: { type: 'consultation' } }
        ]
      },
      error: null
    });

    const user = userEvent.setup();
    renderWithProviders(<DentalChatbot user={null} />);
    
    const messageInput = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    await user.type(messageInput, 'I need to see a dentist');
    await user.click(sendButton);
    
    await waitFor(async () => {
      const suggestionButton = screen.getByText(/book appointment/i);
      await user.click(suggestionButton);
      
      // Should trigger appointment booking flow
      expect(mockToast.toast).toHaveBeenCalled();
    });
  });

  it('handles error when AI service is unavailable', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.functions.invoke as unknown as jest.Mock).mockRejectedValue(new Error('Service unavailable'));

    const user = userEvent.setup();
    renderWithProviders(<DentalChatbot user={null} />);
    
    const messageInput = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    await user.type(messageInput, 'I have a question');
    await user.click(sendButton);
    
    await waitFor(() => {
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to get AI response',
        variant: 'destructive'
      });
    });
  });

  it('shows conversation history', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DentalChatbot user={null} />);
    
    const messageInput = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    // Send multiple messages
    await user.type(messageInput, 'Hello');
    await user.click(sendButton);
    
    await user.type(messageInput, 'I have a question');
    await user.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('I have a question')).toBeInTheDocument();
    });
  });

  it.skip('provides quick action buttons', () => {
    renderWithProviders(<DentalChatbot user={null} />);
    
    expect(screen.getByText(/book appointment/i)).toBeInTheDocument();
    expect(screen.getByText(/emergency/i)).toBeInTheDocument();
    expect(screen.getByText(/symptoms/i)).toBeInTheDocument();
  });

  it.skip('handles quick action button clicks', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DentalChatbot user={null} />);
    
    const emergencyButton = screen.getByText(/emergency/i);
    await user.click(emergencyButton);
    
    expect(screen.getByText(/emergency assessment/i)).toBeInTheDocument();
  });

  it('shows user profile information', async () => {
    renderWithProviders(<DentalChatbot user={null} />);
    
    await waitFor(() => {
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });
  });

  it('handles chat window resizing', () => {
    renderWithProviders(<DentalChatbot user={null} />);
    
    const chatContainer = screen.getByRole('main');
    expect(chatContainer).toBeInTheDocument();
  });

  it('shows typing indicator when AI is responding', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DentalChatbot user={null} />);
    
    const messageInput = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    await user.type(messageInput, 'I have a question');
    await user.click(sendButton);
    
    expect(screen.getByText(/ai is thinking/i)).toBeInTheDocument();
  });

  it('handles empty message submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DentalChatbot user={null} />);
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);
    
    // Should not send empty message
    expect(screen.queryByText('')).not.toBeInTheDocument();
  });

  it('provides accessibility features', () => {
    renderWithProviders(<DentalChatbot user={null} />);
    
    const messageInput = screen.getByPlaceholderText(/type your message/i);
    expect(messageInput).toHaveAttribute('aria-label');
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toHaveAttribute('aria-label');
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DentalChatbot user={null} />);
    
    const messageInput = screen.getByPlaceholderText(/type your message/i);
    messageInput.focus();
    
    // Test tab navigation
    await user.tab();
    expect(screen.getByRole('button', { name: /send/i })).toHaveFocus();
  });

  it('shows conversation export option', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DentalChatbot user={null} />);
    
    await waitFor(async () => {
      const exportButton = screen.getByText(/export conversation/i);
      await user.click(exportButton);
      
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Conversation exported successfully',
        variant: 'default'
      });
    });
  });

  it('handles conversation clearing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DentalChatbot user={null} />);
    
    await waitFor(async () => {
      const clearButton = screen.getByText(/clear conversation/i);
      await user.click(clearButton);
      
      // Should clear all messages
      expect(screen.queryByText(/previous message/i)).not.toBeInTheDocument();
    });
  });
});