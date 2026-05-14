use chrono::{NaiveDate, Datelike};

#[derive(Debug, Clone)]
pub struct DepreciationResult {
    pub total_depreciation: f64,
    pub current_net_value: f64,
    pub daily_depreciation: f64,
    pub days_depreciated: u32,
    pub is_maintenance_period: bool,
    pub total_days: u32,
}

const DAYS_PER_YEAR: u32 = 365;

/// Calculate straight-line depreciation
///
/// daily = (purchase_price - residual_value) / (useful_life_years * 365)
/// After useful_life_years * 365 days, depreciation stops and enters maintenance period
pub fn straight_line(
    purchase_price: f64,
    residual_value: f64,
    useful_life_years: u32,
    purchase_date: &str,
    calculation_date: &str,
) -> DepreciationResult {
    let total_days = useful_life_years * DAYS_PER_YEAR;
    let depreciable_amount = (purchase_price - residual_value).max(0.0);
    let daily_depreciation = if total_days > 0 {
        (depreciable_amount / total_days as f64 * 100.0).round() / 100.0
    } else {
        0.0
    };

    let purchase = NaiveDate::parse_from_str(purchase_date, "%Y-%m-%d").unwrap_or(
        NaiveDate::from_ymd_opt(2000, 1, 1).unwrap(),
    );
    let calc = NaiveDate::parse_from_str(calculation_date, "%Y-%m-%d").unwrap_or(
        chrono::Utc::now().date_naive(),
    );

    let days_since_purchase = (calc - purchase).num_days().max(0) as u32;
    let days_depreciated = days_since_purchase.min(total_days);
    let total_depreciation = (daily_depreciation * days_depreciated as f64 * 100.0).round() / 100.0;
    let current_net_value = (purchase_price - total_depreciation).max(residual_value);
    let is_maintenance_period = days_since_purchase >= total_days;

    DepreciationResult {
        total_depreciation: (total_depreciation * 100.0).round() / 100.0,
        current_net_value: (current_net_value * 100.0).round() / 100.0,
        daily_depreciation,
        days_depreciated,
        is_maintenance_period,
        total_days,
    }
}

/// Accelerated depreciation using double-declining balance method
///
/// Yearly rate = 2 / useful_life_years
/// For the first (useful_life_years - 2) years: use DDB
/// For the last 2 years: switch to straight-line on remaining value
pub fn accelerated(
    purchase_price: f64,
    residual_value: f64,
    useful_life_years: u32,
    purchase_date: &str,
    calculation_date: &str,
) -> DepreciationResult {
    if useful_life_years == 0 {
        return DepreciationResult {
            total_depreciation: 0.0,
            current_net_value: purchase_price,
            daily_depreciation: 0.0,
            days_depreciated: 0,
            is_maintenance_period: false,
            total_days: 0,
        };
    }

    let total_days = useful_life_years * DAYS_PER_YEAR;
    let purchase = NaiveDate::parse_from_str(purchase_date, "%Y-%m-%d").unwrap_or(
        NaiveDate::from_ymd_opt(2000, 1, 1).unwrap(),
    );
    let calc = NaiveDate::parse_from_str(calculation_date, "%Y-%m-%d").unwrap_or(
        chrono::Utc::now().date_naive(),
    );

    let days_since_purchase = (calc - purchase).num_days().max(0) as u32;
    let days_depreciated = days_since_purchase.min(total_days);

    // Calculate years elapsed
    let elapsed_years = days_depreciated / DAYS_PER_YEAR;
    let remaining_days_in_year = days_depreciated % DAYS_PER_YEAR;

    let double_rate = 2.0 / useful_life_years as f64;
    let switch_year = useful_life_years.saturating_sub(2);

    let mut book_value = purchase_price;

    // Full years
    for year in 0..elapsed_years {
        if year < switch_year {
            let yearly_dep = (book_value * double_rate * 100.0).round() / 100.0;
            book_value = (book_value - yearly_dep).max(residual_value);
        } else {
            // Switch to straight-line for remaining years
            let remaining_years = useful_life_years - year;
            if remaining_years > 0 {
                let sl_dep = ((book_value - residual_value) / remaining_years as f64 * 100.0).round() / 100.0;
                book_value = (book_value - sl_dep).max(residual_value);
            }
        }
        if book_value <= residual_value {
            book_value = residual_value;
            break;
        }
    }

    // Partial year
    if remaining_days_in_year > 0 && book_value > residual_value && elapsed_years < useful_life_years {
        let current_year = elapsed_years;
        if current_year < switch_year {
            let yearly_dep = (book_value * double_rate * 100.0).round() / 100.0;
            let daily = yearly_dep / DAYS_PER_YEAR as f64;
            let partial = (daily * remaining_days_in_year as f64 * 100.0).round() / 100.0;
            book_value = (book_value - partial).max(residual_value);
        } else {
            let remaining_years = useful_life_years - current_year;
            if remaining_years > 0 {
                let sl_dep = ((book_value - residual_value) / remaining_years as f64 * 100.0).round() / 100.0;
                let daily = sl_dep / DAYS_PER_YEAR as f64;
                let partial = (daily * remaining_days_in_year as f64 * 100.0).round() / 100.0;
                book_value = (book_value - partial).max(residual_value);
            }
        }
    }

    let total_depreciation = (purchase_price - book_value * 100.0).round() / 100.0;
    let current_net_value = (book_value * 100.0).round() / 100.0;
    let is_maintenance_period = days_since_purchase >= total_days;
    let daily_depreciation = if total_days > 0 {
        ((purchase_price - residual_value) / total_days as f64 * 100.0).round() / 100.0
    } else {
        0.0
    };

    DepreciationResult {
        total_depreciation: (total_depreciation * 100.0).round() / 100.0,
        current_net_value: (current_net_value * 100.0).round() / 100.0,
        daily_depreciation,
        days_depreciated,
        is_maintenance_period,
        total_days,
    }
}

/// Calculate depreciation result based on the depreciation method
pub fn calculate(
    purchase_price: f64,
    residual_value: f64,
    useful_life_years: u32,
    depreciation_method: &str,
    purchase_date: &str,
    calculation_date: &str,
) -> DepreciationResult {
    match depreciation_method {
        "ACCELERATED" => accelerated(purchase_price, residual_value, useful_life_years, purchase_date, calculation_date),
        _ => straight_line(purchase_price, residual_value, useful_life_years, purchase_date, calculation_date),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_straight_line_basic() {
        let result = straight_line(1000.0, 100.0, 5, "2020-01-01", "2023-01-01");
        // 3 years of depreciation = (1000-100)/5*3 = 540
        assert!((result.total_depreciation - 540.0).abs() < 20.0);
        assert!(!result.is_maintenance_period);
    }

    #[test]
    fn test_straight_line_maintenance_period() {
        let result = straight_line(1000.0, 100.0, 5, "2015-01-01", "2025-01-01");
        assert!(result.is_maintenance_period);
        assert_eq!(result.current_net_value, 100.0);
    }

    #[test]
    fn test_straight_line_residual_min() {
        let result = straight_line(1000.0, 100.0, 5, "2010-01-01", "2030-01-01");
        assert_eq!(result.current_net_value, 100.0);
    }

    #[test]
    fn test_accelerated_basic() {
        let result = accelerated(10000.0, 1000.0, 5, "2020-01-01", "2022-01-01");
        // After 2 years of DDB: book_value should be less than straight-line
        let sl = straight_line(10000.0, 1000.0, 5, "2020-01-01", "2022-01-01");
        assert!(result.current_net_value < sl.current_net_value);
    }
}
