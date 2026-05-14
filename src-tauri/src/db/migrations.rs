use rusqlite::Connection;

pub fn run(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            key TEXT NOT NULL UNIQUE,
            name TEXT,
            parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_key ON categories(key);

        CREATE TABLE IF NOT EXISTS spaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT REFERENCES spaces(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
            space_id TEXT REFERENCES spaces(id) ON DELETE SET NULL,
            purchase_date TEXT,
            purchase_price REAL,
            warranty_expiry TEXT,
            is_fixed_asset INTEGER NOT NULL DEFAULT 0,
            useful_life_years INTEGER,
            residual_value REAL,
            depreciation_method TEXT,
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            rating INTEGER,
            notes TEXT,
            estimated_value REAL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
        CREATE INDEX IF NOT EXISTS idx_items_space ON items(space_id);
        CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
        CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);

        CREATE TABLE IF NOT EXISTS item_images (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
            image_path TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_item_images_item ON item_images(item_id);

        CREATE TABLE IF NOT EXISTS checkins (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
            check_date TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_checkins_item ON checkins(item_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_item_date ON checkins(item_id, check_date);

        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
            event_type TEXT NOT NULL,
            description TEXT,
            amount REAL,
            occurred_at TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_events_item ON events(item_id);

        CREATE TABLE IF NOT EXISTS wishes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            expected_price REAL,
            cooling_days INTEGER NOT NULL DEFAULT 7,
            status TEXT NOT NULL DEFAULT 'COOLING',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS restraint_records (
            id TEXT PRIMARY KEY,
            wish_id TEXT NOT NULL REFERENCES wishes(id) ON DELETE CASCADE,
            decided_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        ",
    )?;
    Ok(())
}
