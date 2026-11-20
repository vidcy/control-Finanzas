async function test() {
  const ruc = "10475675946";
  const dni = ruc.substring(2, 10);
  console.log("RUC:", ruc, "DNI:", dni);

  try {
    const r1 = await fetch("http://localhost:4001/api/v1/consultas/ruc/" + ruc);
    console.log("Local 4001 status:", r1.status, await r1.text().catch(e => e.message));
  } catch(e) { console.log("Local 4001 error:", e.message); }

  try {
    const r2 = await fetch("https://api.apis.net.pe/v1/ruc?numero=" + ruc, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    console.log("apis.net.pe RUC status:", r2.status, await r2.text().catch(e => e.message));
  } catch(e) { console.log("apis.net.pe RUC error:", e.message); }

  try {
    const r3 = await fetch("https://api.apis.net.pe/v1/dni?numero=" + dni, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    console.log("apis.net.pe DNI status:", r3.status, await r3.text().catch(e => e.message));
  } catch(e) { console.log("apis.net.pe DNI error:", e.message); }

  try {
    const r4 = await fetch("https://api.apis.net.pe/v2/sunat/ruc?numero=" + ruc);
    console.log("apis.net.pe v2 RUC status:", r4.status, await r4.text().catch(e => e.message));
  } catch(e) { console.log("apis.net.pe v2 RUC error:", e.message); }

  try {
    const r5 = await fetch("https://api.factiliza.com/pe/v1/ruc/info/" + ruc);
    console.log("factiliza status:", r5.status, await r5.text().catch(e => e.message));
  } catch(e) { console.log("factiliza error:", e.message); }
}
test();
