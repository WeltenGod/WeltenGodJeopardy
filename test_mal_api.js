async function run() {
  const url = `http://localhost:3000/api/mal?username=xinil&type=anime`;
  // start local server
  const child = require('child_process').spawn('npm', ['run', 'dev'], {cwd: 'anime-list-comparator'});
  // wait 5s
  await new Promise(r => setTimeout(r, 5000));
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(JSON.stringify(data.user, null, 2));
    console.log(JSON.stringify(data.items[0], null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    child.kill();
  }
}
run();
