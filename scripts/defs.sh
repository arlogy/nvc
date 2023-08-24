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

# Generate latest API files, copying from one directory to another.
#
# Note: do not pass directories that resolve to the same path (i.e. they point
# to the same location), otherwise data will be lost (rm command used).
gen_api_files() {
    if [ "$#" -ne 2 ]; then
        echo "2 parameters expected to generate dependencies, $# given" 1>&2 && return 1
    fi

    local src_dir jsu_dir nvc_dir dst_dir
    src_dir="$1"
    jsu_dir="$src_dir/node_modules/jsupack/src"
    nvc_dir="$src_dir/src"
    dst_dir="$2"

    echo "Generating latest API files..."
    if [[ ! -d "$jsu_dir" ]]; then
        echo "$jsu_dir is not a directory" 1>&2 && return 1
    fi
    if [[ ! -d "$nvc_dir" ]]; then
        echo "$nvc_dir is not a directory" 1>&2 && return 1
    fi

    echo "Delete and recreate the destination directory ($dst_dir)" &&
    rm -rf "$dst_dir" && mkdir -p "$dst_dir" || return 1

    echo "Copy dependencies to destination directory" &&
    cp "$jsu_dir/jsu_common.js" "$dst_dir/jsu_common.js" &&
    cp "$jsu_dir/jsu_csv_parser.js" "$dst_dir/jsu_csv_parser.js" &&
    cp "$jsu_dir/jsu_event.js" "$dst_dir/jsu_event.js" &&
    cp "$jsu_dir/jsu_latex.js" "$dst_dir/jsu_latex.js" &&
    cp "$nvc_dir/nvc.js" "$dst_dir/nvc.js" &&
    cp "$nvc_dir/nvc_fsm.js" "$dst_dir/nvc_fsm.js" &&
    cp "$nvc_dir/nvc_quick.js" "$dst_dir/nvc_quick.js" || return 1

    echo "Finished!"
    return 0
}
