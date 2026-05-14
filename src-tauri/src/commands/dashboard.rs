use std::sync::Arc;
use tauri::State;
use crate::db::Database;
use crate::engine::depreciation;
use crate::utils::error::AppResult;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct DashboardData {
    pub total_items: u32,
    pub total_value: f64,
    pub total_net_value: f64,
    pub monthly_depreciation: f64,
}

#[tauri::command]
pub fn get_dashboard_data(db: State<'_, Arc<Database>>) -> AppResult<DashboardData> {
    let conn = db.conn();
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    let total_items: u32 = conn.query_row(
        "SELECT COUNT(*) FROM items WHERE status = 'ACTIVE'",
        [],
        |r| r.get(0),
    )?;

    let total_value: f64 = conn.query_row(
        "SELECT COALESCE(SUM(purchase_price), 0) FROM items WHERE status = 'ACTIVE'",
        [],
        |r| r.get(0),
    )?;

    let mut total_net_value = 0.0f64;
    let mut monthly_depreciation = 0.0f64;

    let mut stmt = conn.prepare(
        "SELECT purchase_price, residual_value, useful_life_years, depreciation_method, purchase_date \
         FROM items WHERE status = 'ACTIVE' AND is_fixed_asset = 1",
    )?;

    let fixed_assets = stmt.query_map([], |row| {
        Ok((
            row.get::<_, Option<f64>>(0)?,
            row.get::<_, Option<f64>>(1)?,
            row.get::<_, Option<i32>>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, Option<String>>(4)?,
        ))
    })?;

    for asset in fixed_assets {
        if let Ok((Some(price), residual, Some(life), method, purchase_date)) = asset {
            if let Some(ref pd) = purchase_date {
                let residual = residual.unwrap_or(0.0);
                let method = method.as_deref().unwrap_or("LINEAR");
                let result = depreciation::calculate(
                    price, residual, life as u32, method, pd, &today,
                );
                total_net_value += price - result.total_depreciation;
                monthly_depreciation += result.daily_depreciation * 30.0;
            } else {
                total_net_value += price;
            }
        }
    }

    // Add non-fixed-asset items at their purchase price
    let non_fixed_value: f64 = conn.query_row(
        "SELECT COALESCE(SUM(purchase_price), 0) FROM items WHERE status = 'ACTIVE' AND (is_fixed_asset = 0 OR is_fixed_asset IS NULL)",
        [],
        |r| r.get(0),
    )?;
    total_net_value += non_fixed_value;

    Ok(DashboardData {
        total_items,
        total_value: (total_value * 100.0).round() / 100.0,
        total_net_value: (total_net_value * 100.0).round() / 100.0,
        monthly_depreciation: (monthly_depreciation * 100.0).round() / 100.0,
    })
}
