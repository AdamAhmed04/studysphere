import { supabase } from '../lib/supabase';
import { orUndefined, orEmpty } from '../utils/rows';

export interface SearchResult {
  user_id: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  school?: string;
  study_field?: string;
  interests: string[];
  total_study_time: number;
  is_friend: boolean;
}

/**
 * Escapes a value for interpolation into a PostgREST filter string.
 *
 * PostgREST parses commas, parentheses and dots as filter syntax. Interpolating
 * raw user input let a crafted query append conditions of the caller's choosing
 * — including overriding the is_public guard. Wrapping the pattern in double
 * quotes and escaping embedded quotes and backslashes keeps it a literal.
 */
const escapeFilterValue = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

class SearchService {
  /**
   * Searches public profiles.
   *
   * Reads the `public_profiles` view rather than `user_profiles`. The view
   * exposes an explicit column allowlist, which is what keeps email, date of
   * birth, grade and graduation date out of search results. It also already
   * filters to is_public = true, so no client-side flag is needed.
   */
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
        .from('public_profiles')
        .select('user_id, name, avatar_url, bio, school, study_field, interests')
        .neq('user_id', user.id);

      const trimmed = query?.trim();
      if (trimmed) {
        const pattern = escapeFilterValue(`%${trimmed}%`);
        profileQuery = profileQuery.or(
          `name.ilike.${pattern},school.ilike.${pattern},study_field.ilike.${pattern}`
        );
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
        // public_leaderboard, not user_stats — reading another user's stats row
        // directly is no longer permitted.
        supabase
          .from('public_leaderboard')
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

      return profiles.map(profile => ({
        user_id: orEmpty(profile.user_id),
        name: orEmpty(profile.name),
        avatar_url: orUndefined(profile.avatar_url),
        bio: orUndefined(profile.bio),
        school: orUndefined(profile.school),
        study_field: orUndefined(profile.study_field),
        interests: profile.interests || [],
        total_study_time: stats.find(s => s.user_id === profile.user_id)?.total_focus_minutes || 0,
        is_friend: friendIds.has(orEmpty(profile.user_id)),
      }));
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

      // maybeSingle, not single: a private or non-existent profile is a normal
      // "not found", not an exception.
      const { data: profile, error: profileError } = await supabase
        .from('public_profiles')
        .select('user_id, name, avatar_url, bio, school, study_field, interests')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) return null;

      const [statsData, friendsData] = await Promise.all([
        supabase
          .from('public_leaderboard')
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
        user_id: orEmpty(profile.user_id),
        name: orEmpty(profile.name),
        avatar_url: orUndefined(profile.avatar_url),
        bio: orUndefined(profile.bio),
        school: orUndefined(profile.school),
        study_field: orUndefined(profile.study_field),
        interests: profile.interests || [],
        total_study_time: statsData.data?.total_focus_minutes || 0,
        is_friend: !!friendsData.data,
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }
}

export const searchService = new SearchService();
