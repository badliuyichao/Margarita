use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::utils::error::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: String,
    pub key: String,
    pub name: Option<String>,
    pub parent_id: Option<String>,
}

pub fn list_all(conn: &Connection) -> AppResult<Vec<Category>> {
    let mut stmt = conn.prepare("SELECT id, key, name, parent_id FROM categories ORDER BY key")?;
    let rows = stmt.query_map([], |row| {
        Ok(Category {
            id: row.get(0)?,
            key: row.get(1)?,
            name: row.get(2)?,
            parent_id: row.get(3)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::Database)
}

pub fn create(conn: &Connection, key: &str, name: Option<&str>, parent_id: Option<&str>) -> AppResult<Category> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO categories (id, key, name, parent_id) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, key, name, parent_id],
    )?;
    Ok(Category {
        id,
        key: key.to_string(),
        name: name.map(|s| s.to_string()),
        parent_id: parent_id.map(|s| s.to_string()),
    })
}

pub fn update(conn: &Connection, id: &str, key: &str, name: Option<&str>, parent_id: Option<&str>) -> AppResult<()> {
    let affected = conn.execute(
        "UPDATE categories SET key = ?1, name = ?2, parent_id = ?3 WHERE id = ?4",
        rusqlite::params![key, name, parent_id, id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("Category {id}")));
    }
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM categories WHERE id = ?1", rusqlite::params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("Category {id}")));
    }
    Ok(())
}

pub fn seed_presets(conn: &Connection) -> AppResult<()> {
    let presets = vec![
        ("electronics", "cat", None::<&str>),
        ("clothing", "cat", None),
        ("books", "cat", None),
        ("furniture", "cat", None),
        ("kitchen", "cat", None),
        ("sports", "cat", None),
        ("toys", "cat", None),
        ("stationery", "cat", None),
        ("tools", "cat", None),
        ("collectibles", "cat", None),
    ];
    for (key, prefix, parent) in &presets {
        let id = format!("{prefix}-{key}");
        conn.execute(
            "INSERT OR IGNORE INTO categories (id, key, name, parent_id) VALUES (?1, ?2, NULL, ?3)",
            rusqlite::params![id, key, parent],
        )?;
    }
    Ok(())
}
