use std::sync::Arc;
use tauri::State;
use crate::db::Database;
use crate::engine::idle_detector;
use crate::utils::error::AppResult;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct MatchResult {
    pub items: Vec<MatchItem>,
    pub total_price: f64,
    pub total_depreciation: f64,
    pub total_net_value: f64,
}

#[derive(Debug, Serialize)]
pub struct MatchItem {
    pub id: String,
    pub name: String,
    pub purchase_price: f64,
    pub idle_days: u32,
    pub current_net_value: Option<f64>,
    pub accumulated_depreciation: Option<f64>,
}

#[tauri::command]
pub fn find_idle_items_match(
    db: State<'_, Arc<Database>>,
    target_price: f64,
) -> AppResult<Option<MatchResult>> {
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let conn = db.conn();

    // Get all idle, non-retired items
    let mut stmt = conn.prepare(
        "SELECT id, name, purchase_price FROM items WHERE status = 'ACTIVE'",
    )?;

    let items: Vec<(String, String, f64)> = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<f64>>(2)?.unwrap_or(0.0),
        ))
    })?.filter_map(|r| r.ok()).collect();

    // Simple greedy algorithm: find items with total price within ±10% of target
    let lower = target_price * 0.9;
    let upper = target_price * 1.1;

    // Try single item first
    for (id, name, price) in &items {
        if *price >= lower && *price <= upper {
            return Ok(Some(MatchResult {
                items: vec![MatchItem {
                    id: id.clone(),
                    name: name.clone(),
                    purchase_price: *price,
                    idle_days: 0,
                    current_net_value: None,
                    accumulated_depreciation: None,
                }],
                total_price: *price,
                total_depreciation: 0.0,
                total_net_value: *price,
            }));
        }
    }

    // Try two-item combinations
    for i in 0..items.len() {
        for j in (i + 1)..items.len() {
            let total = items[i].2 + items[j].2;
            if total >= lower && total <= upper {
                return Ok(Some(MatchResult {
                    items: vec![
                        MatchItem {
                            id: items[i].0.clone(),
                            name: items[i].1.clone(),
                            purchase_price: items[i].2,
                            idle_days: 0,
                            current_net_value: None,
                            accumulated_depreciation: None,
                        },
                        MatchItem {
                            id: items[j].0.clone(),
                            name: items[j].1.clone(),
                            purchase_price: items[j].2,
                            idle_days: 0,
                            current_net_value: None,
                            accumulated_depreciation: None,
                        },
                    ],
                    total_price: (total * 100.0).round() / 100.0,
                    total_depreciation: 0.0,
                    total_net_value: (total * 100.0).round() / 100.0,
                }));
            }
        }
    }

    Ok(None)
}
