use std::sync::Arc;
use tauri::State;

use crate::db::Database;
use crate::db::{categories, spaces, items, checkins, events};
use crate::db::items::{CreateItemInput, ItemFilter};
use crate::db::events::CreateEventInput;
use crate::utils::error::AppResult;

// ─── Items ───

#[tauri::command]
pub fn get_items(
    db: State<'_, Arc<Database>>,
    search: Option<String>,
    category_id: Option<String>,
    space_id: Option<String>,
    status: Option<String>,
    is_fixed_asset: Option<bool>,
    page: Option<u32>,
    page_size: Option<u32>,
    sort_field: Option<String>,
    sort_order: Option<String>,
) -> AppResult<(Vec<items::Item>, u32)> {
    let filter = ItemFilter {
        search,
        category_id,
        space_id,
        status,
        is_fixed_asset,
        page,
        page_size,
        sort_field,
        sort_order,
    };
    let conn = db.conn();
    items::list(&conn, &filter)
}

#[tauri::command]
pub fn get_item(db: State<'_, Arc<Database>>, id: String) -> AppResult<items::Item> {
    let conn = db.conn();
    items::get_by_id(&conn, &id)
}

#[tauri::command]
pub fn add_item(db: State<'_, Arc<Database>>, input: CreateItemInput) -> AppResult<items::Item> {
    let conn = db.conn();
    items::create(&conn, &input)
}

#[tauri::command]
pub fn update_item(db: State<'_, Arc<Database>>, id: String, input: CreateItemInput) -> AppResult<items::Item> {
    let conn = db.conn();
    items::update(&conn, &id, &input)
}

#[tauri::command]
pub fn delete_item(db: State<'_, Arc<Database>>, id: String) -> AppResult<()> {
    let conn = db.conn();
    items::delete(&conn, &id)
}

#[tauri::command]
pub fn set_item_status(db: State<'_, Arc<Database>>, id: String, status: String) -> AppResult<items::Item> {
    let conn = db.conn();
    items::set_status(&conn, &id, &status)
}

// ─── Categories ───

#[tauri::command]
pub fn list_categories(db: State<'_, Arc<Database>>) -> AppResult<Vec<categories::Category>> {
    let conn = db.conn();
    categories::list_all(&conn)
}

#[tauri::command]
pub fn create_category(
    db: State<'_, Arc<Database>>,
    key: String,
    name: Option<String>,
    parent_id: Option<String>,
) -> AppResult<categories::Category> {
    let conn = db.conn();
    categories::create(&conn, &key, name.as_deref(), parent_id.as_deref())
}

// ─── Spaces ───

#[tauri::command]
pub fn list_spaces(db: State<'_, Arc<Database>>) -> AppResult<Vec<spaces::Space>> {
    let conn = db.conn();
    spaces::list_all(&conn)
}

#[tauri::command]
pub fn create_space(
    db: State<'_, Arc<Database>>,
    name: String,
    parent_id: Option<String>,
) -> AppResult<spaces::Space> {
    let conn = db.conn();
    spaces::create(&conn, &name, parent_id.as_deref())
}

// ─── Check-ins ───

#[tauri::command]
pub fn check_in(db: State<'_, Arc<Database>>, item_id: String, date: String) -> AppResult<checkins::CheckIn> {
    let conn = db.conn();
    checkins::check_in(&conn, &item_id, &date)
}

#[tauri::command]
pub fn get_checkins(db: State<'_, Arc<Database>>, item_id: String) -> AppResult<Vec<checkins::CheckIn>> {
    let conn = db.conn();
    checkins::get_by_item(&conn, &item_id)
}

// ─── Events ───

#[tauri::command]
pub fn add_event(db: State<'_, Arc<Database>>, input: CreateEventInput) -> AppResult<events::ItemEvent> {
    let conn = db.conn();
    events::create(&conn, &input)
}

#[tauri::command]
pub fn get_events(db: State<'_, Arc<Database>>, item_id: String) -> AppResult<Vec<events::ItemEvent>> {
    let conn = db.conn();
    events::get_by_item(&conn, &item_id)
}

// ─── Images (placeholder) ───

#[tauri::command]
pub fn get_item_images(db: State<'_, Arc<Database>>, item_id: String) -> AppResult<Vec<String>> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT image_path FROM item_images WHERE item_id = ?1 ORDER BY sort_order",
    )?;
    let rows = stmt.query_map(rusqlite::params![item_id], |row| row.get::<_, String>(0))?;
    let paths = rows.collect::<Result<Vec<_>, _>>()?;
    Ok(paths)
}
