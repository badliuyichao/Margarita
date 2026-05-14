use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::utils::error::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ItemEvent {
    pub id: String,
    pub item_id: String,
    pub event_type: String,
    pub description: Option<String>,
    pub amount: Option<f64>,
    pub occurred_at: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateEventInput {
    pub item_id: String,
    pub event_type: String,
    pub description: Option<String>,
    pub amount: Option<f64>,
    pub occurred_at: String,
}

pub fn create(conn: &Connection, input: &CreateEventInput) -> AppResult<ItemEvent> {
    let valid_types = ["repair", "maintenance", "lend_out", "retire", "other"];
    if !valid_types.contains(&input.event_type.as_str()) {
        return Err(AppError::Validation(format!("Invalid event type: {}", input.event_type)));
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO events (id, item_id, event_type, description, amount, occurred_at, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            id, input.item_id, input.event_type,
            input.description, input.amount, input.occurred_at, now,
        ],
    )?;

    Ok(ItemEvent {
        id,
        item_id: input.item_id.clone(),
        event_type: input.event_type.clone(),
        description: input.description.clone(),
        amount: input.amount,
        occurred_at: input.occurred_at.clone(),
        created_at: now,
    })
}

pub fn get_by_item(conn: &Connection, item_id: &str) -> AppResult<Vec<ItemEvent>> {
    let mut stmt = conn.prepare(
        "SELECT id, item_id, event_type, description, amount, occurred_at, created_at \
         FROM events WHERE item_id = ?1 ORDER BY occurred_at DESC",
    )?;
    let rows = stmt.query_map(rusqlite::params![item_id], |row| {
        Ok(ItemEvent {
            id: row.get(0)?,
            item_id: row.get(1)?,
            event_type: row.get(2)?,
            description: row.get(3)?,
            amount: row.get(4)?,
            occurred_at: row.get(5)?,
            created_at: row.get(6)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::Database)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM events WHERE id = ?1", rusqlite::params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("Event {id}")));
    }
    Ok(())
}
