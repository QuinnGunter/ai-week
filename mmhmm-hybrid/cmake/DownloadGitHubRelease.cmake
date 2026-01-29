function(DownloadGitHubRelease download_dir github_repo tag asset)

  set(GITHUB_REPO "${github_repo}")
  set(RELEASE_TAG "${tag}")
  set(ASSET_NAME "${asset}")  # Specific asset name to download
  string(REPLACE "/" "\\\\" DOWNLOAD_DIR ${download_dir})
  
  message(STATUS "Downloading ${GITHUB_REPO} redistributable files...")
  
  if(NOT IS_DIRECTORY "${DOWNLOAD_DIR}")
    # Execute the gh download command, you must set gh cli before
    execute_process(
	  COMMAND gh release download ${RELEASE_TAG} -R ${GITHUB_REPO} -D ${DOWNLOAD_DIR} -p ${ASSET_NAME}
	  RESULT_VARIABLE result
	  OUTPUT_VARIABLE output
	  ERROR_VARIABLE error
    )
	  
    if(NOT result EQUAL "0")
      message(FATAL_ERROR "Failed to download ${GITHUB_REPO} release result: ${result}, error: ${error}")
    endif()
	
    message(STATUS "Extracting ${GITHUB_REPO} redistributable files...")
	
    execute_process(
      COMMAND ${CMAKE_COMMAND} -E tar xzf "${DOWNLOAD_DIR}/${ASSET_NAME}"
      WORKING_DIRECTORY ${DOWNLOAD_DIR}
      )
	
  endif()
endfunction()
