/**
 * ============================================================
 * EmbedBlocks 自定义安装脚本 (Custom NSIS Script)
 * ============================================================
 * 
 * 本脚本通过 electron-builder 注入到 NSIS 安装器中工作。
 * 主要功能:
 * 1. 在安装路径选择页后增加一个“工作空间目录”选择页
 * 2. 将选中的路径保存到 Windows 注册表中
 * 3. 供软件首次运行（ConfigService）时读取
 */

!macro customHeader
  !include "nsDialogs.nsh"
!macroend

Var WorkspaceDir
Var WorkspaceDirHandle
Var WorkspacePageHandle

!macro customPage
  Page custom WorkspacePageShow WorkspacePageLeave
!macroend

Function WorkspacePageShow
  # 设置页面标题
  SendMessage $HWNDPARENT ${WM_SETTEXT} 0 "STR:EmbedBlocks Studio Setup - Workspace Configuration"
  
  nsDialogs::Create 1018
  Pop $WorkspacePageHandle

  ${If} $WorkspacePageHandle == error
    Abort
  ${EndIf}

  # 标题
  ${NSD_CreateLabel} 0 0 100% 12u "Select your default Workspace directory (where your projects will be saved):"
  Pop $0

  # 输入框：默认路径设置为用户文档下的 EmbedBlocks 文件夹
  ${NSD_CreateDirRequest} 0 20u 280u 12u "$DOCUMENTS\EmbedBlocks"
  Pop $WorkspaceDirHandle

  # 浏览按钮
  ${NSD_CreateButton} 285u 20u 15u 12u "..."
  Pop $0
  ${NSD_OnClick} $0 OnBrowseWorkspace

  # 说明文字
  ${NSD_CreateLabel} 0 45u 100% 30u "Note: You can change this later in the application settings. If you leave it as default, the application will create a directory in your Documents folder on first run."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function OnBrowseWorkspace
  nsDialogs::SelectFolderDialog "Select Workspace Directory" "$DOCUMENTS\EmbedBlocks"
  Pop $0
  ${If} $0 != "error"
    ${NSD_SetText} $WorkspaceDirHandle $0
  ${EndIf}
FunctionEnd

Function WorkspacePageLeave
  # 获取最终输入的路径
  ${NSD_GetText} $WorkspaceDirHandle $WorkspaceDir
  
  # 写入注册表供 Electron 主进程读取
  # 使用 HKCU (当前用户) 避免权限问题
  WriteRegStr HKCU "Software\EmbedBlocks" "WorkspacePath" $WorkspaceDir
FunctionEnd
