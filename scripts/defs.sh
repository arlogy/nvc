#!/bin/bash
# https://github.com/arlogy/nvc
# Released under the MIT License (see LICENSE file)
# Copyright (c) 2023 https://github.com/arlogy

# ----------------------
# --- Initialization ---
# ----------------------

# Intercept shell process termination (EXIT signal) to call exit_handler(). The
# function named "on_exit" will be called if defined.
trap exit_handler EXIT
exit_handler() {
    # depending on the current command, the messages logged by the on_exit
    # function may not be displayed to the user (i.e. even after the script
    # terminates)
    [[ "$(type -t on_exit)" == "function" ]] && on_exit
}

# Intercept Ctrl+C (SIGINT signal) to call ctrl_c_handler(). Useful to break
# earlier from while loops for example.
trap ctrl_c_handler INT
ctrl_c_handler() {
    echo "Trapped CTRL+C" && exit 1 # exit_handler will also be triggered
}

# --------------------------------------
# --- Application-specific functions ---
# --------------------------------------

# Copies latest API files from one directory to another. The destination
# directory will be created if it doesn't exist.
copy_api_files() {
    if [ "$#" -ne 2 ]; then
        echo "2 parameters expected to copy API files, $# given" 1>&2 && return 1
    fi

    local base_dir jsu_dir nvc_dir dst_dir
    base_dir="$1"
    jsu_dir="$base_dir/node_modules/jsupack/src"
    nvc_dir="$base_dir/src"
    dst_dir="$2"

    if [[ ! -d "$jsu_dir" ]]; then
        echo "jsu path '$jsu_dir' is not a directory" 1>&2 && return 1
    fi
    if [[ ! -d "$nvc_dir" ]]; then
        echo "nvc path '$nvc_dir' is not a directory" 1>&2 && return 1
    fi

    mkdir -p "$dst_dir" &&
    cp "$jsu_dir/jsu_common.js"     "$dst_dir/jsu_common.js" &&
    cp "$jsu_dir/jsu_csv_parser.js" "$dst_dir/jsu_csv_parser.js" &&
    cp "$jsu_dir/jsu_event.js"      "$dst_dir/jsu_event.js" &&
    cp "$jsu_dir/jsu_latex.js"      "$dst_dir/jsu_latex.js" &&
    cp "$nvc_dir/nvc.js"            "$dst_dir/nvc.js" &&
    cp "$nvc_dir/nvc_fsm.js"        "$dst_dir/nvc_fsm.js" &&
    cp "$nvc_dir/nvc_quick.js"      "$dst_dir/nvc_quick.js" || return 1

    return 0
}

# Updates HTML examples with latest dependencies.
update_html_examples() {
    if [ "$#" -ne 1 ]; then
        echo "1 parameter expected to update HTML examples, $# given" 1>&2 && return 1
    fi

    local base_dir examples_dir api_files_dir
    base_dir="$1"
    examples_dir="$base_dir/examples/html_pages"
    api_files_dir="$examples_dir/api_files"

    echo "Updating HTML examples..."

    echo "Delete API files directory '$api_files_dir'" &&
    rm -rf "$api_files_dir" &&
    echo "Copy latest API files to their directory" &&
    copy_api_files "$base_dir" "$api_files_dir" || return 1

    echo "Finished!"
    return 0
}
