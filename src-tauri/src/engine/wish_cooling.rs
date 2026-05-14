use chrono::{NaiveDate, NaiveDateTime, DateTime, Utc};

/// Cooling period state machine states
#[derive(Debug, PartialEq)]
pub enum WishStatus {
    Cooling,
    Evaluating,
    Purchased,
    Abandoned,
}

/// Determine the current status of a wish based on creation date and cooling days
pub fn determine_status(
    created_at: &str,
    cooling_days: i32,
    current_status: &str,
) -> WishStatus {
    // Already decided
    if current_status == "ABANDONED" || current_status == "RESTRAINED" {
        return WishStatus::Abandoned;
    }

    let created = NaiveDateTime::parse_from_str(created_at, "%Y-%m-%dT%H:%M:%S%.fZ")
        .or_else(|_| NaiveDateTime::parse_from_str(created_at, "%Y-%m-%dT%H:%M:%S%Z"))
        .or_else(|_| NaiveDateTime::parse_from_str(created_at, "%Y-%m-%d %H:%M:%S"))
        .unwrap_or_else(|_| Utc::now().naive_utc());

    let created_utc = DateTime::<Utc>::from_naive_utc_and_offset(created, Utc);
    let now = Utc::now();
    let elapsed = now - created_utc;
    let elapsed_days = elapsed.num_days();

    match current_status {
        "COOLING" if elapsed_days >= cooling_days as i64 => WishStatus::Evaluating,
        "COOLING" => WishStatus::Cooling,
        _ => WishStatus::Evaluating,
    }
}

/// Calculate remaining cooling days
pub fn remaining_cooling_days(created_at: &str, cooling_days: i32) -> i64 {
    let created = NaiveDateTime::parse_from_str(created_at, "%Y-%m-%dT%H:%M:%S%.fZ")
        .or_else(|_| NaiveDateTime::parse_from_str(created_at, "%Y-%m-%dT%H:%M:%S%Z"))
        .or_else(|_| NaiveDateTime::parse_from_str(created_at, "%Y-%m-%d %H:%M:%S"))
        .unwrap_or_else(|_| Utc::now().naive_utc());

    let created_utc = DateTime::<Utc>::from_naive_utc_and_offset(created, Utc);
    let now = Utc::now();
    let elapsed = now - created_utc;
    let elapsed_days = elapsed.num_days();

    (cooling_days as i64 - elapsed_days).max(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cooling_active() {
        let now = Utc::now().format("%Y-%m-%dT%H:%M:%S%.fZ").to_string();
        let status = determine_status(&now, 7, "COOLING");
        assert_eq!(status, WishStatus::Cooling);
    }

    #[test]
    fn test_abandoned() {
        let status = determine_status("2020-01-01T00:00:00Z", 7, "ABANDONED");
        assert_eq!(status, WishStatus::Abandoned);
    }
}
