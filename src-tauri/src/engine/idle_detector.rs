use chrono::NaiveDate;

#[derive(Debug, Clone)]
pub struct IdleResult {
    pub is_idle: bool,
    pub idle_days: u32,
    pub silent_cost: f64,  // total investment (purchase_price + maintenance_cost)
    pub idle_depreciation: f64,  // depreciation during idle period
}

/// Detect if an item is idle (no check-in for >= threshold days)
///
/// idle_days = current_date - last_check_date
/// is_idle = idle_days >= threshold
/// silent_cost = purchase_price + total_maintenance
/// idle_depreciation = daily_depreciation * idle_days (only for fixed assets)
pub fn detect(
    last_check_date: Option<&str>,
    current_date: &str,
    threshold_days: u32,
    purchase_price: f64,
    total_maintenance: f64,
    daily_depreciation: Option<f64>,
) -> IdleResult {
    let today = NaiveDate::parse_from_str(current_date, "%Y-%m-%d")
        .unwrap_or_else(|_| chrono::Utc::now().date_naive());

    let idle_days = match last_check_date {
        Some(date_str) => {
            let last = NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
                .unwrap_or(today);
            (today - last).num_days().max(0) as u32
        }
        None => {
            // Never checked in - use days since purchase or max
            365 // default: if never checked in, assume quite idle
        }
    };

    let is_idle = idle_days >= threshold_days;
    let silent_cost = purchase_price + total_maintenance;
    let idle_depreciation = daily_depreciation
        .map(|dd| (dd * idle_days as f64 * 100.0).round() / 100.0)
        .unwrap_or(0.0);

    IdleResult {
        is_idle,
        idle_days,
        silent_cost: (silent_cost * 100.0).round() / 100.0,
        idle_depreciation: (idle_depreciation * 100.0).round() / 100.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_idle_detection() {
        let result = detect(Some("2026-01-01"), "2026-05-01", 60, 1000.0, 200.0, Some(0.5));
        assert!(result.is_idle);
        assert!(result.idle_days >= 60);
        assert_eq!(result.silent_cost, 1200.0);
    }

    #[test]
    fn test_not_idle() {
        let result = detect(Some("2026-04-20"), "2026-05-01", 60, 500.0, 0.0, None);
        assert!(!result.is_idle);
    }
}
