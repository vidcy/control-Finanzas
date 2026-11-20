async function testGateways() {
  const dni = "47567594";
  const ruc = "10475675946";

  const urls = [
    `http://127.0.0.1:4001/api/v1/consultas/ruc/${ruc}`,
    `https://openruc.com/api/ruc/${ruc}`,
    `https://api.sunat.gob.pe/v1/contribuyente/ruc/${ruc}`,
    `https://api.consultasperu.com/api/v1/ruc/${ruc}`,
    `https://dniruc.apisperu.com/api/v1/ruc/${ruc}`,
    `https://eldni.com/pe/buscar-datos-por-dni/${dni}`,
    `https://apiperu.dev/api/ruc/${ruc}`,
    `https://ruc.pe/api/v1/ruc/${ruc}`,
    `https://api.reniec.cloud/dni/${dni}`
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(3000)
      });
      console.log(u, "STATUS:", res.status);
      if (res.ok) {
        const txt = await res.text();
        console.log("  BODY:", txt.substring(0, 150));
      }
    } catch(e) {
      console.log(u, "ERR:", e.message);
    }
  }
}
testGateways();
