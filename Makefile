# HormuzWatch — service orchestration
#
# Common commands:
#   make up          Build & start the full stack (client + server + ml) in background
#   make server      Start the Go server + unified ML service (no client)
#   make ml          Start only the unified ML service
#   make down        Stop and remove all containers
#   make logs        Follow logs for server + ml
#   make train       Train the vessel ensemble model (offline, requires pandas)
#   make test        Run the ML service unit tests (requires pytest)
#   make build       Build the ML service image only

COMPOSE = docker compose

.PHONY: up server ml down logs build train test shell-ml proto grpc

## proto: regenerate gRPC stubs from proto/ml_service.proto
##   Go  -> server/internal/mlgrpc/{ml_service.pb.go,ml_service_grpc.pb.go}
##   Py  -> ml-service/{ml_service_pb2.py,ml_service_pb2_grpc.py}
## Requires: protoc, protoc-gen-go, protoc-gen-go-grpc, grpcio-tools
proto:
	protoc --go_out=. --go_opt=paths=source_relative \
	       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
	       proto/ml_service.proto
	@powershell -NoProfile -Command " \
	  New-Item -ItemType Directory -Force -Path server/internal/mlgrpc | Out-Null; \
	  Move-Item -Force proto/ml_service.pb.go server/internal/mlgrpc/; \
	  Move-Item -Force proto/ml_service_grpc.pb.go server/internal/mlgrpc/"
	python -m grpc_tools.protoc -I proto \
	       --python_out=ml-service --grpc_python_out=ml-service \
	       proto/ml_service.proto

## grpc: run the Python ML gRPC server (production transport, Go backend -> ml-service)
grpc:
	cd ml-service && python grpc_server.py

## up: full stack (client + server + ml)
up:
	$(COMPOSE) up -d --build

## server: Go backend + unified ML service (no client)
server:
	$(COMPOSE) up -d --build go-server ml-service

## ml: unified ML service only
ml:
	$(COMPOSE) up -d --build ml-service

## down: stop everything
down:
	$(COMPOSE) down

## logs: follow server + ml logs
logs:
	$(COMPOSE) logs -f go-server ml-service

## build: build the ML service image
build:
	$(COMPOSE) build ml-service

## train: train the vessel ensemble model offline (requires pandas)
train:
	docker compose run --rm -e MODELS_DIR=/app/models ml-service \
		python api/train.py --domain vessel --input data/vessel_tracks.csv

## test: run ML service unit tests (requires pytest)
test:
	docker compose run --rm ml-service sh -c "pip install -q pytest && pytest tests/ -v"

## shell-ml: open a shell inside the running ML service container
shell-ml:
	docker compose exec ml-service sh
