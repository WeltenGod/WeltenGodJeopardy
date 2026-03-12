import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
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
    return data.items;
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

      // Need to find intersection
      // First list will be the base list
      let intersection = [];

      lists[0].forEach((item) => {
        const titleNorm = normalizeTitle(item.title);
        const titleRomajiNorm = item.titleRomaji ? normalizeTitle(item.titleRomaji) : '';
        const titleEnglishNorm = item.titleEnglish ? normalizeTitle(item.titleEnglish) : '';

        // Check if this item exists in ALL other lists
        let existsInAll = true;

        for (let i = 1; i < lists.length; i++) {
          const otherList = lists[i];
          const found = otherList.some((otherItem) => {
            const otherTitleNorm = normalizeTitle(otherItem.title);
            const otherTitleRomajiNorm = otherItem.titleRomaji ? normalizeTitle(otherItem.titleRomaji) : '';
            const otherTitleEnglishNorm = otherItem.titleEnglish ? normalizeTitle(otherItem.titleEnglish) : '';

            // Match if any normalized title matches
            return (
              (titleNorm && (titleNorm === otherTitleNorm || titleNorm === otherTitleRomajiNorm || titleNorm === otherTitleEnglishNorm)) ||
              (titleRomajiNorm && (titleRomajiNorm === otherTitleNorm || titleRomajiNorm === otherTitleRomajiNorm || titleRomajiNorm === otherTitleEnglishNorm)) ||
              (titleEnglishNorm && (titleEnglishNorm === otherTitleNorm || titleEnglishNorm === otherTitleRomajiNorm || titleEnglishNorm === otherTitleEnglishNorm))
            );
          });

          if (!found) {
            existsInAll = false;
            break;
          }
        }

        if (existsInAll) {
          // Add to intersection if not already added
          if (!intersection.some((i) => normalizeTitle(i.title) === titleNorm)) {
             intersection.push(item);
          }
        }
      });

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
    <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>Anime/Manga List Comparator</title>
      </Head>

      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white text-center">Anime/Manga List Comparator</h1>
        </div>

        <div className="p-6">
          <div className="mb-6 flex justify-center space-x-4">
            <button
              className={`px-4 py-2 rounded-md font-medium transition-colors ${type === 'anime' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              onClick={() => setType('anime')}
            >
              Anime
            </button>
            <button
              className={`px-4 py-2 rounded-md font-medium transition-colors ${type === 'manga' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              onClick={() => setType('manga')}
            >
              Manga
            </button>
          </div>

          <div className="space-y-4 mb-6">
            {users.map((user, index) => (
              <div key={index} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-md border border-gray-200">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username {index + 1}</label>
                  <input
                    type="text"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black px-3 py-2 border"
                    placeholder="Enter username"
                    value={user.username}
                    onChange={(e) => handleUserChange(index, 'username', e.target.value)}
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                  <select
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black px-3 py-2 border"
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
                      className="text-red-600 hover:text-red-800 focus:outline-none"
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
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              + Add User
            </button>
            <button
              onClick={handleCompare}
              disabled={loading}
              className={`px-6 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Comparing...' : 'Find Common Entries'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {searched && !loading && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Common Entries ({commonItems.length})
              </h2>
              {commonItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No common entries found.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {commonItems.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-w-3 aspect-h-4 bg-gray-200 relative">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="object-cover w-full h-full"
                            style={{ minHeight: '200px', maxHeight: '250px' }}
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-gray-400">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex-1 flex flex-col">
                        <h3 className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 line-clamp-2">
                          {item.title}
                        </h3>
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
