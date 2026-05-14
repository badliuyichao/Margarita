use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::utils::error::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Wish {
    pub id: String,
    pub name: String,
    pub expected_price: Option<f64>,
    pub cooling_days: i32,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateWishInput {
    pub name: String,
    pub expected_price: Option<f64>,
    pub cooling_days: Option<i32>,
}

pub fn list_all(conn: &Connection) -> AppResult<Vec<Wish>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, expected_price, cooling_days, status, created_at FROM wishes ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Wish {
            id: row.get(0)?,
            name: row.get(1)?,
            expected_price: row.get(2)?,
            cooling_days: row.get(3)?,
            status: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::Database)
}

pub fn create(conn: &Connection, input: &CreateWishInput) -> AppResult<Wish> {
    let name = input.name.trim();
    if name.is_empty() || name.len() > 200 {
        return Err(AppError::Validation("Name must be 1-200 chars".into()));
    }
    let cooling_days = input.cooling_days.unwrap_or(7).clamp(1, 365);
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO wishes (id, name, expected_price, cooling_days, status, created_at) \
         VALUES (?1, ?2, ?3, ?4, 'COOLING', ?5)",
        rusqlite::params![id, name, input.expected_price, cooling_days, now],
    )?;

    Ok(Wish {
        id,
        name: name.to_string(),
        expected_price: input.expected_price,
        cooling_days,
        status: "COOLING".into(),
        created_at: now,
    })
}

pub fn update_status(conn: &Connection, id: &str, status: &str) -> AppResult<()> {
    let affected = conn.execute(
        "UPDATE wishes SET status = ?1 WHERE id = ?2",
        rusqlite::params![status, id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("Wish {id}")));
    }
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM wishes WHERE id = ?1", rusqlite::params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("Wish {id}")));
    }
    Ok(())
}
