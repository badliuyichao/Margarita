use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::utils::error::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Space {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
}

pub fn list_all(conn: &Connection) -> AppResult<Vec<Space>> {
    let mut stmt = conn.prepare("SELECT id, name, parent_id FROM spaces ORDER BY name")?;
    let rows = stmt.query_map([], |row| {
        Ok(Space {
            id: row.get(0)?,
            name: row.get(1)?,
            parent_id: row.get(2)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::Database)
}

pub fn create(conn: &Connection, name: &str, parent_id: Option<&str>) -> AppResult<Space> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Validation("Space name cannot be empty".into()));
    }
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO spaces (id, name, parent_id) VALUES (?1, ?2, ?3)",
        rusqlite::params![id, name, parent_id],
    )?;
    Ok(Space {
        id,
        name: name.to_string(),
        parent_id: parent_id.map(|s| s.to_string()),
    })
}

pub fn update(conn: &Connection, id: &str, name: &str, parent_id: Option<&str>) -> AppResult<()> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Validation("Space name cannot be empty".into()));
    }
    let affected = conn.execute(
        "UPDATE spaces SET name = ?1, parent_id = ?2 WHERE id = ?3",
        rusqlite::params![name, parent_id, id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("Space {id}")));
    }
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM spaces WHERE id = ?1", rusqlite::params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("Space {id}")));
    }
    Ok(())
}
