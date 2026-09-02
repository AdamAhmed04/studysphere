import { supabase } from '../lib/supabase';
import { requireUuid } from '../utils/ids';
import { orUndefined, orEmpty } from '../utils/rows';

export interface SearchResult {
  /*
   * Identity. Always present, for a private account as much as a public one:
   * you can find someone and send them a request without seeing anything
   * about them.
   */
  user_id: string;
  name: string;
  avatar_url?: string;

  /*
   * Detail. Populated only when `can_see_details` is true - that is, when the
   * account is public, is your own, or belongs to an accepted friend.
   */
  bio?: string;
  school?: string;
  study_field?: string;
  grade?: string;
  /** Derived server-side. The date of birth itself is never sent. */
  age?: number;
  interests: string[];

  total_study_time: number;
  is_friend: boolean;
  is_public: boolean;
  can_see_details: boolean;
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
   * Searches every account, public or private.
   *
   * Reads `discoverable_profiles` rather than `user_profiles`. The view
   * exposes an explicit column allowlist — which is what keeps email,
   * graduation date and the raw date of birth out of search results — and
   * blanks the detail columns for accounts that are neither public, your own,
   * nor an accepted friend. A private account still comes back, carrying its
   * name and photo, so it can be found and sent a request.
   *
   * Because the detail columns are null for those rows, the school and study
   * field filters below simply do not match them. That is the intended
   * behaviour: you can find a private account by name, not by filtering on
   * facts it has not shared.
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
        .from('discoverable_profiles')
        .select(
          'user_id, name, avatar_url, is_public, can_see_details, bio, school, study_field, grade, age, interests'
        )
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
          .or(`user_id.eq.${requireUuid(user.id, "user id")},friend_user_id.eq.${requireUuid(user.id, "user id")}`)
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
        grade: orUndefined(profile.grade),
        age: profile.age ?? undefined,
        is_friend: friendIds.has(orEmpty(profile.user_id)),
        is_public: profile.is_public ?? false,
        can_see_details: profile.can_see_details ?? false,
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

      // maybeSingle, not single: a non-existent profile is a normal "not
      // found", not an exception. A private profile now returns a row - name
      // and photo, with the detail columns null.
      const { data: profile, error: profileError } = await supabase
        .from('discoverable_profiles')
        .select(
          'user_id, name, avatar_url, is_public, can_see_details, bio, school, study_field, grade, age, interests'
        )
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
          .or(`and(user_id.eq.${requireUuid(user.id, "user id")},friend_user_id.eq.${requireUuid(userId, "user id")}),and(user_id.eq.${requireUuid(userId, "user id")},friend_user_id.eq.${requireUuid(user.id, "user id")})`)
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
        grade: orUndefined(profile.grade),
        age: profile.age ?? undefined,
        is_friend: !!friendsData.data,
        is_public: profile.is_public ?? false,
        can_see_details: profile.can_see_details ?? false,
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }
}

export const searchService = new SearchService();
