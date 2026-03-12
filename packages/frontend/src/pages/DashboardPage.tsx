import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { statsApi, textsApi, vocabularyApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import {
  BookOpen,
  PenTool,
  TrendingUp,
  Calendar,
  BookMarked,
  ArrowRight,
  Flame,
  Target,
  Clock
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const language = user?.settings?.targetLanguage || 'Spanish';

  const { data: stats } = useQuery({
    queryKey: ['stats', language],
    queryFn: () => statsApi.get(language).then(r => r.data),
  });

  const { data: recentTexts } = useQuery({
    queryKey: ['texts', 'recent'],
    queryFn: () => textsApi.getAll({ limit: 3 }).then(r => r.data),
  });

  const { data: vocabStats } = useQuery({
    queryKey: ['vocabulary', 'stats', language],
    queryFn: () => vocabularyApi.getStats(language).then(r => r.data),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome back{user?.name ? `, ${user.name}` : ''}!
        </h1>
        <p className="text-gray-600 mt-1">
          Continue your {language} learning journey
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-6 flex items-center justify-between sm:flex-col sm:items-start">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm text-gray-600">Current Streak</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.activity?.currentStreak || 0}
            <span className="text-lg font-normal text-gray-500 ml-1">&nbsp;days</span>
          </p>
        </div>

        <div className="card p-4 sm:p-6 flex items-center justify-between sm:flex-col sm:items-start">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">Words Mastered</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {vocabStats?.mastered || 0}
            <span className="text-lg font-normal text-gray-500 ml-1">&nbsp;words</span>
          </p>
        </div>

        <div className="card p-4 sm:p-6 flex items-center justify-between sm:flex-col sm:items-start">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-600" />
            </div>
            <span className="text-sm text-gray-600">Texts Read</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.reading?.completedSessions || 0}
            <span className="text-lg font-normal text-gray-500 ml-1">&nbsp;texts</span>
          </p>
        </div>

        <div className="card p-4 sm:p-6 flex items-center justify-between sm:flex-col sm:items-start">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <BookMarked className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-600">Total Vocabulary</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {vocabStats?.total || 0}
            <span className="text-lg font-normal text-gray-500 ml-1">&nbsp;words</span>
          </p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column - Quick actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Generate new text CTA */}
          <Link to="/generate" className="card p-6 block hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <PenTool className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Generate New Text</h3>
                  <p className="text-gray-600">Create personalized reading material</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          {/* Recent texts */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Texts</h3>
              <Link to="/history" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            {recentTexts?.texts?.length > 0 ? (
              <div className="space-y-3">
                {recentTexts.texts.map((text: any) => (
                  <Link
                    key={text.id}
                    to={`/read/${text.id}`}
                    className="block p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900">{text.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {text.topic} • {text.wordCount} words • {text.difficulty}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(text.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No texts yet. Generate your first one!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column - Progress */}
        <div className="space-y-6">
          {/* Vocabulary progress */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vocabulary Progress</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Learning</span>
                  <span className="font-medium text-yellow-600">{vocabStats?.learning || 0}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full transition-all"
                    style={{ width: `${vocabStats?.total ? (vocabStats.learning / vocabStats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Learned</span>
                  <span className="font-medium text-blue-600">{vocabStats?.learned || 0}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${vocabStats?.total ? (vocabStats.learned / vocabStats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Mastered</span>
                  <span className="font-medium text-green-600">{vocabStats?.mastered || 0}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${vocabStats?.total ? (vocabStats.mastered / vocabStats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <Link
              to="/vocabulary"
              className="mt-4 block text-center text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Manage vocabulary
            </Link>
          </div>

          {/* Activity summary */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-primary-600 mb-1">
                  <BookOpen className="w-4 h-4" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats?.activity?.recentTexts || 0}</p>
                <p className="text-xs text-gray-500">Texts read</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats?.activity?.recentWordsMastered || 0}</p>
                <p className="text-xs text-gray-500">Words mastered</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Longest streak</span>
                <span className="font-medium text-orange-600 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {stats?.activity?.longestStreak || 0} days
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
