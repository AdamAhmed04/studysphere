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

    const pendingSubscription = friendService.subscribeToPendingRequests(
      userId,
      (requests) => setPendingRequests(requests)
    );

    const friendsSubscription = friendService.subscribeToFriendsChanges(
      userId,
      (updatedFriends) => setFriends(updatedFriends)
    );

    return () => {
      pendingSubscription.unsubscribe();
      friendsSubscription.unsubscribe();
    };
  }, [userId]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      setFriends(await friendService.getFriends());
      setError(null);
    } catch (err: any) {
      console.error('Error loading friends:', err);
      setError(err.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      setPendingRequests(await friendService.getPendingRequests());
    } catch (err) {
      console.error('Error loading pending requests:', err);
    }
  };

  const sendFriendRequest = async (email: string) => {
    try {
      return await friendService.sendFriendRequest(email);
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to send friend request' };
    }
  };

  const sendFriendRequestById = async (friendUserId: string, friendName?: string) => {
    try {
      return await friendService.sendFriendRequestById(friendUserId, friendName);
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to send friend request' };
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      const newFriend = await friendService.acceptFriendRequest(requestId);

      if (newFriend) {
        setFriends(prev =>
          prev.some(f => f.id === newFriend.id) ? prev : [newFriend, ...prev]
        );
      }

      await loadPendingRequests();
    } catch (err: any) {
      console.error('Error accepting friend request:', err);
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
    sendFriendRequestById,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    refreshFriends: loadFriends
  };
};
