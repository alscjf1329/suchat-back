root_dir=$(pwd)/../
env_file=$root_dir/.env

if [ -f $env_file ]; then
    source $env_file
fi