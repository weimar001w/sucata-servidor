const https = require("https");

const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const http = require("http");

const server = http.createServer((req, res) => {
  // CORS — permite qualquer origem
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/mensagem") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      let payload;
      try { payload = JSON.parse(body); } catch(e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "JSON invalido" }));
        return;
      }

      const dados = JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: payload.system,
        messages: payload.messages
      });

      const opcoes = {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(dados)
        }
      };

      const reqAPI = https.request(opcoes, resAPI => {
        let resposta = "";
        resAPI.on("data", chunk => { resposta += chunk; });
        resAPI.on("end", () => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(resposta);
        });
      });

      reqAPI.on("error", err => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      });

      reqAPI.write(dados);
      reqAPI.end();
    });
    return;
  }

  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200);
    res.end("Servidor Sucata OK");
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
