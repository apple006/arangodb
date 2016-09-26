message("enabling MacOSX 'Bundle' package")
set(CPACK_PACKAGE_NAME           "ArangoDB-CLI")
set(CPACK_BUNDLE_NAME            "${CPACK_PACKAGE_NAME}")
set(CPACK_BUNDLE_PLIST           "${CMAKE_CURRENT_BINARY_DIR}/Info.plist")
set(CPACK_BUNDLE_ICON            "${PROJECT_SOURCE_DIR}/Installation/MacOSX/Bundle/icon.icns")
set(CPACK_BUNDLE_STARTUP_COMMAND "${PROJECT_SOURCE_DIR}/Installation/MacOSX/Bundle/arangodb-cli.sh")
configure_file("${PROJECT_SOURCE_DIR}/Installation/MacOSX/Bundle/Info.plist.in" "${CMAKE_CURRENT_BINARY_DIR}/Info.plist")

add_custom_target(copy_packages
  COMMAND cp *.dmg ${PACKAGE_TARGET_DIR})
