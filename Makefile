.PHONY: tests

$(if $(findstring /,$(MAKEFILE_LIST)),$(error Run Makefile from directory it is located in.))

MOCHA := ./node_modules/mocha/bin/mocha

_ensure-mocha:
	@echo "Checking for mocha..."

	@if [ ! -f ${MOCHA} ] ; then \
		echo "Run npm install before running tests. (${MOCHA} not found)" ; \
		exit 1; \
	fi;

test-registration: _ensure-mocha
	@echo "Testing registration..."

	@${MOCHA} ./test/registration.js

tests: test-registration

