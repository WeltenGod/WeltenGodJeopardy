export default async function handler(req, res) {
  const { username, type = 'anime' } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const endpoint = type === 'manga' ? 'mangalist' : 'animelist';
  let allItems = [];
  let url = `https://api.myanimelist.net/v2/users/${encodeURIComponent(username)}/${endpoint}?limit=1000&fields=list_status,title,main_picture`;

  const CLIENT_ID = '6114d00ca681b7701d1e15fe11a4987e'; // Publicly available client ID for retrieving lists

  try {
    while (url) {
      const response = await fetch(url, {
        headers: {
          'X-MAL-CLIENT-ID': CLIENT_ID,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
           return res.status(404).json({ error: `User ${username} not found on MAL` });
        }
        const text = await response.text();
        return res.status(response.status).json({ error: `MAL API Error: ${text}` });
      }

      const data = await response.json();
      if (data.data) {
        allItems = allItems.concat(data.data);
      }

      url = data.paging && data.paging.next ? data.paging.next : null;
    }

    // Transform data to a common format
    const transformed = allItems.map((item) => ({
      id: item.node.id,
      title: item.node.title,
      image: item.node.main_picture ? item.node.main_picture.large || item.node.main_picture.medium : null,
      url: `https://myanimelist.net/${type}/${item.node.id}`,
    }));

    res.status(200).json({ items: transformed });
  } catch (error) {
    console.error('Error fetching MAL data:', error);
    res.status(500).json({ error: 'Failed to fetch MAL data' });
  }
}
