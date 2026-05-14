import { invoke } from '@tauri-apps/api/core'

export async function getDbPath(): Promise<string> {
  return invoke<string>('get_db_path')
}

export async function backupData(targetPath: string): Promise<void> {
  return invoke<void>('backup_data', { targetPath })
}

export async function restoreData(sourcePath: string): Promise<void> {
  return invoke<void>('restore_data', { sourcePath })
}

export async function clearAllData(): Promise<void> {
  return invoke<void>('clear_all_data')
}
