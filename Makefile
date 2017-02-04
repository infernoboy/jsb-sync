.PHONY: tests

$(if $(findstring /,$(MAKEFILE_LIST)),$(error Run Makefile from directory it is located in.))

MOCHA_BIN=./node_modules/mocha/bin/mocha
MOCHA_CLEAN=./node_modules/mocha-clean/
MOCHA=./node_modules/mocha/bin/mocha --harmony --require mocha-clean

_ensure-mocha:
	@if [ ! -f $(MOCHA_BIN) ]; then echo "Missing mocha. Run npm-install first." && exit 1; fi;
	@if [ ! -d $(MOCHA_CLEAN) ]; then echo "Missing mocha-clean. Run npm-install first." && exit 2; fi;

test-all: _ensure-mocha
	@$(MOCHA)

test-registration: _ensure-mocha
	@$(MOCHA) ./test/api/registration.js

test-bruteforce-protection: _ensure-mocha
	@$(MOCHA) ./test/api/bruteforce.js

tests: test-bruteforce-protection test-registration

stop-redis-develop:
	@echo "Stopping redis...";
	@shopt -s nullglob; for file in /usr/local/var/run/redis/development-*; do kill -INT `cat $${file}` 2>/dev/null; done

start-redis-develop: stop-redis-develop
	@sleep 1; \
	redis-server config/redis/development/no-disk.1.conf & sleep 0.1; \
	redis-server config/redis/development/no-disk.2.conf & sleep 0.1; \
	redis-server config/redis/development/disk.1.conf & sleep 0.1; \
	redis-server config/redis/development/disk.2.conf & sleep 0.1;

develop: start-redis-develop
	@NODE_ENV="development" node --harmony-async-await index; \
	echo "SAD";
