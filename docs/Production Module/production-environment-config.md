# Production Module Environment Configuration

This document lists all environment variables used by the Production module.

## Configuration Variables

### Manual Production Reporting

```env
# Allow manual production reporting on orders that have routes defined.
# When false, orders with routes must use step execution for reporting.
PRODUCTION_ALLOW_MANUAL_WITH_ROUTE=false
```

### Production Tracking Dashboard

```env
# Auto-refresh interval for the production tracking dashboard in seconds.
PRODUCTION_TRACKING_REFRESH=30
```

### QR Code Configuration

```env
# QR code generation settings
QR_CODE_SIZE=300
QR_CODE_MARGIN=10
QR_CODE_ERROR_CORRECTION=M  # Options: L, M, Q, H
```

### Work Cell Configuration

```env
# Default settings for work cells
WORK_CELL_MAX_CONCURRENT=1
WORK_CELL_DEFAULT_CAPACITY=100
```

### Manufacturing Step Configuration

```env
# Default values for manufacturing steps
STEP_DEFAULT_CYCLE_TIME=30
STEP_DEFAULT_SETUP_TIME=10
```

## Usage

Add these variables to your `.env` file and adjust the values according to your requirements. The application will use the default values specified in `config/production.php` if these environment variables are not set.
