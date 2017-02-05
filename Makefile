.PHONY: tests

$(if $(findstring /,$(MAKEFILE_LIST)),$(error Run Makefile from directory it is located in.))

MOCHA_BIN=./node_modules/mocha/bin/mocha
MOCHA_CLEAN=./node_modules/mocha-clean/
MOCHA=./node_modules/mocha/bin/mocha -b --harmony --require mocha-clean

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
	@shopt -s nullglob; \
	for pid_file in /usr/local/var/run/redis/jsb-development-*; do \
		kill -INT `cat $${pid_file}` 2>/dev/null && sleep 0.2; \
	done;

start-redis-develop: stop-redis-develop
	@redis-server configs/redis/development/no-disk.1.conf & sleep 0.05; \
	redis-server configs/redis/development/no-disk.2.conf & sleep 0.05; \
	redis-server configs/redis/development/disk.1.conf & sleep 0.05; \
	redis-server configs/redis/development/disk.2.conf & sleep 0.05;

develop: start-redis-develop
	@NODE_ENV="development" node --harmony-async-await index
