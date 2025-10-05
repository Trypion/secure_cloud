# Secure Cloud

Projeto de segurança da informação e redes, UFSC

Aplicação full-stack (Go + React/Vite) para upload, listagem e download de arquivos com autenticação (incluindo TOTP) e criptografia.

## Como Rodar o projeto

#### A partir do zip

- Extrair arquivo zip.
- A porta 8080 deve estar disponivel.
- Dentro da pasta server executar o arquivo **secure-cloud-server.exe**.
- Um servidor web irá iniciar localmente servindo arquivos na porta 8080.
- Acesse http://localhost:8080 deve carregar a pagina incial.

#### A partir do codigo fonte 

- Necessario node 20+, npm 10.9.3+ e go1.25+
- Executar Makefile

para gerar uma build windows
```bash
make build-windows
```

para gerar uma build linux
```bash
make build-linux
```

#### Modo de desenvolvimento

- Necessario node 20+, npm 10.9.3+ e go1.25+

Cliente
```bash
cd client
npm install
npm run dev
```

Server
```bash
cd server
go mod tidy
go run main.go
```

- O cliente vai subir na porta **5173**
- O servidor vai subir na porta **8080**
