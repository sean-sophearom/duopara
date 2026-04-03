import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { textsApi, settingsApi } from '../lib/api';
import {
  Search,
  Filter,
  Clock,
  Trash2,
  BookOpen,
  MoreVertical,
  Loader2
} from 'lucide-react';

export default function HistoryPage() {
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [page, setPage] = useState(0);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  
  const limit = 10;

  const { data: languages } = useQuery({
    queryKey: ['languages'],
    queryFn: () => settingsApi.getLanguages().then(r => r.data.languages),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['texts', search, languageFilter, page],
    queryFn: () => textsApi.getAll({
      search: search || undefined,
      language: languageFilter || undefined,
      limit,
      offset: page * limit,
    }).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: textsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['texts'] });
      setOpenMenu(null);
    },
  });

  const texts = data?.texts || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">History Vault</h1>
        <p className="text-gray-600 mt-1">
          Your library of generated texts
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative input">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search by title or topic..."
              className="ml-6 outline-none w-11/12"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={languageFilter}
              onChange={(e) => {
                setLanguageFilter(e.target.value);
                setPage(0);
              }}
              className="input w-40"
            >
              <option value="">All languages</option>
              {languages?.map((lang: any) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Texts list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : texts.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No texts yet</h3>
          <p className="text-gray-500 mb-4">
            {search || languageFilter
              ? 'No texts match your filters'
              : "You haven't generated any texts yet"}
          </p>
          {!search && !languageFilter && (
            <Link to="/generate" className="btn btn-primary">
              Generate your first text
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {texts.map((text: any) => (
              <div key={text.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <Link to={`/read/${text.id}`} className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                      {text.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {text.topic}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-gray-600">
                        {text.language}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                        text.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                        text.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {text.difficulty}
                      </span>
                      <span className="text-gray-500">
                        {text.wordCount} words
                      </span>
                      <span className="text-gray-500">
                        {text.newWordsIntroduced?.length || 0} new words
                      </span>
                    </div>
                  </Link>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="hidden sm:block text-right text-sm text-gray-500">
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(text.createdAt).toLocaleDateString()}
                      </div>
                      {text.readCount > 0 && (
                        <p className="text-xs mt-1">
                          Read {text.readCount} time{text.readCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === text.id ? null : text.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>
                      
                      {openMenu === text.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenu(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                            <button
                              onClick={() => deleteMutation.mutate(text.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
