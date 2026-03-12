async function run() {
  const query = `
  query {
    User(name: "Astroboy") {
      id
      name
      avatar {
        large
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
  console.log(JSON.stringify(data, null, 2));
}
run();
