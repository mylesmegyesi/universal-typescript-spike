set -euf -o pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.."; pwd)
SCRIPTS_DIR="$ROOT_DIR/scripts"
CONFIG_DIR="$ROOT_DIR/config"
SOURCE_DIR="$ROOT_DIR/src"
TEST_DIR="$ROOT_DIR/test"

NPM_BIN_PATH=$ROOT_DIR/node_modules/.bin:$PATH

function npm_which {
  echo $(PATH=$NPM_BIN_PATH which $1)
}

function echo_run {
  echo "$@"
  "$@"
}
