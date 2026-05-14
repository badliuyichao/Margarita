mod commands;
mod db;
mod engine;
mod services;
mod utils;
#[cfg(test)]
mod tests;

use db::Database;
use tauri::Manager;
use std::sync::Arc;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).ok();
            let images_dir = app_data_dir.join("images");
            std::fs::create_dir_all(&images_dir).ok();
            let db = Database::new(&app_data_dir.join("margarita.db"))
                .expect("failed to initialize database");
            app.manage(Arc::new(db));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Phase 1: Items, categories, spaces, check-ins, events
            commands::items::get_items,
            commands::items::get_item,
            commands::items::add_item,
            commands::items::update_item,
            commands::items::delete_item,
            commands::items::set_item_status,
            commands::items::list_categories,
            commands::items::create_category,
            commands::items::list_spaces,
            commands::items::create_space,
            commands::items::check_in,
            commands::items::get_checkins,
            commands::items::add_event,
            commands::items::get_events,
            commands::items::get_item_images,
            // Phase 3: Dashboard & insights
            commands::dashboard::get_dashboard_data,
            commands::insights::get_idle_list,
            commands::insights::get_regret_rank,
            // Phase 4: Decision support
            commands::decide::find_idle_items_match,
            // Phase 5: Settings & data management
            commands::settings::get_db_path,
            commands::settings::backup_data,
            commands::settings::restore_data,
            commands::settings::clear_all_data,
            commands::settings::open_data_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
