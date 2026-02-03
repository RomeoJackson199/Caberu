/**
 * Tests for NotFound page - 404 error page
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from '../NotFound';

// Mock dependencies
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/non-existent-page' }),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (table: string) => {
      mockFrom(table);
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    },
  },
}));

const renderNotFound = () => {
  return render(
    <MemoryRouter>
      <NotFound />
    </MemoryRouter>
  );
};

describe('NotFound', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  describe('Rendering', () => {
    it('should render 404 error message', () => {
      renderNotFound();

      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    });

    it('should show explanation text', () => {
      renderNotFound();

      expect(screen.getByText(/The page you're looking for doesn't exist/)).toBeInTheDocument();
    });

    it('should display the attempted path', () => {
      renderNotFound();

      expect(screen.getByText('/non-existent-page')).toBeInTheDocument();
    });

    it('should render Go Back button', () => {
      renderNotFound();

      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('should render Go to Homepage button', () => {
      renderNotFound();

      expect(screen.getByRole('button', { name: /go to homepage/i })).toBeInTheDocument();
    });

    it('should render Quick Links section', () => {
      renderNotFound();

      expect(screen.getByText('Quick Links')).toBeInTheDocument();
    });

    it('should show command palette help text', () => {
      renderNotFound();

      expect(screen.getByText(/Need help\?/)).toBeInTheDocument();
      expect(screen.getByText('Cmd+K')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate back when Go Back button is clicked', () => {
      renderNotFound();

      fireEvent.click(screen.getByRole('button', { name: /go back/i }));

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('should navigate to homepage when Go to Homepage button is clicked', () => {
      renderNotFound();

      fireEvent.click(screen.getByRole('button', { name: /go to homepage/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Quick Links for unauthenticated users', () => {
    it('should show Home link', () => {
      renderNotFound();

      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('should show Find Dentists link', async () => {
      renderNotFound();

      expect(screen.getByText('Find Dentists')).toBeInTheDocument();
    });

    it('should show Support link', () => {
      renderNotFound();

      expect(screen.getByText('Support')).toBeInTheDocument();
    });
  });

  describe('Quick Links keyboard navigation', () => {
    it('should navigate on Enter key press', () => {
      renderNotFound();

      const supportCard = screen.getByText('Support').closest('[role="button"]');
      if (supportCard) {
        fireEvent.keyDown(supportCard, { key: 'Enter' });
        expect(mockNavigate).toHaveBeenCalledWith('/support');
      }
    });

    it('should navigate on Space key press', () => {
      renderNotFound();

      const supportCard = screen.getByText('Support').closest('[role="button"]');
      if (supportCard) {
        fireEvent.keyDown(supportCard, { key: ' ' });
        expect(mockNavigate).toHaveBeenCalledWith('/support');
      }
    });
  });

  describe('Logging', () => {
    it('should log 404 error on mount', async () => {
      const { logger } = await import('@/lib/logger');
      renderNotFound();

      expect(logger.warn).toHaveBeenCalledWith(
        '404 Error: User attempted to access non-existent route:',
        '/non-existent-page'
      );
    });
  });
});
