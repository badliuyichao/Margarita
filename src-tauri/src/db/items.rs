use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::utils::error::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Item {
    pub id: String,
    pub name: String,
    pub category_id: Option<String>,
    pub space_id: Option<String>,
    pub purchase_date: Option<String>,
    pub purchase_price: Option<f64>,
    pub warranty_expiry: Option<String>,
    pub is_fixed_asset: bool,
    pub useful_life_years: Option<i32>,
    pub residual_value: Option<f64>,
    pub depreciation_method: Option<String>,
    pub status: String,
    pub rating: Option<i32>,
    pub notes: Option<String>,
    pub estimated_value: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct ItemFilter {
    pub search: Option<String>,
    pub category_id: Option<String>,
    pub space_id: Option<String>,
    pub status: Option<String>,
    pub is_fixed_asset: Option<bool>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub sort_field: Option<String>,
    pub sort_order: Option<String>,
}

pub fn list(conn: &Connection, filter: &ItemFilter) -> AppResult<(Vec<Item>, u32)> {
    let mut conditions = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref s) = filter.search {
        if !s.is_empty() {
            conditions.push(format!("name LIKE ?{}", params.len() + 1));
            params.push(Box::new(format!("%{s}%")));
        }
    }
    if let Some(ref c) = filter.category_id {
        conditions.push(format!("category_id = ?{}", params.len() + 1));
        params.push(Box::new(c.clone()));
    }
    if let Some(ref s) = filter.space_id {
        conditions.push(format!("space_id = ?{}", params.len() + 1));
        params.push(Box::new(s.clone()));
    }
    if let Some(ref s) = filter.status {
        conditions.push(format!("status = ?{}", params.len() + 1));
        params.push(Box::new(s.clone()));
    }
    if let Some(f) = filter.is_fixed_asset {
        conditions.push(format!("is_fixed_asset = ?{}", params.len() + 1));
        params.push(Box::new(f as i32));
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let count_sql = format!("SELECT COUNT(*) FROM items {where_clause}");
    let count: u32 = conn.query_row(&count_sql, rusqlite::params_from_iter(params.iter().map(|p| p.as_ref())), |r| r.get(0))?;

    let sort_field = filter.sort_field.as_deref().unwrap_or("created_at");
    let sort_order = filter.sort_order.as_deref().unwrap_or("desc");
    let allowed_sort = matches!(sort_field, "name" | "purchase_date" | "created_at" | "purchase_price");
    let sort_col = if allowed_sort { sort_field } else { "created_at" };
    let sort_dir = if sort_order == "asc" { "ASC" } else { "DESC" };

    let page = filter.page.unwrap_or(1).max(1);
    let page_size = filter.page_size.unwrap_or(50).min(200);
    let offset = (page - 1) * page_size;

    let sql = format!(
        "SELECT id, name, category_id, space_id, purchase_date, purchase_price, \
         warranty_expiry, is_fixed_asset, useful_life_years, residual_value, \
         depreciation_method, status, rating, notes, estimated_value, created_at, updated_at \
         FROM items {where_clause} ORDER BY {sort_col} {sort_dir} LIMIT ?{} OFFSET ?{}",
        params.len() + 1, params.len() + 2
    );
    params.push(Box::new(page_size as i64));
    params.push(Box::new(offset as i64));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(rusqlite::params_from_iter(params.iter().map(|p| p.as_ref())), |row| {
        Ok(Item {
            id: row.get(0)?,
            name: row.get(1)?,
            category_id: row.get(2)?,
            space_id: row.get(3)?,
            purchase_date: row.get(4)?,
            purchase_price: row.get(5)?,
            warranty_expiry: row.get(6)?,
            is_fixed_asset: row.get::<_, i32>(7)? != 0,
            useful_life_years: row.get(8)?,
            residual_value: row.get(9)?,
            depreciation_method: row.get(10)?,
            status: row.get(11)?,
            rating: row.get(12)?,
            notes: row.get(13)?,
            estimated_value: row.get(14)?,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
        })
    })?;

    let items = rows.collect::<Result<Vec<_>, _>>()?;
    Ok((items, count))
}

pub fn get_by_id(conn: &Connection, id: &str) -> AppResult<Item> {
    conn.query_row(
        "SELECT id, name, category_id, space_id, purchase_date, purchase_price, \
         warranty_expiry, is_fixed_asset, useful_life_years, residual_value, \
         depreciation_method, status, rating, notes, estimated_value, created_at, updated_at \
         FROM items WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok(Item {
                id: row.get(0)?,
                name: row.get(1)?,
                category_id: row.get(2)?,
                space_id: row.get(3)?,
                purchase_date: row.get(4)?,
                purchase_price: row.get(5)?,
                warranty_expiry: row.get(6)?,
                is_fixed_asset: row.get::<_, i32>(7)? != 0,
                useful_life_years: row.get(8)?,
                residual_value: row.get(9)?,
                depreciation_method: row.get(10)?,
                status: row.get(11)?,
                rating: row.get(12)?,
                notes: row.get(13)?,
                estimated_value: row.get(14)?,
                created_at: row.get(15)?,
                updated_at: row.get(16)?,
            })
        },
    ).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("Item {id}")),
        other => AppError::Database(other),
    })
}

pub fn create(conn: &Connection, input: &CreateItemInput) -> AppResult<Item> {
    let name = input.name.trim();
    if name.is_empty() || name.len() > 200 {
        return Err(AppError::Validation("Name must be 1-200 chars".into()));
    }
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO items (id, name, category_id, space_id, purchase_date, purchase_price, \
         warranty_expiry, is_fixed_asset, useful_life_years, residual_value, \
         depreciation_method, status, notes, estimated_value, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'ACTIVE', ?12, ?13, ?14, ?15)",
        rusqlite::params![
            id, name, input.category_id, input.space_id,
            input.purchase_date, input.purchase_price, input.warranty_expiry,
            input.is_fixed_asset as i32, input.useful_life_years, input.residual_value,
            input.depreciation_method, input.notes, input.estimated_value,
            now, now,
        ],
    )?;

    get_by_id(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &CreateItemInput) -> AppResult<Item> {
    let name = input.name.trim();
    if name.is_empty() || name.len() > 200 {
        return Err(AppError::Validation("Name must be 1-200 chars".into()));
    }
    let now = chrono::Utc::now().to_rfc3339();

    let affected = conn.execute(
        "UPDATE items SET name=?1, category_id=?2, space_id=?3, purchase_date=?4, \
         purchase_price=?5, warranty_expiry=?6, is_fixed_asset=?7, useful_life_years=?8, \
         residual_value=?9, depreciation_method=?10, notes=?11, estimated_value=?12, \
         updated_at=?13 WHERE id=?14",
        rusqlite::params![
            name, input.category_id, input.space_id,
            input.purchase_date, input.purchase_price, input.warranty_expiry,
            input.is_fixed_asset as i32, input.useful_life_years, input.residual_value,
            input.depreciation_method, input.notes, input.estimated_value,
            now, id,
        ],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("Item {id}")));
    }
    get_by_id(conn, id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM items WHERE id = ?1", rusqlite::params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("Item {id}")));
    }
    Ok(())
}

pub fn set_status(conn: &Connection, id: &str, status: &str) -> AppResult<Item> {
    let now = chrono::Utc::now().to_rfc3339();
    let affected = conn.execute(
        "UPDATE items SET status = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![status, now, id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("Item {id}")));
    }
    get_by_id(conn, id)
}

#[derive(Debug, Deserialize)]
pub struct CreateItemInput {
    pub name: String,
    pub category_id: Option<String>,
    pub space_id: Option<String>,
    pub purchase_date: Option<String>,
    pub purchase_price: Option<f64>,
    pub warranty_expiry: Option<String>,
    pub is_fixed_asset: bool,
    pub useful_life_years: Option<i32>,
    pub residual_value: Option<f64>,
    pub depreciation_method: Option<String>,
    pub notes: Option<String>,
    pub estimated_value: Option<f64>,
}
