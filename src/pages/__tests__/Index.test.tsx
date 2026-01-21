import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Index from '@/pages/Index';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

// Mock all the homepage components
jest.mock('@/components/homepage/Header', () => ({
  Header: ({ user }: { user: any }) => <div data-testid="mock-header">Header {user ? 'Logged In' : 'Guest'}</div>,
}));

jest.mock('@/components/homepage/Footer', () => ({
  Footer: () => <div data-testid="mock-footer">Footer</div>,
}));

jest.mock('@/components/homepage/PremiumHeroSection', () => ({
  PremiumHeroSection: () => <div data-testid="mock-hero">Premium Hero Section</div>,
}));

jest.mock('@/components/homepage/feature-section', () => ({
  FeatureSection: () => <div data-testid="mock-features">Feature Section</div>,
}));

jest.mock('@/components/homepage/InteractiveBentoGrid', () => ({
  InteractiveBentoGrid: () => <div data-testid="mock-bento">Bento Grid</div>,
}));

jest.mock('@/components/homepage/TestimonialsSection', () => ({
  TestimonialsSection: () => <div data-testid="mock-testimonials">Testimonials</div>,
}));

jest.mock('@/components/homepage/ResultsSection', () => ({
  ResultsSection: () => <div data-testid="mock-results">Results Section</div>,
}));

jest.mock('@/components/homepage/FAQSection', () => ({
  FAQSection: () => <div data-testid="mock-faq">FAQ Section</div>,
}));

jest.mock('@/components/homepage/PricingSection', () => ({
  PricingSection: () => <div data-testid="mock-pricing">Pricing Section</div>,
}));

jest.mock('@/components/homepage/ContactForm', () => ({
  ContactForm: ({ open }: { open: boolean }) => open ? <div data-testid="mock-contact-form">Contact Form</div> : null,
}));

jest.mock('@/components/chat/FloatingChatBubble', () => ({
  FloatingChatBubble: () => <div data-testid="mock-chat-bubble">Chat Bubble</div>,
}));

jest.mock('@/components/mobile/MobileBottomNav', () => ({
  MobileBottomNav: () => <div data-testid="mock-mobile-nav">Mobile Nav</div>,
}));

jest.mock('@/components/demo/DemoTourFlow', () => ({
  DemoTourFlow: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div data-testid="mock-demo-tour">Demo Tour</div> : null,
}));

jest.mock('@/components/homepage/HomepageSkeleton', () => ({
  HomepageSkeleton: () => <div data-testid="homepage-skeleton">Loading...</div>,
}));

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Index Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();

    // Default: no user session
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton while checking auth state', () => {
      // Make getSession hang to keep loading state
      (supabase.auth.getSession as jest.Mock).mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<Index />);

      expect(screen.getByTestId('homepage-skeleton')).toBeInTheDocument();
    });
  });

  describe('Unauthenticated User', () => {
    it('renders homepage for unauthenticated users', async () => {
      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      });

      expect(screen.getByTestId('mock-hero')).toBeInTheDocument();
      expect(screen.getByTestId('mock-features')).toBeInTheDocument();
      expect(screen.getByTestId('mock-bento')).toBeInTheDocument();
      expect(screen.getByTestId('mock-testimonials')).toBeInTheDocument();
      expect(screen.getByTestId('mock-results')).toBeInTheDocument();
      expect(screen.getByTestId('mock-faq')).toBeInTheDocument();
      expect(screen.getByTestId('mock-pricing')).toBeInTheDocument();
      expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
    });

    it('displays Get Started Now button', async () => {
      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Get Started Now')).toBeInTheDocument();
      });
    });

    it('navigates to signup when Get Started Now is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Get Started Now')).toBeInTheDocument();
      });

      const getStartedButton = screen.getByText('Get Started Now');
      await user.click(getStartedButton);

      expect(mockNavigate).toHaveBeenCalledWith('/signup');
    });

    it('opens contact form when Contact Sales is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Contact Sales')).toBeInTheDocument();
      });

      const contactButton = screen.getByText('Contact Sales');
      await user.click(contactButton);

      await waitFor(() => {
        expect(screen.getByTestId('mock-contact-form')).toBeInTheDocument();
      });
    });

    it('renders floating chat bubble', async () => {
      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByTestId('mock-chat-bubble')).toBeInTheDocument();
      });
    });

    it('renders mobile bottom navigation', async () => {
      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByTestId('mock-mobile-nav')).toBeInTheDocument();
      });
    });
  });

  describe('Authenticated User', () => {
    it('redirects authenticated users to auth-redirect', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-id', email: 'test@example.com' },
          },
        },
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/auth-redirect', { replace: true });
      });
    });

    it('redirects when user signs in during session', async () => {
      const mockCallback = jest.fn();
      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        mockCallback.mockImplementation(callback);
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      });

      // Simulate user signing in
      mockCallback('SIGNED_IN', {
        user: { id: 'test-user-id', email: 'test@example.com' },
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/auth-redirect', { replace: true });
      });
    });
  });

  describe('Error Handling', () => {
    it('handles getSession error gracefully', async () => {
      (supabase.auth.getSession as jest.Mock).mockRejectedValue(new Error('Session error'));

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      });

      // Should still render the page even if session check fails
      expect(screen.getByTestId('mock-hero')).toBeInTheDocument();
    });
  });

  describe('AI Context Metadata', () => {
    it('includes hidden AI context metadata', async () => {
      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      });

      const aiContext = document.querySelector('[data-ai-context="true"]');
      expect(aiContext).toBeInTheDocument();
    });
  });
});
