SHELL = /bin/bash

all:

start:
	docker-compose up &

stop:
	docker-compose down

build:
	docker-compose up --build &

connect:
	@docker exec -it wallbox-test_app_1 /bin/sh
	
