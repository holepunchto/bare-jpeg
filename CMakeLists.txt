cmake_minimum_required(VERSION 3.31)

find_package(cmake-bare REQUIRED PATHS node_modules/cmake-bare)
find_package(cmake-ports REQUIRED PATHS node_modules/cmake-ports)

project(bare_jpeg C)

find_port(libjpeg)

add_bare_module(bare_jpeg)

target_sources(
  ${bare_jpeg}
  PRIVATE
    binding.c
)

target_link_libraries(
  ${bare_jpeg}
  PUBLIC
    jpeg
)
