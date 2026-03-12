export default async function handler(req, res) {
  const { username, type = 'anime' } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const mediaType = type.toUpperCase(); // ANIME or MANGA

  const query = `
  query ($username: String, $type: MediaType) {
    MediaListCollection(userName: $username, type: $type) {
      lists {
        entries {
          media {
            id
            title {
              romaji
              english
            }
            coverImage {
              large
            }
            siteUrl
          }
        }
      }
    }
  }
  `;

  const variables = {
    username,
    type: mediaType,
  };

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: `User ${username} not found on AniList` });
      }
      const text = await response.text();
      return res.status(response.status).json({ error: `AniList API Error: ${text}` });
    }

    const json = await response.json();

    if (json.errors) {
      return res.status(400).json({ error: json.errors[0].message });
    }

    const lists = json.data.MediaListCollection.lists;
    let allItems = [];

    lists.forEach((list) => {
      list.entries.forEach((entry) => {
        allItems.push({
          id: entry.media.id,
          title: entry.media.title.english || entry.media.title.romaji,
          titleRomaji: entry.media.title.romaji,
          titleEnglish: entry.media.title.english,
          image: entry.media.coverImage.large,
          url: entry.media.siteUrl,
        });
      });
    });

    res.status(200).json({ items: allItems });
  } catch (error) {
    console.error('Error fetching AniList data:', error);
    res.status(500).json({ error: 'Failed to fetch AniList data' });
  }
}
