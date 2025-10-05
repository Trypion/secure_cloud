FRONT_DIR=client
SERVER_DIR=server
STATIC_DIR=$(SERVER_DIR)/static

.PHONY: frontend copy build-linux build-windows release clean run dev deps


deps:
	cd $(SERVER_DIR) && go mod tidy

frontend:
	cd $(FRONT_DIR) && npm install && npm run build

copy: frontend
	rm -rf $(STATIC_DIR)/*
	cp -r $(FRONT_DIR)/dist/* $(STATIC_DIR)/

build-linux: deps copy
	cd $(SERVER_DIR) && go build -o secure-cloud-server

build-windows: deps copy
	cd $(SERVER_DIR) && CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -o secure-cloud-server.exe

release: build-linux build-windows
	@echo "Builds prontos em $(SERVER_DIR)/"

run: build-linux
	./$(SERVER_DIR)/secure-cloud-server

# Desenvolvimento: backend live + frontend dev server separado (não embed)
dev:
	# Terminal 1: make dev-front | Terminal 2: make dev-back
	@echo "Use 'make dev-front' e 'make dev-back' em terminais separados"

.PHONY: dev-front dev-back

dev-front:
	cd $(FRONT_DIR) && npm install && npm run dev

dev-back:
	cd $(SERVER_DIR) && go run .

clean:
	rm -rf $(FRONT_DIR)/dist $(SERVER_DIR)/secure-cloud-server* $(STATIC_DIR)/*
