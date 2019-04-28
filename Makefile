build:
	./scripts/pre-build.sh
	docker-compose build


up: build
	docker-compose up