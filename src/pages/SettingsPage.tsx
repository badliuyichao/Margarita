import { useState, useEffect } from 'react'
import { useUiStore } from '../stores/uiStore'
import { isTauri } from '../api/mock'
import * as settingsApi from '../api/settings'

export default function SettingsPage() {
  const { language, setLanguage } = useUiStore()
  const [confirmClear, setConfirmClear] = useState('')
  const [message, setMessage] = useState('')
  const [dataPath, setDataPath] = useState('')

  useEffect(() => {
    if (isTauri()) {
      import('@tauri-apps/api/path').then(({ appDataDir }) => {
        appDataDir().then(setDataPath)
      })
    }
  }, [])

  const showMsg = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 5000)
  }

  const handleBackup = async () => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const path = await save({
        defaultPath: `margarita-backup-${new Date().toISOString().slice(0, 10)}.db`,
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      })
      if (path) {
        await settingsApi.backupData(path)
        showMsg('备份已保存到 ' + path)
      }
    } catch {
      showMsg('备份功能需要在 Tauri 环境中使用')
    }
  }

  const handleRestore = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const path = await open({
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
        multiple: false,
      })
      if (path) {
        if (!confirm('恢复备份将覆盖当前所有数据，确定继续？')) return
        await settingsApi.restoreData(path as string)
        showMsg('数据已恢复，建议重启应用')
      }
    } catch {
      showMsg('恢复功能需要在 Tauri 环境中使用')
    }
  }

  const handleClearData = async () => {
    if (confirmClear !== '确认清空') return
    if (!confirm('⚠️ 此操作不可撤销！所有物品、打卡记录、愿望清单将被永久删除。确定继续？')) return
    try {
      await settingsApi.clearAllData()
      setConfirmClear('')
      showMsg('所有数据已清空')
    } catch {
      showMsg('清空功能需要在 Tauri 环境中使用')
    }
  }

  const handleOpenDataDir = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('open_data_dir')
    } catch {
      // not available in mock
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">设置</h1>

      {/* Message toast */}
      {message && (
        <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>
      )}

      {/* Language */}
      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-700">语言 / Language</h2>
        <div className="flex gap-3">
          {[
            { key: 'zh-CN', label: '简体中文' },
            { key: 'zh-TW', label: '繁體中文' },
            { key: 'en', label: 'English' },
          ].map((lang) => (
            <button
              key={lang.key}
              onClick={() => setLanguage(lang.key)}
              className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                language === lang.key
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </section>

      {/* Currency */}
      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-700">默认货币</h2>
        <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm" defaultValue="CNY">
          <option value="CNY">人民币 (¥)</option>
          <option value="HKD">港币 (HK$)</option>
          <option value="TWD">新台币 (NT$)</option>
          <option value="USD">美元 ($)</option>
        </select>
      </section>

      {/* Data Management */}
      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-700">数据管理</h2>

        {dataPath && (
          <div className="mb-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
            <p className="mb-1 font-medium">数据存储位置</p>
            <p className="break-all font-mono">{dataPath}</p>
            <button
              onClick={handleOpenDataDir}
              className="mt-2 text-blue-500 hover:underline"
            >
              在文件管理器中打开
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-gray-600">备份所有数据（数据库 + 图片）</p>
            <button
              onClick={handleBackup}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              创建备份
            </button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="mb-2 text-sm text-gray-600">从备份恢复数据</p>
            <button
              onClick={handleRestore}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              恢复数据
            </button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="mb-2 text-sm text-red-500">清空所有数据（不可撤销）</p>
            <div className="flex gap-3">
              <input
                type="text"
                value={confirmClear}
                onChange={(e) => setConfirmClear(e.target.value)}
                placeholder='输入"确认清空"以启用按钮'
                className="rounded-lg border border-red-200 px-3 py-2 text-sm"
              />
              <button
                onClick={handleClearData}
                disabled={confirmClear !== '确认清空'}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-30"
              >
                清空数据
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Uninstall Guide */}
      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-700">卸载说明</h2>
        <ol className="list-inside list-decimal space-y-2 text-sm text-gray-600">
          <li>先在此页面「清空所有数据」删除个人数据</li>
          <li>打开 Windows 「设置 → 应用 → 已安装的应用」</li>
          <li>搜索「藏珠」或「Margarita」</li>
          <li>点击卸载</li>
        </ol>
        <p className="mt-3 text-xs text-gray-400">
          程序安装在 <code className="rounded bg-gray-100 px-1">%LocalAppData%\Programs\藏珠</code>，
          数据存储在 <code className="rounded bg-gray-100 px-1">%LocalAppData%\com.margarita.app</code>。
          卸载程序会自动清理安装目录。如未手动清空数据，卸载后数据目录可能残留，可手动删除。
        </p>
      </section>

      {/* About */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-gray-700">关于</h2>
        <p className="text-sm text-gray-400">藏珠 Margarita V0.1.0</p>
        <p className="text-xs text-gray-400">
          一款专注于个人实物资产管理与消费反思的跨平台桌面应用
        </p>
      </section>
    </div>
  )
}
