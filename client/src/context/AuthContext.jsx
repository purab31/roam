import { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  // Query current user profile from session cookie
  const {
    data: user,
    isLoading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['authUser'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/users/profile', {
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success && json.data?.user) {
          return json.data.user;
        }
        return null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async credentials => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Login failed');
      }
      return data.data.user;
    },
    onSuccess: loggedInUser => {
      queryClient.setQueryData(['authUser'], loggedInUser);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async userData => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!data.success) {
        const error = new Error(data.error?.message || 'Registration failed');
        error.fields = data.error?.fields;
        throw error;
      }
      return data.data.user;
    },
    onSuccess: registeredUser => {
      queryClient.setQueryData(['authUser'], registeredUser);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    },
    onSuccess: () => {
      localStorage.removeItem('roam_listing_wizard_draft');
      queryClient.setQueryData(['authUser'], null);
      queryClient.clear();
    },
  });

  // Update Profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async updateData => {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });
      const data = await res.json();
      if (!data.success) {
        const error = new Error(data.error?.message || 'Update failed');
        error.fields = data.error?.fields;
        throw error;
      }
      return data.data.user;
    },
    onSuccess: updatedUser => {
      queryClient.setQueryData(['authUser'], updatedUser);
    },
  });

  // Change Password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async passwords => {
      const res = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(passwords),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to change password');
      }
      return data.data;
    },
  });

  // Request Deactivation mutation
  const requestDeactivationMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/users/account-status', {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to request deactivation');
      }
      return data.data.user;
    },
    onSuccess: updatedUser => {
      queryClient.setQueryData(['authUser'], updatedUser);
    },
  });

  // Add Capability mutation
  const addCapabilityMutation = useMutation({
    mutationFn: async capability => {
      const res = await fetch('/api/users/capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ capability }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to add capability');
      }
      return data.data.user;
    },
    onSuccess: updatedUser => {
      queryClient.setQueryData(['authUser'], updatedUser);
    },
  });

  const hasCapability = cap => {
    if (!user) return false;
    if (user.capabilities?.includes('admin')) return true;
    return user.capabilities?.includes(cap) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        hasCapability,
        login: loginMutation.mutateAsync,
        register: registerMutation.mutateAsync,
        logout: logoutMutation.mutateAsync,
        updateProfile: updateProfileMutation.mutateAsync,
        changePassword: changePasswordMutation.mutateAsync,
        requestDeactivation: requestDeactivationMutation.mutateAsync,
        addCapability: addCapabilityMutation.mutateAsync,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
