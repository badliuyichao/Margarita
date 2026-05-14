use std::sync::Arc;
use tauri::{Manager, State};
use crate::db::Database;
use crate::utils::error::{AppError, AppResult};

#[tauri::command]
pub fn get_db_path(db: State<'_, Arc<Database>>) -> AppResult<String> {
    Ok("margarita.db in app data directory".to_string())
}

#[tauri::command]
pub fn open_data_dir(app: tauri::AppHandle) -> AppResult<()> {
    let data_dir = app.path().app_data_dir().map_err(|e| AppError::Validation(e.to_string()))?;
    open::that(data_dir).map_err(AppError::Io)?;
    Ok(())
}

#[tauri::command]
pub fn backup_data(
    db: State<'_, Arc<Database>>,
    target_path: String,
) -> AppResult<()> {
    let conn = db.conn();
    // Backup SQLite database
    conn.execute("VACUUM INTO ?1", rusqlite::params![target_path])
        .map_err(AppError::Database)?;
    Ok(())
}

#[tauri::command]
pub fn restore_data(
    db: State<'_, Arc<Database>>,
    source_path: String,
) -> AppResult<()> {
    // Close current database, replace file, reopen
    // V1.0: basic file copy approach
    let conn = db.conn();
    // Verify source is valid SQLite
    let backup = rusqlite::Connection::open(&source_path)
        .map_err(|_| AppError::Validation("Invalid backup file".into()))?;
    backup.close().ok();

    // Drop all current data and restore from backup
    conn.execute_batch("PRAGMA foreign_keys=OFF;")?;
    // Attach backup and copy tables
    conn.execute(
        "ATTACH DATABASE ?1 AS backup",
        rusqlite::params![source_path],
    )?;
    let tables = ["categories", "spaces", "items", "item_images", "checkins", "events", "wishes", "restraint_records"];
    for table in &tables {
        conn.execute(&format!("DELETE FROM {table}"), [])?;
        conn.execute(
            &format!("INSERT INTO {table} SELECT * FROM backup.{table}"),
            [],
        )?;
    }
    conn.execute("DETACH DATABASE backup", [])?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;

    Ok(())
}

#[tauri::command]
pub fn clear_all_data(db: State<'_, Arc<Database>>) -> AppResult<()> {
    let conn = db.conn();
    conn.execute_batch(
        "PRAGMA foreign_keys=OFF;
         DELETE FROM events;
         DELETE FROM checkins;
         DELETE FROM item_images;
         DELETE FROM items;
         DELETE FROM wishes;
         DELETE FROM restraint_records;
         DELETE FROM spaces;
         DELETE FROM categories;
         PRAGMA foreign_keys=ON;",
    )?;
    crate::db::categories::seed_presets(&conn).ok();
    Ok(())
}
