const https = require('https');

function get(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    }).on('error', e => resolve({ error: e.message }));
  });
}

async function run() {
  const html = await get('https://www.think.ccoplex.com/catalogo/electrodomesticos-ayca');
  console.log('HTML status:', html.status);
  const match = html.data.match(/src="(\/assets\/index-[^"]+\.js)"/);
  console.log('Index JS asset in production HTML:', match ? match[1] : 'not found');

  if (match) {
    const js = await get('https://www.think.ccoplex.com' + match[1]);
    console.log('JS status:', js.status, 'JS size:', js.data.length);
    console.log('Contains storeDisplayName?', js.data.includes('storeDisplayName'));
    console.log('Contains getCatalogStoreInfoRequest?', js.data.includes('getCatalogStoreInfoRequest') || js.data.includes('catalog/store-info'));
    console.log('Contains 58bc075?', js.data.includes('58bc075'));
  }
}
run();
