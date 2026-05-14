#[cfg(test)]
mod tests {
    use rusqlite::Connection;

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "PRAGMA foreign_keys=ON;
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, name TEXT,
                parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL
            );
            CREATE TABLE IF NOT EXISTS spaces (
                id TEXT PRIMARY KEY, name TEXT NOT NULL,
                parent_id TEXT REFERENCES spaces(id) ON DELETE SET NULL
            );
            CREATE TABLE IF NOT EXISTS items (
                id TEXT PRIMARY KEY, name TEXT NOT NULL,
                category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
                space_id TEXT REFERENCES spaces(id) ON DELETE SET NULL,
                purchase_date TEXT, purchase_price REAL, warranty_expiry TEXT,
                is_fixed_asset INTEGER NOT NULL DEFAULT 0,
                useful_life_years INTEGER, residual_value REAL,
                depreciation_method TEXT, status TEXT NOT NULL DEFAULT 'ACTIVE',
                rating INTEGER, notes TEXT, estimated_value REAL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS checkins (
                id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
                check_date TEXT NOT NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_item_date ON checkins(item_id, check_date);
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
                event_type TEXT NOT NULL, description TEXT, amount REAL,
                occurred_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS wishes (
                id TEXT PRIMARY KEY, name TEXT NOT NULL,
                expected_price REAL, cooling_days INTEGER NOT NULL DEFAULT 7,
                status TEXT NOT NULL DEFAULT 'COOLING',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS restraint_records (
                id TEXT PRIMARY KEY,
                wish_id TEXT NOT NULL REFERENCES wishes(id) ON DELETE CASCADE,
                decided_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            INSERT INTO categories (id, key, name) VALUES ('cat-test', 'test', 'Test Category');
            INSERT INTO spaces (id, name) VALUES ('sp-test', 'Test Space');
            ",
        )
        .unwrap();
        conn
    }

    fn create_item(conn: &Connection, name: &str, price: f64, is_fa: bool) -> String {
        let id = format!("item-{}-{}", name, std::time::Instant::now().elapsed().as_nanos());
        conn.execute(
            "INSERT INTO items (id, name, purchase_price, is_fixed_asset, status) VALUES (?1, ?2, ?3, ?4, 'ACTIVE')",
            rusqlite::params![id, name, price, is_fa as i32],
        )
        .unwrap();
        id
    }

    #[test]
    fn test_create_and_get_item() {
        let conn = setup_db();
        let id = create_item(&conn, "测试物品", 1000.0, false);

        let (name, price): (String, f64) = conn
            .query_row(
                "SELECT name, purchase_price FROM items WHERE id = ?1",
                rusqlite::params![id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();

        assert_eq!(name, "测试物品");
        assert_eq!(price, 1000.0);
    }

    #[test]
    fn test_item_status_transition() {
        let conn = setup_db();
        let id = create_item(&conn, "Active Item", 500.0, false);

        conn.execute(
            "UPDATE items SET status = 'RETIRED' WHERE id = ?1",
            rusqlite::params![id],
        )
        .unwrap();

        let status: String = conn
            .query_row("SELECT status FROM items WHERE id = ?1", rusqlite::params![id], |r| {
                r.get(0)
            })
            .unwrap();

        assert_eq!(status, "RETIRED");
    }

    #[test]
    fn test_active_items_exclude_retired() {
        let conn = setup_db();
        create_item(&conn, "Active A", 100.0, false);
        let retired_id = create_item(&conn, "To Retire", 200.0, false);

        conn.execute(
            "UPDATE items SET status = 'RETIRED' WHERE id = ?1",
            rusqlite::params![retired_id],
        )
        .unwrap();

        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM items WHERE status = 'ACTIVE'",
                [],
                |r| r.get(0),
            )
            .unwrap();

        assert_eq!(count, 1);
    }

    #[test]
    fn test_fixed_asset_fields() {
        let conn = setup_db();
        let id = format!("fa-{}", std::time::Instant::now().elapsed().as_nanos());

        conn.execute(
            "INSERT INTO items (id, name, purchase_price, is_fixed_asset, useful_life_years, residual_value, depreciation_method)
             VALUES (?1, 'Fixed Asset', 5000.0, 1, 5, 500.0, 'LINEAR')",
            rusqlite::params![id],
        )
        .unwrap();

        let (is_fa, life, residual, method): (i32, i32, f64, String) = conn
            .query_row(
                "SELECT is_fixed_asset, useful_life_years, residual_value, depreciation_method FROM items WHERE id = ?1",
                rusqlite::params![id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
            )
            .unwrap();

        assert_eq!(is_fa, 1);
        assert_eq!(life, 5);
        assert_eq!(residual, 500.0);
        assert_eq!(method, "LINEAR");
    }

    #[test]
    fn test_checkin_unique_per_day() {
        let conn = setup_db();
        let item_id = create_item(&conn, "Checkin Item", 100.0, false);

        conn.execute(
            "INSERT INTO checkins (id, item_id, check_date) VALUES ('ci1', ?1, '2026-05-13')",
            rusqlite::params![item_id],
        )
        .unwrap();

        let result = conn.execute(
            "INSERT INTO checkins (id, item_id, check_date) VALUES ('ci2', ?1, '2026-05-13')",
            rusqlite::params![item_id],
        );

        assert!(result.is_err(), "Should reject duplicate check-in on same day");
    }

    #[test]
    fn test_event_maintenance_amount() {
        let conn = setup_db();
        let item_id = create_item(&conn, "Event Item", 200.0, false);

        conn.execute(
            "INSERT INTO events (id, item_id, event_type, description, amount, occurred_at)
             VALUES ('ev1', ?1, 'maintenance', 'Repair', 150.0, '2026-05-01')",
            rusqlite::params![item_id],
        )
        .unwrap();

        let total: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0) FROM events WHERE item_id = ?1 AND event_type IN ('repair', 'maintenance')",
                rusqlite::params![item_id],
                |r| r.get(0),
            )
            .unwrap();

        assert_eq!(total, 150.0);
    }

    #[test]
    fn test_wish_cooling_creation() {
        let conn = setup_db();

        conn.execute(
            "INSERT INTO wishes (id, name, expected_price, cooling_days, status) VALUES ('w1', 'New Item', 500.0, 7, 'COOLING')",
            [],
        )
        .unwrap();

        let (name, days, status): (String, i32, String) = conn
            .query_row(
                "SELECT name, cooling_days, status FROM wishes WHERE id = 'w1'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .unwrap();

        assert_eq!(name, "New Item");
        assert_eq!(days, 7);
        assert_eq!(status, "COOLING");
    }

    #[test]
    fn test_category_preset_seeding() {
        let conn = setup_db();

        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM categories", [], |r| r.get(0))
            .unwrap();

        assert!(count >= 1, "Should have at least the test preset category");
    }

    #[test]
    fn test_space_hierarchy() {
        let conn = setup_db();

        conn.execute(
            "INSERT INTO spaces (id, name, parent_id) VALUES ('sp-parent', 'Parent', NULL)",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO spaces (id, name, parent_id) VALUES ('sp-child', 'Child', 'sp-parent')",
            [],
        )
        .unwrap();

        let parent_of_child: String = conn
            .query_row(
                "SELECT parent_id FROM spaces WHERE id = 'sp-child'",
                [],
                |r| r.get(0),
            )
            .unwrap();

        assert_eq!(parent_of_child, "sp-parent");
    }
}
