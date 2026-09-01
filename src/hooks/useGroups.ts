import { useState, useEffect } from 'react';
import { groupService, StudyGroupData } from '../services/groupService';
import { errorMessage } from '../utils/errors';

export const useGroups = (userId: string | undefined) => {
  const [groups, setGroups] = useState<StudyGroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    loadGroups();
  }, [userId]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const groupsList = await groupService.getGroups();
      setGroups(groupsList);
      setError(null);
    } catch (err) {
      console.error('Error loading groups:', err);
      setError(errorMessage(err, 'Failed to load groups'));
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (groupData: {
    name: string;
    description: string;
    subject?: string;
    isPrivate: boolean;
    memberIds: string[];
  }) => {
    try {
      const newGroup = await groupService.createGroup(groupData);
      await loadGroups();
      return newGroup;
    } catch (err) {
      setError(errorMessage(err, 'Failed to create group'));
      throw err;
    }
  };

  const leaveGroup = async (groupId: string) => {
    try {
      await groupService.leaveGroup(groupId);
      await loadGroups();
    } catch (err) {
      setError(errorMessage(err, 'Failed to leave group'));
      throw err;
    }
  };

  return {
    groups,
    loading,
    error,
    createGroup,
    leaveGroup,
    refreshGroups: loadGroups
  };
};
