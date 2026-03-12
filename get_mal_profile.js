async function run() {
  const username = 'Xinil';
  const url = `https://api.jikan.moe/v4/users/${encodeURIComponent(username)}`;
  const response = await fetch(url);
  const data = await response.json();
  console.log(data.data.images);
}
run();
