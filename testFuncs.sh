#!/bin/bash

DOCKER_PATH=$(which docker)
if [ "$DOCKER_PATH" == "" ]; then
  echo "Cannot find docker" >&2
  exit 1
fi

LOCALSTACK_EDGE_PORT=4566

IFS=''

function readDockerContainerState() {
  local data
  local name=$1
  local prefix=$(printf '%s\n' "$name" | awk '{ print toupper($0) }')
  read -ra data <<<$(docker container ls -a --filter name=$name --format='"{{.ID}}" "{{.Names}}" "{{.Status}}""' | awk '{print $1" "$2" "$3 "\""}')
  command eval "local data=($data)"
  if [ "$data" != "" ]; then
    command eval "${prefix}_ID=\"${data[0]}\""
    command eval "${prefix}_NAME=\"${data[1]}\""
    local status=$(printf '%s\n' "${data[2]}" | awk '{ print tolower($0) }')
    command eval "${prefix}_STATUS=\"${status}\""
  fi
}

function findContainerState() {
  local data
  local name=$2
  local ancestor=$1
  local prefix=$(printf '%s\n' "$name" | awk '{ print toupper($0) }')
  read -ra data <<<$(docker ps --filter "ancestor=$ancestor" --format='"{{.ID}}" "{{.Names}}" "{{.Status}}""' | awk '{print $1" "$2" "$3 "\""}')
  command eval "local data=($data)"
  if [ "$data" != "" ]; then
    command eval "${prefix}_ID=\"${data[0]}\""
    command eval "${prefix}_NAME=\"${data[1]}\""
    local status=$(printf '%s\n' "${data[2]}" | awk '{ print tolower($0) }')
    command eval "${prefix}_STATUS=\"${status}\""
  fi
}

function runTests() {
  if [ "$CI" != "true" ]; then
    nyc ts-node node_modules/tape/bin/tape ./test/** | faucet || true
  else
    nyc ts-node node_modules/tape/bin/tape ./test/** | tap-junit -s 'DynamoDBDown All Tests' -o build/junit -n results.xml || true
  fi
}
