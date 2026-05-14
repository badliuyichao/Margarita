/// Calculate regret index (0-100), higher = more regret
///
/// Formula:
///   regret = (rating_inverse_norm * 0.3) + (idle_days_norm * 0.4) + (net_value_ratio_inverse * 0.3)
///   scaled to 0-100
///
/// - rating_inverse_norm: (5 - rating) / 4, unrated defaults to 0.5
/// - idle_days_norm: min(idle_days, 365) / 365
/// - net_value_ratio_inverse: 1 - net_value_ratio, non-fixed-asset defaults to 0.5
pub fn calculate(
    rating: Option<i32>,
    idle_days: u32,
    net_value_ratio: Option<f64>,  // current_net_value / purchase_price
) -> f64 {
    let rating_norm = match rating {
        Some(r) if (1..=5).contains(&r) => (5 - r) as f64 / 4.0,
        _ => 0.5, // default for unrated
    };

    let idle_norm = (idle_days.min(365) as f64) / 365.0;

    let net_value_norm = match net_value_ratio {
        Some(ratio) => (1.0 - ratio).clamp(0.0, 1.0),
        None => 0.5, // default for non-fixed-asset
    };

    let raw = rating_norm * 0.3 + idle_norm * 0.4 + net_value_norm * 0.3;
    (raw * 100.0 * 100.0).round() / 100.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_max_regret() {
        let score = calculate(Some(1), 365, Some(0.1));
        assert!(score > 80.0);
    }

    #[test]
    fn test_min_regret() {
        let score = calculate(Some(5), 0, Some(1.0));
        assert!(score < 20.0);
    }

    #[test]
    fn test_unrated_default() {
        let score = calculate(None, 180, None);
        assert!(score > 30.0 && score < 70.0);
    }
}
