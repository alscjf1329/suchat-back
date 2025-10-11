export root_dir=/c/Users/SheepDuck/Desktop/project/suchat/suchat-back
export env_file=$root_dir/.env

if [ -f $env_file ]; then
    source $env_file
fi