import React from 'react';
import { Clock, Target, Flame, Calendar, CheckCircle2 } from 'lucide-react';
import { StudySession } from '../types';
import type { UserStats } from '../lib/supabase';

interface StudyStatsProps {
  sessions: StudySession[];
  stats?: UserStats | null;
}

export const StudyStats: React.FC<StudyStatsProps> = ({ sessions, stats }) => {
  const totalTime = stats?.total_focus_minutes || sessions.reduce((acc, session) => acc + session.duration, 0);
  const todaysSessions = sessions.filter(session => {
    const today = new Date().toDateString();
    return new Date(session.startTime).toDateString() === today;
  });
  const todaysTime = todaysSessions.reduce((acc, session) => acc + session.duration, 0);
  
  // Calculate streak (consecutive days with study time)
  const streak = stats?.streak_days || calculateStreak(sessions);
  const totalSessions = stats?.sessions || sessions.length;

  // No client-side fallback for this one: completed to-dos are counted in the
  // database, once per to-do, and the local `sessions` array says nothing
  // about them. `?? 0` rather than `|| 0` so a real zero stays a zero.
  const tasksCompleted = stats?.tasks_completed ?? 0;
  
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <div className="theme-secondary-bg rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink/75 font-medium">Today</p>
            <p className="text-2xl font-bold text-sand">{formatMinutes(todaysTime)}</p>
          </div>
          <Clock className="text-sand" size={32} />
        </div>
      </div>

      <div className="theme-secondary-bg rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink/75 font-medium">Total Time</p>
            <p className="text-2xl font-bold text-ink">{formatMinutes(totalTime)}</p>
          </div>
          <Target className="text-muted" size={32} />
        </div>
      </div>

      <div className="theme-secondary-bg rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink/75 font-medium">Streak</p>
            <p className="text-2xl font-bold text-orange-600">{streak} {streak === 1 ? "day" : "days"}</p>
          </div>
          <Flame className="text-orange-500" size={32} />
        </div>
      </div>

      <div className="theme-secondary-bg rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink/75 font-medium">Sessions</p>
            <p className="text-2xl font-bold text-sand">{totalSessions}</p>
          </div>
          <Calendar className="text-sand" size={32} />
        </div>
      </div>

      <div className="theme-secondary-bg rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink/75 font-medium">Tasks Done</p>
            <p className="text-2xl font-bold text-teal-600">{tasksCompleted}</p>
          </div>
          <CheckCircle2 className="text-teal-500" size={32} />
        </div>
      </div>
    </div>
  );
};

function calculateStreak(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0;

  // Group sessions by date
  const sessionsByDate = new Map<string, StudySession[]>();
  sessions.forEach(session => {
    const date = new Date(session.startTime).toDateString();
    if (!sessionsByDate.has(date)) {
      sessionsByDate.set(date, []);
    }
    sessionsByDate.get(date)!.push(session);
  });

  // Count consecutive days from today backwards
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 365; i++) { // Max 1 year lookback
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateString = checkDate.toDateString();
    
    if (sessionsByDate.has(dateString)) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}