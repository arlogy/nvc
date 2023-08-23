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

# Generate latest dependencies for HTML examples, copying from one directory to
# another.
#
# Note: do not pass directories that resolve to the same path (i.e. they point
# to the same location), otherwise data will be lost (rm command used).
gen_html_examples_deps() {
    if [ "$#" -ne 2 ]; then
        echo "2 parameters expected to generate dependencies, $# given" 1>&2 && return 1
    fi

    local src_dir dst_dir
    src_dir="$1"
    dst_dir="$2"

    echo "Generating latest dependencies for HTML examples..."
    echo "    From: '$src_dir'"
    echo "    To:   '$dst_dir'"
    if [[ ! -d "$src_dir" ]]; then
        echo "Source path is not a directory" 1>&2 && return 1
    fi

    echo "Delete and recreate the destination directory" &&
    rm -rf "$dst_dir" && mkdir -p "$dst_dir" || return 1

    echo "Copy dependencies to destination directory" &&
    cp "$src_dir/jsu_common.js" "$dst_dir/jsu_common.js" &&
    cp "$src_dir/jsu_csv_parser.js" "$dst_dir/jsu_csv_parser.js" &&
    cp "$src_dir/jsu_event.js" "$dst_dir/jsu_event.js" &&
    cp "$src_dir/jsu_latex.js" "$dst_dir/jsu_latex.js" || return 1

    echo "Finished!"
    return 0
}
