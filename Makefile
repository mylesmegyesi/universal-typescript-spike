OUT_DIR             := ./out
CONFIG_DIR          := ./config
TEST_DIR            := ./spec
SOURCE_DIR          := ./src
CLIENT_OUT_DIR      := $(OUT_DIR)/bundle
SERVER_OUT_DIR      := $(OUT_DIR)/src
SERVER_TEST_FILES   := '$(TEST_DIR)/server/**/*.ts' '$(TEST_DIR)/server/**/*.tsx $(TEST_DIR)/common/**/*.ts' '$(TEST_DIR)/common/**/*.tsx'
SERVER_SOURCE_FILES := '$(SOURCE_DIR)/server/**/*.ts' '$(SOURCE_DIR)/server/**/*.tsx $(SOURCE_DIR)/common/**/*.ts' '$(SOURCE_DIR)/common/**/*.tsx'
CONFIG_FILES        := '$(CONFIG_DIR)/**/*'
SOURCE_FILES        := '$(SOURCE_DIR)/**/*'

NPM_BIN      := ./node_modules/.bin
KARMA        := $(NPM_BIN)/karma
WEBPACK      := $(NPM_BIN)/webpack
TSC          := $(NPM_BIN)/tsc
MOCHA        := $(NPM_BIN)/mocha
ONCHANGE     := $(NPM_BIN)/onchange
TSLINT       := $(NPM_BIN)/tslint
CONCURRENTLY := $(NPM_BIN)/concurrently
TS_NODE      := $(NPM_BIN)/ts-node

NODE_TS_CONFIG := $(CONFIG_DIR)/tsconfig.node.json

.PHONY: client-build
client-build:
	NODE_ENV=production TS_NODE_PROJECT=$(NODE_TS_CONFIG) $(WEBPACK) --config $(CONFIG_DIR)/webpack.config.ts --output-path $(CLIENT_OUT_DIR)

.PHONY: client-test
client-test:
	TS_NODE_PROJECT=$(NODE_TS_CONFIG) $(KARMA) start $(CONFIG_DIR)/karma.conf.ts --single-run

.PHONY: client-test-watch
client-test-watch:
	TS_NODE_PROJECT=$(NODE_TS_CONFIG) $(KARMA) start $(CONFIG_DIR)/karma.conf.ts --auto-watch

$(OUT_DIR)/start:
	echo "#!/usr/bin/env sh\n\nnode --require source-map-support/register $(SERVER_OUT_DIR)/server/Main.js --bundlePath $(CLIENT_OUT_DIR) \"\$$@\"" > $@
	chmod +x $@

.PHONY: server-compile
server-compile:
	$(TSC) --project $(CONFIG_DIR)/tsconfig.server.json --outDir $(SERVER_OUT_DIR)

.PHONY: server-build
server-build: server-compile $(OUT_DIR)/start

.PHONY: server-test
_SERVER_TEST := $(MOCHA) --colors --no-exit --compilers ts:ts-node/register,tsx:ts-node/register $(SERVER_TEST_FILES) --reporter mocha-minimalist-reporter
server-test:
	TS_NODE_PROJECT=$(NODE_TS_CONFIG) $(_SERVER_TEST)

.PHONY: server-test-watch
server-test-watch:
	TS_NODE_PROJECT=$(NODE_TS_CONFIG) $(ONCHANGE) $(SERVER_TEST_FILES) $(SERVER_SOURCE_FILES) $(CONFIG_FILES) --initial --wait --verbose --poll 100 -- $(_SERVER_TEST)

.PHONY: build
build: client-build server-build

.PHONY: test
test: client-test server-test

.PHONY: test-watch
test-watch:
	$(CONCURRENTLY) --success all --prefix "[{name}]" --prefix-colors magenta,cyan --names client-test-watch,server-test-watch "make client-test-watch" "make server-test-watch"

.PHONY: lint
lint:
	$(TSLINT) --config $(CONFIG_DIR)/tslint.json --format prose --type-check --project $(CONFIG_DIR)/tsconfig.tslint.json

.PHONY: devserver
devserver:
	TS_NODE_PROJECT=$(NODE_TS_CONFIG) $(ONCHANGE) $(SOURCE_FILES) $(CONFIG_FILES) --initial --verbose --poll 100 -- $(TS_NODE) ./config/devserver.ts

.PHONY: clean
clean:
	rm -rf $(OUT_DIR)
