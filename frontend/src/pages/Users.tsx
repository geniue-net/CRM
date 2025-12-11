import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { apiService } from '../services/api';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    email: '',
    password: '',
    role: 'USER' as 'ADMIN' | 'USER',
    is_active: true,
  });
  const currentUser = { role: 'ADMIN' };

  const fetchUsers = useCallback(async () => {
    try {
      const response = await apiService.getUsers();
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [fetchUsers]);

  const handleOpen = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        id: user.id,
        email: user.email,
        password: '',
        role: user.role,
        is_active: user.is_active,
      });
    } else {
      setEditingUser(null);
      setFormData({
        id: '',
        email: '',
        password: '',
        role: 'USER',
        is_active: true,
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        console.log('Update user:', formData);
      } else {
        await apiService.createUser(formData);
        fetchUsers();
      }
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!userId || userId.trim() === '') {
      setError('Cannot delete user: Invalid user ID');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await apiService.deleteUser(userId);
        fetchUsers();
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to delete user');
      }
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
        You don't have permission to access this page.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Users</h1>
        <button
          onClick={() => handleOpen()}
          className="btn btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <div className="card p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Role</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Created</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Last Login</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(users || []).map((user) => (
                <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-dark-lighter">
                  <td className="py-3 px-4 text-gray-900 dark:text-white">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-primary text-black'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpen(user)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-lighter"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={!user.id || user.id.trim() === ''}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleClose}>
          <div className="card p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum 8 characters, 1 digit, 1 uppercase letter
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'USER' })}
                  className="input"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={handleClose} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleSubmit} className="btn btn-primary">
                {editingUser ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
