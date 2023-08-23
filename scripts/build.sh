#!/bin/bash
# https://github.com/arlogy/nvc
# Released under the MIT License (see LICENSE file)
# Copyright (c) 2023 https://github.com/arlogy

# Get the absolute path to the root of the git repository containing this
# script. This allows for better control of resource or script paths.
SCRIPT_PATH=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_PATH=$(cd "$SCRIPT_PATH" && git rev-parse --show-toplevel)
if [[ ! -d "$ROOT_PATH" ]]; then
    echo "Unable to get the root directory of the git repository containing this script" && exit 1
fi

source "$ROOT_PATH/scripts/defs.sh" || exit 1

if [ "$#" -ne 1 ]; then
    echo "Invalid number of parameters: 1 expected, $# found" && exit 1
fi

if [ "$1" == "gen-html-examples-deps" ]; then
    gen_html_examples_deps "$ROOT_PATH/node_modules/jsupack/src" "$ROOT_PATH/examples/html_pages/api_deps" || exit 1
else
    echo "Parameter must be: gen-html-examples-deps" && exit 1
fi
