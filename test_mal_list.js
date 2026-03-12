const CLIENT_ID = '6114d00ca681b7701d1e15fe11a4987e';
async function run() {
  const username = 'xinil';
  const url = `https://api.myanimelist.net/v2/users/${encodeURIComponent(username)}/animelist?limit=10&fields=list_status,title,main_picture`;
  const response = await fetch(url, { headers: { 'X-MAL-CLIENT-ID': CLIENT_ID }});
  const data = await response.json();
  console.log(JSON.stringify(data.data[0], null, 2));
}
run();
