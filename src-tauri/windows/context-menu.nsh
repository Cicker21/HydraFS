!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr HKCU "Software\Classes\*\shell\HydraFS.Open" "" "Abrir con HydraFS"
  WriteRegStr HKCU "Software\Classes\*\shell\HydraFS.Open" "Icon" "$INSTDIR\hydrafs_tools.exe"
  WriteRegStr HKCU "Software\Classes\*\shell\HydraFS.Open\command" "" '"$INSTDIR\hydrafs_tools.exe" --hydrafs-open "%1"'

  WriteRegStr HKCU "Software\Classes\.hfs" "" "HydraFS.HFS"
  WriteRegStr HKCU "Software\Classes\HydraFS.HFS" "" "HydraFS encrypted file"
  WriteRegStr HKCU "Software\Classes\HydraFS.HFS\DefaultIcon" "" "$INSTDIR\hydrafs_tools.exe,0"
  WriteRegStr HKCU "Software\Classes\HydraFS.HFS\shell\open\command" "" '"$INSTDIR\hydrafs_tools.exe" --hydrafs-open "%1"'

  WriteRegStr HKCU "Software\Classes\Directory\shell\HydraFS.Open" "" "Abrir con HydraFS"
  WriteRegStr HKCU "Software\Classes\Directory\shell\HydraFS.Open" "Icon" "$INSTDIR\hydrafs_tools.exe"
  WriteRegStr HKCU "Software\Classes\Directory\shell\HydraFS.Open\command" "" '"$INSTDIR\hydrafs_tools.exe" --hydrafs-open "%1"'

  WriteRegStr HKCU "Software\Classes\Folder\shell\HydraFS.Open" "" "Abrir con HydraFS"
  WriteRegStr HKCU "Software\Classes\Folder\shell\HydraFS.Open" "Icon" "$INSTDIR\hydrafs_tools.exe"
  WriteRegStr HKCU "Software\Classes\Folder\shell\HydraFS.Open\command" "" '"$INSTDIR\hydrafs_tools.exe" --hydrafs-open "%1"'

  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\HydraFS.Open" "" "Abrir con HydraFS"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\HydraFS.Open" "Icon" "$INSTDIR\hydrafs_tools.exe"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\HydraFS.Open\command" "" '"$INSTDIR\hydrafs_tools.exe" --hydrafs-open "%V"'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DeleteRegKey HKCU "Software\Classes\*\shell\HydraFS.Open"
  DeleteRegKey HKCU "Software\Classes\.hfs"
  DeleteRegKey HKCU "Software\Classes\HydraFS.HFS"
  DeleteRegKey HKCU "Software\Classes\Directory\shell\HydraFS.Open"
  DeleteRegKey HKCU "Software\Classes\Folder\shell\HydraFS.Open"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\HydraFS.Open"
!macroend
