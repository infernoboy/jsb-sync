.PHONY: test

$(if $(findstring /,$(MAKEFILE_LIST)),$(error Run Makefile from directory it is located in))

REDIS_BIN=$(shell which redis-server)
NODE_BIN=$(shell which node)
NODE=$(NODE_BIN) --harmony-async-await
NODE_PATH=NODE_PATH=./lib/
MOCHA_BIN=./node_modules/mocha/bin/mocha
MOCHA_CLEAN=./node_modules/mocha-clean/
MOCHA=./node_modules/mocha/bin/mocha -b --harmony --require mocha-clean

_ensure-environment:
ifeq ($(NODE_BIN),)
	$(error You have to install node)
endif

ifeq ($(REDIS_BIN),)
	$(error You have to install redis)
endif

_ensure-mocha:
	@if [ ! -f $(MOCHA_BIN) ]; then echo "Missing mocha. Run `npm install` first." && exit 1; fi;
	@if [ ! -d $(MOCHA_CLEAN) ]; then echo "Missing mocha-clean. Run `npm install` first." && exit 2; fi;

test: _ensure-mocha
	@$(NODE_PATH) NODE_ENV="development" $(MOCHA)

stop-redis-develop:
	@shopt -s nullglob; \
	for pid_file in /usr/local/var/run/redis/jsb-development-*; do \
		kill -INT `cat $${pid_file}` 2>/dev/null && sleep 0.2; \
	done;

start-redis-develop: _ensure-environment stop-redis-develop
	@$(REDIS_BIN) lib/configs/redis/development/no-disk.1.conf & sleep 0.5; \
	$(REDIS_BIN) lib/configs/redis/development/no-disk.2.conf & \
	$(REDIS_BIN) lib/configs/redis/development/disk.1.conf & sleep 0.5; \
	$(REDIS_BIN) lib/configs/redis/development/disk.2.conf &

develop: start-redis-develop
	@NODE_ENV="development" $(NODE_PATH) $(NODE) index
