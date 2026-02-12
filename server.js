import { createServer } from "http";
import next from "next";

const port = process.env.PORT || 8080; // Cloud Run usa 8080 sí o sí
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`Cotidie corriendo en http://localhost:${port}`);
  });
});
