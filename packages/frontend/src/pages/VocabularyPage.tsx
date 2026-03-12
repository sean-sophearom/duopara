import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vocabularyApi, settingsApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import {
  Search,
  Filter,
  Upload,
  Download,
  Plus,
  Trash2,
  X,
  BookMarked,
  Loader2,
  FileText
} from 'lucide-react';

export default function VocabularyPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState(user?.settings?.targetLanguage || '');
  const [page, setPage] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newWord, setNewWord] = useState({ word: '', translation: '' });
  const [importLanguage, setImportLanguage] = useState(user?.settings?.targetLanguage || 'Spanish');
  
  const limit = 20;

  const { data: languages } = useQuery({
    queryKey: ['languages'],
    queryFn: () => settingsApi.getLanguages().then(r => r.data.languages),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['vocabulary', search, statusFilter, languageFilter, page],
    queryFn: () => vocabularyApi.getAll({
      search: search || undefined,
      status: statusFilter || undefined,
      language: languageFilter || undefined,
      limit,
      offset: page * limit,
    }).then(r => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['vocabulary', 'stats', languageFilter],
    queryFn: () => vocabularyApi.getStats(languageFilter || undefined).then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (data: { word: string; language: string; translation?: string }) =>
      vocabularyApi.add(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
      setShowAddModal(false);
      setNewWord({ word: '', translation: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      vocabularyApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: vocabularyApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ file, language }: { file: File; language: string }) =>
      vocabularyApi.import(file, language),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
      setShowImportModal(false);
      alert(`Imported ${response.data.imported} words successfully!`);
    },
  });

  const handleExport = async () => {
    try {
      const response = await vocabularyApi.export(languageFilter || undefined);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vocabulary-${languageFilter || 'all'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate({ file, language: importLanguage });
    }
  };

  const words = data?.words || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const statusColors = {
    learning: 'bg-yellow-100 text-yellow-700',
    learned: 'bg-blue-100 text-blue-700',
    mastered: 'bg-green-100 text-green-700',
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vocabulary</h1>
          <p className="text-gray-600 mt-1">
            Manage your known words and import from external sources
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="btn btn-secondary"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </button>
          <button
            onClick={handleExport}
            className="btn btn-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Word
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.learning}</p>
            <p className="text-sm text-gray-500">Learning</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.learned}</p>
            <p className="text-sm text-gray-500">Learned</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.mastered}</p>
            <p className="text-sm text-gray-500">Mastered</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative input">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search words..."
              className="ml-6 outline-none w-11/12"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <select
              value={languageFilter}
              onChange={(e) => {
                setLanguageFilter(e.target.value);
                setPage(0);
              }}
              className="input w-36"
            >
              <option value="">All languages</option>
              {languages?.map((lang: any) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="input w-32"
            >
              <option value="">All status</option>
              <option value="learning">Learning</option>
              <option value="learned">Learned</option>
              <option value="mastered">Mastered</option>
            </select>
          </div>
        </div>
      </div>

      {/* Words table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : words.length === 0 ? (
        <div className="card p-12 text-center">
          <BookMarked className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No words yet</h3>
          <p className="text-gray-500 mb-4">
            {search || statusFilter || languageFilter
              ? 'No words match your filters'
              : 'Start by adding words or importing from Duolingo'}
          </p>
          {!search && !statusFilter && !languageFilter && (
            <button onClick={() => setShowImportModal(true)} className="btn btn-primary">
              <Upload className="w-4 h-4 mr-2" />
              Import Vocabulary
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="card overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Word</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Translation</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 hidden md:table-cell">Part of Speech</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 hidden sm:table-cell">Encounters</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {words.map((word: any) => (
                  <tr key={word.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{word.word}</p>
                        {word.baseForm && word.baseForm !== word.word && (
                          <p className="text-xs text-gray-500">→ {word.baseForm}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {word.translation || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                      {word.partOfSpeech || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={word.status}
                        onChange={(e) => updateMutation.mutate({ id: word.id, status: e.target.value })}
                        className={`text-sm px-2 py-1 rounded-full border-0 cursor-pointer ${statusColors[word.status as keyof typeof statusColors]}`}
                      >
                        <option value="learning">Learning</option>
                        <option value="learned">Learned</option>
                        <option value="mastered">Mastered</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                      {word.timesEncountered}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteMutation.mutate(word.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Add Word Modal */}
      {showAddModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowAddModal(false)} />
          <div className="modal-content top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Word</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMutation.mutate({
                  word: newWord.word,
                  language: languageFilter || user?.settings?.targetLanguage || 'Spanish',
                  translation: newWord.translation || undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Word</label>
                <input
                  type="text"
                  value={newWord.word}
                  onChange={(e) => setNewWord(w => ({ ...w, word: e.target.value }))}
                  className="input"
                  placeholder="Enter word..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Translation (optional)</label>
                <input
                  type="text"
                  value={newWord.translation}
                  onChange={(e) => setNewWord(w => ({ ...w, translation: e.target.value }))}
                  className="input"
                  placeholder="Enter translation..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={addMutation.isPending} className="btn btn-primary">
                  {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Word'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowImportModal(false)} />
          <div className="modal-content top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Import Vocabulary</h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  value={importLanguage}
                  onChange={(e) => setImportLanguage(e.target.value)}
                  className="input"
                >
                  {languages?.map((lang: any) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">CSV Format</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Your CSV should have columns for:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li><code>word</code> - The word (required)</li>
                  <li><code>translation</code> - English translation</li>
                  <li><code>part_of_speech</code> - noun, verb, etc.</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  Duolingo exports are automatically supported!
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importMutation.isPending}
                className="btn btn-primary w-full"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Select CSV File
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
