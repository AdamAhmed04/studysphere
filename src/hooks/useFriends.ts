import { useState, useEffect } from 'react';
import { friendService, FriendWithProfile } from '../services/friendService';

export const useFriends = (userId: string | undefined) => {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setFriends([]);
      setPendingRequests([]);
      setLoading(false);
      return;
    }

    loadFriends();
    loadPendingRequests();

    const pendingSubscription = friendService.subscribeToPendingRequests((requests) => {
      console.log('[useFriends] Pending requests updated:', requests.length);
      setPendingRequests(requests);
    });

    const friendsSubscription = friendService.subscribeToFriendsChanges((updatedFriends) => {
      console.log('[useFriends] Friends list updated:', updatedFriends.length);
      setFriends(updatedFriends);
    });

    return () => {
      pendingSubscription.unsubscribe();
      friendsSubscription.unsubscribe();
    };
  }, [userId]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const friendsList = await friendService.getFriends();
      console.log('[useFriends] Loaded friends:', friendsList.length);
      setFriends(friendsList);
      setError(null);
    } catch (err: any) {
      console.error('[useFriends] Error loading friends:', err);
      setError(err.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const requests = await friendService.getPendingRequests();
      console.log('[useFriends] Loaded pending requests:', requests.length);
      setPendingRequests(requests);
    } catch (err) {
      console.error('[useFriends] Error loading pending requests:', err);
    }
  };

  const sendFriendRequest = async (email: string) => {
    try {
      const result = await friendService.sendFriendRequest(email);
      if (result.success) {
        return { success: true, message: result.message };
      } else {
        return { success: false, message: result.message };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to send friend request' };
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      const newFriend = await friendService.acceptFriendRequest(requestId);

      if (newFriend) {
        console.log('[useFriends] Optimistic update - adding new friend:', newFriend.name);
        setFriends(prev => {
          const exists = prev.some(f => f.id === newFriend.id);
          if (exists) return prev;
          return [newFriend, ...prev];
        });
      }

      console.log('[useFriends] Reloading pending requests after accept');
      await loadPendingRequests();
    } catch (err: any) {
      console.error('[useFriends] Error accepting friend request:', err);
      setError(err.message || 'Failed to accept friend request');
      throw err;
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      await friendService.rejectFriendRequest(requestId);
      await loadPendingRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to reject friend request');
      throw err;
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      await friendService.removeFriend(friendId);
      await loadFriends();
    } catch (err: any) {
      setError(err.message || 'Failed to remove friend');
      throw err;
    }
  };

  return {
    friends,
    pendingRequests,
    loading,
    error,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    refreshFriends: loadFriends
  };
};
