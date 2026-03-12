async function run() {
  const url = `http://localhost:3003/api/anilist?username=Astroboy&type=anime`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(JSON.stringify(data.user, null, 2));
    console.log(JSON.stringify(data.items[0], null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
