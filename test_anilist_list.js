async function run() {
  const query = `
  query {
    MediaListCollection(userName: "Astroboy", type: ANIME) {
      lists {
        name
        status
        entries {
          status
          progress
          media {
            id
            title { romaji english }
          }
        }
      }
    }
  }
  `;
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await response.json();
  if (data.data.MediaListCollection) {
     console.log(data.data.MediaListCollection.lists[0].name);
     console.log(data.data.MediaListCollection.lists[0].status);
     console.log(data.data.MediaListCollection.lists[0].entries[0]);
  } else {
     console.log(data);
  }
}
run();
