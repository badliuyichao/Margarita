use std::sync::Arc;
use tauri::State;
use crate::db::Database;
use crate::engine::{idle_detector, regret_ranker, depreciation};
use crate::utils::error::AppResult;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct IdleItem {
    pub id: String,
    pub name: String,
    pub category_id: Option<String>,
    pub purchase_price: Option<f64>,
    pub idle_days: u32,
    pub silent_cost: f64,
    pub idle_depreciation: f64,
    pub is_fixed_asset: bool,
}

#[derive(Debug, Serialize)]
pub struct IdleListResult {
    pub items: Vec<IdleItem>,
    pub total_silent_cost: f64,
    pub total_idle_depreciation: f64,
}

#[tauri::command]
pub fn get_idle_list(
    db: State<'_, Arc<Database>>,
    threshold_days: Option<u32>,
    only_fixed_asset: Option<bool>,
) -> AppResult<IdleListResult> {
    let threshold = threshold_days.unwrap_or(60);
    let only_fa = only_fixed_asset.unwrap_or(false);
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let conn = db.conn();

    let mut sql = String::from(
        "SELECT i.id, i.name, i.category_id, i.purchase_price, i.is_fixed_asset, \
         i.useful_life_years, i.residual_value, i.depreciation_method, i.purchase_date \
         FROM items i WHERE i.status = 'ACTIVE'"
    );
    if only_fa {
        sql.push_str(" AND i.is_fixed_asset = 1");
    }

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, Option<f64>>(3)?,
            row.get::<_, i32>(4)? != 0,
            row.get::<_, Option<i32>>(5)?,
            row.get::<_, Option<f64>>(6)?,
            row.get::<_, Option<String>>(7)?,
            row.get::<_, Option<String>>(8)?,
        ))
    })?;

    let mut result = Vec::new();
    let mut total_silent_cost = 0.0f64;
    let mut total_idle_depreciation = 0.0f64;

    for row in rows {
        let (id, name, cat_id, price, is_fa, life, residual, method, purchase_date) = row?;
        let price = price.unwrap_or(0.0);

        // Get last check-in date
        let last_check: Option<String> = conn.query_row(
            "SELECT check_date FROM checkins WHERE item_id = ?1 ORDER BY check_date DESC LIMIT 1",
            rusqlite::params![id],
            |r| r.get(0),
        ).ok();

        let daily_dep = if is_fa {
            if let (Some(ref pd), Some(life)) = (&purchase_date, life) {
                let residual = residual.unwrap_or(0.0);
                let method = method.as_deref().unwrap_or("LINEAR");
                let dep_result = depreciation::calculate(
                    price, residual, life as u32, method, pd, &today,
                );
                Some(dep_result.daily_depreciation)
            } else {
                None
            }
        } else {
            None
        };

        // Get total maintenance
        let total_maintenance: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM events WHERE item_id = ?1 AND event_type IN ('repair', 'maintenance')",
            rusqlite::params![id],
            |r| r.get(0),
        ).unwrap_or(0.0);

        let idle_result = idle_detector::detect(
            last_check.as_deref(),
            &today,
            threshold,
            price,
            total_maintenance,
            daily_dep,
        );

        if idle_result.is_idle {
            result.push(IdleItem {
                id,
                name,
                category_id: cat_id,
                purchase_price: Some(price),
                idle_days: idle_result.idle_days,
                silent_cost: idle_result.silent_cost,
                idle_depreciation: idle_result.idle_depreciation,
                is_fixed_asset: is_fa,
            });
            total_silent_cost += idle_result.silent_cost;
            total_idle_depreciation += idle_result.idle_depreciation;
        }
    }

    // Sort by idle days descending
    result.sort_by(|a, b| b.idle_days.cmp(&a.idle_days));

    Ok(IdleListResult {
        items: result,
        total_silent_cost: (total_silent_cost * 100.0).round() / 100.0,
        total_idle_depreciation: (total_idle_depreciation * 100.0).round() / 100.0,
    })
}

#[derive(Debug, Serialize)]
pub struct RegretItem {
    pub id: String,
    pub name: String,
    pub rating: Option<i32>,
    pub idle_days: u32,
    pub regret_score: f64,
    pub net_value_ratio: Option<f64>,
}

#[tauri::command]
pub fn get_regret_rank(db: State<'_, Arc<Database>>) -> AppResult<Vec<RegretItem>> {
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let conn = db.conn();

    let mut stmt = conn.prepare(
        "SELECT i.id, i.name, i.rating, i.purchase_price, i.is_fixed_asset, \
         i.useful_life_years, i.residual_value, i.depreciation_method, i.purchase_date \
         FROM items i WHERE i.status = 'ACTIVE' AND i.rating IS NOT NULL",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<i32>>(2)?,
            row.get::<_, Option<f64>>(3)?,
            row.get::<_, i32>(4)? != 0,
            row.get::<_, Option<i32>>(5)?,
            row.get::<_, Option<f64>>(6)?,
            row.get::<_, Option<String>>(7)?,
            row.get::<_, Option<String>>(8)?,
        ))
    })?;

    let mut result = Vec::new();

    for row in rows {
        let (id, name, rating, price, is_fa, life, residual, method, purchase_date) = row?;
        let price = price.unwrap_or(0.0);

        let last_check: Option<String> = conn.query_row(
            "SELECT check_date FROM checkins WHERE item_id = ?1 ORDER BY check_date DESC LIMIT 1",
            rusqlite::params![id],
            |r| r.get(0),
        ).ok();

        let idle_days = match last_check {
            Some(ref date_str) => {
                let last = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
                    .unwrap_or_else(|_| chrono::Utc::now().date_naive());
                let today_date = chrono::Utc::now().date_naive();
                (today_date - last).num_days().max(0) as u32
            }
            None => 365,
        };

        let net_value_ratio = if is_fa {
            purchase_date.as_ref().and_then(|pd| {
                life.map(|l| {
                    let r = residual.unwrap_or(0.0);
                    let m = method.as_deref().unwrap_or("LINEAR");
                    let dep = depreciation::calculate(price, r, l as u32, m, pd, &today);
                    if price > 0.0 { dep.current_net_value / price } else { 0.0 }
                })
            })
        } else {
            None
        };

        let regret_score = regret_ranker::calculate(rating, idle_days, net_value_ratio);

        result.push(RegretItem {
            id,
            name,
            rating,
            idle_days,
            regret_score,
            net_value_ratio,
        });
    }

    result.sort_by(|a, b| b.regret_score.partial_cmp(&a.regret_score).unwrap_or(std::cmp::Ordering::Equal));

    Ok(result)
}
