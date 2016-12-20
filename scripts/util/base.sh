set -euf -o pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.."; pwd)
SCRIPTS_DIR="$ROOT_DIR/scripts"
CONFIG_DIR="$ROOT_DIR/config"
SOURCE_DIR="$ROOT_DIR/src"
TEST_DIR="$ROOT_DIR/spec"
OUT_DIR="$ROOT_DIR/out"

SERVER_OUT_DIR="$OUT_DIR/src"
CLIENT_OUT_DIR="$OUT_DIR/bundle"

ALL_TYPESCRIPT_TEST_FILES="$TEST_DIR/**/*.ts $TEST_DIR/**/*.tsx"
ALL_TYPESCRIPT_SOURCE_FILES="$SOURCE_DIR/**/*.ts $SOURCE_DIR/**/*.tsx"
ALL_CONFIG_FILES="$CONFIG_DIR/**/*"

NPM_BIN_PATH="$ROOT_DIR/node_modules/.bin:$PATH"

function npm_which {
  echo $(PATH=$NPM_BIN_PATH which $1)
}

