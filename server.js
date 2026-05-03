const https = require("https");
const http = require("http");

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `Você é o assistente de voz de um sistema de compra de sucata (ferro-velho).
Seu trabalho é interpretar comandos de voz em português brasileiro (informal, com erros, sotaque regional) e retornar APENAS um JSON com a ação a executar.

AÇÕES DISPONÍVEIS:
- criarCliente: params: {nome}
- abrirCliente: params: {nome}
- apagarCliente: params: {nome}
- listarClientes: params: {}
- adicionarMaterial: params: {material, quantidade, clienteNome (opcional)}
- finalizarCliente: params: {clienteNome (opcional), valorPago, descontarDivida (bool, default false)}
- adicionarEntrada: params: {valor, descricao}
- adicionarSaida: params: {valor, descricao}
- adicionarVendaObjeto: params: {valor, descricao}
- adicionarVendaMaterial: params: {valor, descricao, kg}
- consultarSaldo: params: {}
- consultarTotal: params: {clienteNome (opcional)}
- consultarDivida: params: {clienteNome}
- abrirCaixa: params: {}
- abrirPrecos: params: {}
- abrirResumo: params: {}
- abrirHistorico: params: {}
- voltarInicio: params: {}
- encerrarDia: params: {}
- confirmarEncerramento: params: {}
- ajuda: params: {}
- naoEntendido: params: {motivo}

REGRAS:
1. Retorne APENAS JSON válido, sem texto extra, sem markdown.
2. Formato: {"acao": "nomeAcao", "params": {...}, "confirmacao": "frase curta confirmando o que entendeu (max 10 palavras)"}
3. Para materiais, normalize: "cobre mel" -> "cobre_mel", "plastico colorido" -> "plastico_colorido", etc.
4. Se o usuario falar "sim", "pode", "confirma", "ta bom" apos confirmacao pendente, use a acao correspondente.
5. Para quantidades, entenda numeros por extenso: "dez" = 10, "vinte e cinco" = 25, etc.
6. Se nao entender, use naoEntendido.`;

const server = http.createServer((req, res) => {
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

      var texto = payload.texto || "";

      var dadosGemini = JSON.stringify({
        contents: [{
          parts: [{ text: SYSTEM_PROMPT + "\n\nContexto: " + (payload.contexto || "") + "\n\nComando: " + texto }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500
        }
      });

      var opcoes = {
        hostname: "generativelanguage.googleapis.com",
        path: "/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_API_KEY,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(dadosGemini)
        }
      };

      var reqAPI = https.request(opcoes, resAPI => {
        var resposta = "";
        resAPI.on("data", chunk => { resposta += chunk; });
        resAPI.on("end", () => {
          try {
            var json = JSON.parse(resposta);
            var textoResp = json.candidates[0].content.parts[0].text;
            textoResp = textoResp.replace(/```json|```/g, "").trim();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ resultado: textoResp }));
          } catch(e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Erro ao processar resposta: " + e.message }));
          }
        });
      });

      reqAPI.on("error", err => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      });

      reqAPI.write(dadosGemini);
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
