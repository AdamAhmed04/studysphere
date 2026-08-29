import { supabase } from '../lib/supabase';

export interface SearchResult {
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  school?: string;
  study_field?: string;
  interests: string[];
  total_study_time: number;
  is_friend: boolean;
  is_public: boolean;
}

class SearchService {
  async searchUsers(query: string, filters?: {
    school?: string;
    studyField?: string;
    interests?: string[];
  }): Promise<SearchResult[]> {
    if (!supabase) throw new Error('Supabase not configured');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let profileQuery = supabase
        .from('user_profiles')
        .select('user_id, name, email, avatar_url, bio, school, study_field, interests, is_public')
        .eq('is_public', true)
        .neq('user_id', user.id);

      if (query) {
        profileQuery = profileQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%,school.ilike.%${query}%,study_field.ilike.%${query}%`);
      }

      if (filters?.school) {
        profileQuery = profileQuery.ilike('school', `%${filters.school}%`);
      }

      if (filters?.studyField) {
        profileQuery = profileQuery.ilike('study_field', `%${filters.studyField}%`);
      }

      if (filters?.interests && filters.interests.length > 0) {
        profileQuery = profileQuery.overlaps('interests', filters.interests);
      }

      const { data: profiles, error: profileError } = await profileQuery.limit(50);

      if (profileError) throw profileError;
      if (!profiles || profiles.length === 0) return [];

      const userIds = profiles.map(p => p.user_id);

      const [statsData, friendsData] = await Promise.all([
        supabase
          .from('user_stats')
          .select('user_id, total_focus_minutes')
          .in('user_id', userIds),
        supabase
          .from('friends')
          .select('user_id, friend_user_id')
          .eq('status', 'accepted')
          .or(`user_id.eq.${user.id},friend_user_id.eq.${user.id}`)
      ]);

      const stats = statsData.data || [];
      const friends = friendsData.data || [];

      const friendIds = new Set(
        friends.map(f => (f.user_id === user.id ? f.friend_user_id : f.user_id))
      );

      const results: SearchResult[] = profiles.map(profile => {
        const userStats = stats.find(s => s.user_id === profile.user_id);
        return {
          user_id: profile.user_id,
          name: profile.name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          school: profile.school,
          study_field: profile.study_field,
          interests: profile.interests || [],
          total_study_time: userStats?.total_focus_minutes || 0,
          is_friend: friendIds.has(profile.user_id),
          is_public: profile.is_public
        };
      });

      return results;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  async getUserById(userId: string): Promise<SearchResult | null> {
    if (!supabase) throw new Error('Supabase not configured');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      if (!profile || (!profile.is_public && profile.user_id !== user.id)) return null;

      const [statsData, friendsData] = await Promise.all([
        supabase
          .from('user_stats')
          .select('total_focus_minutes')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('friends')
          .select('id')
          .eq('status', 'accepted')
          .or(`and(user_id.eq.${user.id},friend_user_id.eq.${userId}),and(user_id.eq.${userId},friend_user_id.eq.${user.id})`)
          .maybeSingle()
      ]);

      return {
        user_id: profile.user_id,
        name: profile.name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        school: profile.school,
        study_field: profile.study_field,
        interests: profile.interests || [],
        total_study_time: statsData.data?.total_focus_minutes || 0,
        is_friend: !!friendsData.data,
        is_public: profile.is_public
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }
}

export const searchService = new SearchService();
