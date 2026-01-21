import { renderHook, waitFor } from '@testing-library/react';
import { usePatientTags } from '../usePatientTags';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

const mockToast = { toast: jest.fn() };
(useToast as jest.Mock).mockReturnValue(mockToast);

describe('usePatientTags', () => {
  const mockBusinessId = 'business-123';
  const mockPatientId = 'patient-456';

  const mockTags = [
    { id: 'tag-1', business_id: mockBusinessId, name: 'VIP', color: '#FF0000' },
    { id: 'tag-2', business_id: mockBusinessId, name: 'Regular', color: '#00FF00' },
  ];

  const mockPatientTagAssignments = [
    {
      id: 'assignment-1',
      patient_id: mockPatientId,
      tag_id: 'tag-1',
      patient_tags: { id: 'tag-1', name: 'VIP', color: '#FF0000', description: null },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchTags', () => {
    it('should fetch tags for business on mount', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: mockTags, error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => usePatientTags({ businessId: mockBusinessId }));

      await waitFor(() => {
        expect(result.current.tags).toEqual(mockTags);
      });

      expect(supabase.from).toHaveBeenCalledWith('patient_tags');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('business_id', mockBusinessId);
      expect(mockOrder).toHaveBeenCalledWith('name');
    });

    it('should handle fetch tags error silently', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Fetch failed'),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => usePatientTags({ businessId: mockBusinessId }));

      await waitFor(() => {
        expect(result.current.tags).toEqual([]);
      });
    });

    it('should not fetch tags if businessId is not provided', async () => {
      renderHook(() => usePatientTags({}));

      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('fetchPatientTags', () => {
    it('should fetch patient tag assignments on mount', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: mockPatientTagAssignments,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      const { result } = renderHook(() => usePatientTags({ patientId: mockPatientId }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.patientTags).toHaveLength(1);
      expect(result.current.patientTags[0].tag?.name).toBe('VIP');
    });

    it('should handle array response from Supabase join', async () => {
      const assignmentWithArray = [{
        id: 'assignment-1',
        patient_id: mockPatientId,
        tag_id: 'tag-1',
        patient_tags: [{ id: 'tag-1', name: 'VIP', color: '#FF0000', description: null }],
      }];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: assignmentWithArray,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      const { result } = renderHook(() => usePatientTags({ patientId: mockPatientId }));

      await waitFor(() => {
        expect(result.current.patientTags[0].tag?.name).toBe('VIP');
      });
    });

    it('should not fetch patient tags if patientId is not provided', async () => {
      renderHook(() => usePatientTags({ businessId: mockBusinessId }));

      // Only patient_tags should be called, not patient_tag_assignments
      await waitFor(() => {
        const calls = (supabase.from as jest.Mock).mock.calls;
        const patientTagAssignmentCalls = calls.filter(call => call[0] === 'patient_tag_assignments');
        expect(patientTagAssignmentCalls).toHaveLength(0);
      });
    });
  });

  describe('createTag', () => {
    it('should create a new tag', async () => {
      const newTag = { business_id: mockBusinessId, name: 'New Tag', color: '#0000FF' };

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'patient_tags') {
          return {
            insert: mockInsert,
            select: mockSelect,
          };
        }
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => usePatientTags({ businessId: mockBusinessId }));

      await result.current.createTag(newTag);

      expect(mockInsert).toHaveBeenCalledWith(newTag);
      expect(mockToast.toast).toHaveBeenCalledWith({ title: 'Tag created' });
    });

    it('should handle create tag error', async () => {
      const newTag = { business_id: mockBusinessId, name: 'New Tag', color: '#0000FF' };
      const error = new Error('Create failed');

      const mockInsert = jest.fn().mockResolvedValue({ error });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const { result } = renderHook(() => usePatientTags({ businessId: mockBusinessId }));

      await result.current.createTag(newTag);

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Create failed',
        variant: 'destructive',
      });
    });
  });

  describe('assignTag', () => {
    it('should assign a tag to a patient', async () => {
      const mockUser = { user: { id: 'user-123' } };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: mockUser });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: [], error: null });

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'patient_tag_assignments') {
          return {
            insert: mockInsert,
            select: mockSelect,
          };
        }
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      const { result } = renderHook(() => usePatientTags({ patientId: mockPatientId }));

      await result.current.assignTag('tag-1');

      expect(mockInsert).toHaveBeenCalledWith({
        patient_id: mockPatientId,
        tag_id: 'tag-1',
        assigned_by: 'user-123',
      });
      expect(mockToast.toast).toHaveBeenCalledWith({ title: 'Tag assigned' });
    });

    it('should handle duplicate tag assignment', async () => {
      const mockUser = { user: { id: 'user-123' } };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: mockUser });

      const duplicateError = { code: '23505', message: 'Duplicate key' };
      const mockInsert = jest.fn().mockResolvedValue({ error: duplicateError });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const { result } = renderHook(() => usePatientTags({ patientId: mockPatientId }));

      await result.current.assignTag('tag-1');

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Tag already assigned',
        variant: 'destructive',
      });
    });

    it('should not assign tag if patientId is not provided', async () => {
      const { result } = renderHook(() => usePatientTags({ businessId: mockBusinessId }));

      await result.current.assignTag('tag-1');

      expect(supabase.auth.getUser).not.toHaveBeenCalled();
    });
  });

  describe('unassignTag', () => {
    it('should remove a tag from a patient', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockSelect = jest.fn().mockReturnThis();

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'patient_tag_assignments') {
          return {
            delete: mockDelete,
            select: mockSelect,
          };
        }
      });

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      mockSelect.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(() => usePatientTags({ patientId: mockPatientId }));

      await result.current.unassignTag('assignment-1');

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'assignment-1');
      expect(mockToast.toast).toHaveBeenCalledWith({ title: 'Tag removed' });
    });

    it('should handle unassign tag error', async () => {
      const error = new Error('Delete failed');
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error });

      (supabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      const { result } = renderHook(() => usePatientTags({}));

      await result.current.unassignTag('assignment-1');

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Delete failed',
        variant: 'destructive',
      });
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockSelect = jest.fn().mockReturnThis();

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'patient_tags') {
          return {
            delete: mockDelete,
            select: mockSelect,
          };
        }
      });

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(() => usePatientTags({ businessId: mockBusinessId }));

      await result.current.deleteTag('tag-1');

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'tag-1');
      expect(mockToast.toast).toHaveBeenCalledWith({ title: 'Tag deleted' });
    });
  });

  describe('refresh', () => {
    it('should refresh both tags and patient tags', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: mockTags, error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() =>
        usePatientTags({ businessId: mockBusinessId, patientId: mockPatientId })
      );

      await waitFor(() => {
        expect(result.current.tags.length).toBeGreaterThan(0);
      });

      jest.clearAllMocks();

      result.current.refresh();

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalled();
      });
    });
  });
});
