import { useState } from 'react';
import Head from 'next/head';
import { useDarkMode } from '../hooks/useDarkMode';

export default function Home() {
  const { isDark, toggleDarkMode, mounted } = useDarkMode();
  const [users, setUsers] = useState([{ username: '', platform: 'mal' }]);
  const [type, setType] = useState('anime');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [commonItems, setCommonItems] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleAddUser = () => {
    setUsers([...users, { username: '', platform: 'mal' }]);
  };

  const handleRemoveUser = (index) => {
    const newUsers = [...users];
    newUsers.splice(index, 1);
    setUsers(newUsers);
  };

  const handleUserChange = (index, field, value) => {
    const newUsers = [...users];
    newUsers[index][field] = value;
    setUsers(newUsers);
  };

  const normalizeTitle = (title) => {
    if (!title) return '';
    return title.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const fetchUserList = async (user) => {
    const res = await fetch(`/api/${user.platform}?username=${encodeURIComponent(user.username)}&type=${type}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Failed to fetch ${user.platform} list for ${user.username}`);
    }
    const data = await res.json();

    // Filter out items that are not completed or reading/watching
    const allowedStatuses = ['completed', 'watching', 'reading'];
    return data.items.filter(item => allowedStatuses.includes(item.status));
  };

  const handleExportCsv = () => {
    if (commonItems.length === 0) return;

    const validUsers = users.filter((u) => u.username.trim() !== '');

    const headers = ['Title', 'URL'];
    validUsers.forEach((u) => {
      headers.push(`${u.username} Status`);
      headers.push(`${u.username} Progress`);
    });

    const csvRows = [];
    csvRows.push(headers.join(';'));

    commonItems.forEach((item) => {
      const row = [
        `"${item.title.replace(/"/g, '""')}"`,
        `"${item.url}"`
      ];

      validUsers.forEach((u, index) => {
        const userDetail = item.users.find((iu) => iu.sourceListIndex === index);
        if (userDetail) {
          row.push(`"${userDetail.status}"`);
          row.push(`"${userDetail.progress}"`);
        } else {
          row.push('""');
          row.push('""');
        }
      });

      csvRows.push(row.join(';'));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `common-${type}-${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCompare = async () => {
    // Validate inputs
    const validUsers = users.filter((u) => u.username.trim() !== '');
    if (validUsers.length < 2) {
      setError('Please enter at least 2 usernames to compare.');
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(false);
    setCommonItems([]);

    try {
      const lists = await Promise.all(validUsers.map((user) => fetchUserList(user)));

      // We want to find items that are in AT LEAST 2 lists
      let allItemsFlat = [];
      lists.forEach((list, listIndex) => {
        list.forEach(item => {
          allItemsFlat.push({ ...item, sourceListIndex: listIndex });
        });
      });

      let itemMap = new Map(); // Map of normalized title -> item data + users array

      allItemsFlat.forEach(item => {
        const titleNorm = normalizeTitle(item.title);
        const titleRomajiNorm = item.titleRomaji ? normalizeTitle(item.titleRomaji) : '';
        const titleEnglishNorm = item.titleEnglish ? normalizeTitle(item.titleEnglish) : '';

        // Find if we already have this item in the map (checking all title variants)
        let foundKey = null;
        for (const [key, existingItem] of itemMap.entries()) {
          const eTitleNorm = normalizeTitle(existingItem.title);
          const eTitleRomajiNorm = existingItem.titleRomaji ? normalizeTitle(existingItem.titleRomaji) : '';
          const eTitleEnglishNorm = existingItem.titleEnglish ? normalizeTitle(existingItem.titleEnglish) : '';

          if (
             (titleNorm && (titleNorm === eTitleNorm || titleNorm === eTitleRomajiNorm || titleNorm === eTitleEnglishNorm)) ||
             (titleRomajiNorm && (titleRomajiNorm === eTitleNorm || titleRomajiNorm === eTitleRomajiNorm || titleRomajiNorm === eTitleEnglishNorm)) ||
             (titleEnglishNorm && (titleEnglishNorm === eTitleNorm || titleEnglishNorm === eTitleRomajiNorm || titleEnglishNorm === eTitleEnglishNorm))
          ) {
            foundKey = key;
            break;
          }
        }

        const userDetail = {
          username: item.username,
          avatar: item.avatar,
          status: item.status,
          progress: item.progress,
          sourceListIndex: item.sourceListIndex
        };

        if (foundKey) {
          // Check if this specific user hasn't been added to this item yet
          const existing = itemMap.get(foundKey);
          if (!existing.users.some(u => u.sourceListIndex === item.sourceListIndex)) {
            existing.users.push(userDetail);
          }
        } else {
          itemMap.set(titleNorm || titleRomajiNorm || titleEnglishNorm, {
            ...item,
            users: [userDetail]
          });
        }
      });

      // Filter to only items that have at least 2 users
      let intersection = Array.from(itemMap.values()).filter(item => item.users.length >= 2);

      // Sort alphabetically
      intersection.sort((a, b) => a.title.localeCompare(b.title));

      setCommonItems(intersection);
      setSearched(true);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <Head>
        <title>Anime/Manga List Comparator</title>
      </Head>

      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden transition-colors duration-200">
        <div className="bg-indigo-600 dark:bg-indigo-700 px-6 py-4 flex justify-between items-center transition-colors duration-200">
          <h1 className="text-2xl font-bold text-white">Anime/Manga List Comparator</h1>
          {mounted && (
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-400 dark:hover:bg-indigo-500 transition-colors focus:outline-none"
              aria-label="Toggle Dark Mode"
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
          )}
        </div>

        <div className="p-6">
          <div className="mb-6 flex justify-center space-x-4">
            <button
              className={`px-4 py-2 rounded-md font-medium transition-colors ${type === 'anime' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
              onClick={() => setType('anime')}
            >
              Anime
            </button>
            <button
              className={`px-4 py-2 rounded-md font-medium transition-colors ${type === 'manga' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
              onClick={() => setType('manga')}
            >
              Manga
            </button>
          </div>

          <div className="space-y-4 mb-6">
            {users.map((user, index) => (
              <div key={index} className="flex items-center space-x-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-md border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username {index + 1}</label>
                  <input
                    type="text"
                    className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black dark:text-white bg-white dark:bg-gray-800 px-3 py-2 border transition-colors duration-200"
                    placeholder="Enter username"
                    value={user.username}
                    onChange={(e) => handleUserChange(index, 'username', e.target.value)}
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
                  <select
                    className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black dark:text-white bg-white dark:bg-gray-800 px-3 py-2 border transition-colors duration-200"
                    value={user.platform}
                    onChange={(e) => handleUserChange(index, 'platform', e.target.value)}
                  >
                    <option value="mal">MyAnimeList</option>
                    <option value="anilist">AniList</option>
                  </select>
                </div>
                {users.length > 2 && (
                  <div className="pt-6">
                    <button
                      onClick={() => handleRemoveUser(index)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 focus:outline-none transition-colors duration-200"
                      title="Remove user"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between mb-8">
            <button
              onClick={handleAddUser}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:ring-offset-gray-800 transition-colors duration-200"
            >
              + Add User
            </button>
            <button
              onClick={handleCompare}
              disabled={loading}
              className={`px-6 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Comparing...' : 'Find Common Entries'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4 mb-6 transition-colors duration-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400 dark:text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            </div>
          )}

          {searched && !loading && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                  Common Entries ({commonItems.length})
                </h2>
                {commonItems.length > 0 && (
                  <button
                    onClick={handleExportCsv}
                    className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:ring-offset-gray-800 transition-colors duration-200"
                  >
                    Export to CSV
                  </button>
                )}
              </div>
              {commonItems.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No common entries found.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {commonItems.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all"
                    >
                      <div className="aspect-w-3 aspect-h-4 bg-gray-200 dark:bg-gray-700 relative">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="object-cover w-full h-full"
                            style={{ minHeight: '200px', maxHeight: '250px' }}
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-gray-400 dark:text-gray-500">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex-1 flex flex-col">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 mb-2 transition-colors duration-200">
                          {item.title}
                        </h3>
                        <div className="mt-auto flex flex-wrap gap-2">
                          {item.users.map((u, uIdx) => (
                            <div key={uIdx} className="relative group/tooltip flex items-center">
                              {u.avatar ? (
                                <img
                                  src={u.avatar}
                                  alt={u.username}
                                  className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-800 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800/50 transition-colors duration-200">
                                  {u.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover/tooltip:block z-10 w-max max-w-xs">
                                <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded py-1 px-2 shadow-lg border border-transparent dark:border-gray-600">
                                  <div className="font-bold">{u.username}</div>
                                  <div>
                                    {u.status === 'completed'
                                      ? 'Completed'
                                      : `${type === 'manga' ? 'Ch' : 'Ep'} ${u.progress}`}
                                  </div>
                                </div>
                                <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
