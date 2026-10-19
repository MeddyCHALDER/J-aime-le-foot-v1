import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export const profilesKeys = {
  detail: (id: string) => ['profiles', id] as const,
};

export function useProfile(id: string | undefined) {
  return useQuery({
    queryKey: profilesKeys.detail(id ?? ''),
    queryFn: () => api.fetchProfile(id!),
    enabled: !!id,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Parameters<typeof api.updateProfile>[1];
    }) => api.updateProfile(id, updates),
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: profilesKeys.detail(variables.id) }),
  });
}
