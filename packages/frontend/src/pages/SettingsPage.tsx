import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Check, Loader2, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [targetLanguage, setTargetLanguage] = useState(user?.settings?.targetLanguage || 'Spanish');
  const [nativeLanguage, setNativeLanguage] = useState(user?.settings?.nativeLanguage || 'English');
  const [knownWordsRatio, setKnownWordsRatio] = useState(user?.settings?.knownWordsRatio || 80);
  const [defaultDifficulty, setDefaultDifficulty] = useState(user?.settings?.defaultDifficulty || 'intermediate');
  const [saved, setSaved] = useState(false);

  const { data: languages } = useQuery({
    queryKey: ['languages'],
    queryFn: () => settingsApi.getLanguages().then(r => r.data.languages),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then(r => r.data.settings),
  });

  useEffect(() => {
    if (settings) {
      setTargetLanguage(settings.targetLanguage);
      setNativeLanguage(settings.nativeLanguage);
      setKnownWordsRatio(settings.knownWordsRatio);
      setDefaultDifficulty(settings.defaultDifficulty);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      updateUser({ settings: response.data.settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      targetLanguage,
      nativeLanguage,
      knownWordsRatio,
      defaultDifficulty,
    });
  };

  const nativeLangOptions = [
    { code: 'English', name: 'English' },
    { code: 'Spanish', name: 'Spanish' },
    { code: 'French', name: 'French' },
    { code: 'German', name: 'German' },
    { code: 'Portuguese', name: 'Portuguese' },
    { code: 'Italian', name: 'Italian' },
    { code: 'Chinese', name: 'Chinese' },
    { code: 'Japanese', name: 'Japanese' },
    { code: 'Korean', name: 'Korean' },
    { code: 'Russian', name: 'Russian' },
    { code: 'Arabic', name: 'Arabic' },
    { code: 'Hindi', name: 'Hindi' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure your learning preferences
        </p>
      </div>

      <div className="card p-6 space-y-8">
        {/* Language settings */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Language Settings</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Language
              </label>
              <p className="text-xs text-gray-500 mb-2">
                The language you're learning
              </p>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="input"
              >
                {languages?.map((lang: any) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Native Language
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Your native language for translations
              </p>
              <select
                value={nativeLanguage}
                onChange={(e) => setNativeLanguage(e.target.value)}
                className="input"
              >
                {nativeLangOptions.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Generation defaults */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generation Defaults</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Difficulty
              </label>
              <div className="flex gap-2">
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDefaultDifficulty(level)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors capitalize ${
                      defaultDifficulty === level
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Vocabulary Mix
              </label>
              <p className="text-xs text-gray-500 mb-3">
                The default ratio of known words to new words in generated texts
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={knownWordsRatio}
                  onChange={(e) => setKnownWordsRatio(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-900 w-28 text-right">
                  {knownWordsRatio}% known
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>More challenging</span>
                <span>More comfortable</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account info */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Email</span>
              <span className="text-sm font-medium text-gray-900">{user?.email}</span>
            </div>
            {user?.name && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Name</span>
                <span className="text-sm font-medium text-gray-900">{user.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Save button */}
        <div className="border-t border-gray-200 pt-6">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="btn btn-primary w-full sm:w-auto"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
