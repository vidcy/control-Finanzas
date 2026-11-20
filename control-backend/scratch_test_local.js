async function t() {
  try {
    const r1 = await fetch("http://127.0.0.1:4001/api/v1/consultas/ruc/10475675946");
    console.log("127.0.0.1:", r1.status);
  } catch(e) { console.log("127.0.0.1 error:", e.message); }
  try {
    const r2 = await fetch("http://localhost:4001/api/v1/consultas/ruc/10475675946");
    console.log("localhost:", r2.status);
  } catch(e) { console.log("localhost error:", e.message); }
}
t();
