CreateObject("WScript.Shell").Run "explorer.exe """ & CreateObject("Scripting.FileSystemObject").GetAbsolutePathName(WScript.ScriptFullName) & "\..\admin.html"""
