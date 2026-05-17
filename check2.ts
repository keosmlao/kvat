import { Client } from "pg";
const c = new Client({ connectionString: "postgresql://itdpt@localhost:5432/kvat" });
async function main() {
  await c.connect();
  const r = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%ecurring%'");
  console.log("kvat tables:", r.rows);
  await c.end();
  
  const c2 = new Client({ connectionString: "postgresql://itdpt@localhost:5432/kvat_keoitc2014" });
  await c2.connect();
  const r2 = await c2.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%ecurring%'");
  console.log("kvat_keoitc2014 tables:", r2.rows);
  await c2.end();
}
main();
