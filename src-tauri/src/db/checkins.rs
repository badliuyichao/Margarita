use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::utils::error::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CheckIn {
    pub id: String,
    pub item_id: String,
    pub check_date: String,
}

pub fn check_in(conn: &Connection, item_id: &str, date: &str) -> AppResult<CheckIn> {
    let exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM checkins WHERE item_id = ?1 AND check_date = ?2",
        rusqlite::params![item_id, date],
        |r| r.get(0),
    )?;
    if exists {
        return Err(AppError::Validation("Already checked in today".into()));
    }

    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO checkins (id, item_id, check_date) VALUES (?1, ?2, ?3)",
        rusqlite::params![id, item_id, date],
    )?;
    Ok(CheckIn {
        id,
        item_id: item_id.to_string(),
        check_date: date.to_string(),
    })
}

pub fn get_by_item(conn: &Connection, item_id: &str) -> AppResult<Vec<CheckIn>> {
    let mut stmt = conn.prepare(
        "SELECT id, item_id, check_date FROM checkins WHERE item_id = ?1 ORDER BY check_date DESC",
    )?;
    let rows = stmt.query_map(rusqlite::params![item_id], |row| {
        Ok(CheckIn {
            id: row.get(0)?,
            item_id: row.get(1)?,
            check_date: row.get(2)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::Database)
}

pub fn get_last_check_date(conn: &Connection, item_id: &str) -> AppResult<Option<String>> {
    conn.query_row(
        "SELECT check_date FROM checkins WHERE item_id = ?1 ORDER BY check_date DESC LIMIT 1",
        rusqlite::params![item_id],
        |r| r.get(0),
    )
    .map(Some)
    .or_else(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => Ok(None),
        other => Err(AppError::Database(other)),
    })
}

pub fn get_check_dates_between(
    conn: &Connection,
    item_id: &str,
    from: &str,
    to: &str,
) -> AppResult<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT check_date FROM checkins WHERE item_id = ?1 AND check_date >= ?2 AND check_date <= ?3",
    )?;
    let rows = stmt.query_map(rusqlite::params![item_id, from, to], |row| row.get(0))?;
    rows.collect::<Result<Vec<String>, _>>().map_err(AppError::Database)
}
