# Database Connection Pooling Strategy for Multi-Tenant Laravel Cloud

## Overview

This document outlines the connection pooling strategy for a multi-tenant Laravel application hosted on Laravel Cloud, supporting 5-100 tenants with PostgreSQL databases. The strategy leverages Laravel Cloud's built-in connection pooling capabilities and PgBouncer for optimal performance.

## Architecture Overview

### Infrastructure Setup
- **Platform**: Laravel Cloud with Laravel Serverless Postgres
- **Database**: Single PostgreSQL server with multiple tenant databases
- **Connection Pooling**: Database-level pooling via PgBouncer (built into Laravel Cloud)
- **Expected Scale**: 5 tenants initially, scaling to 100 tenants

## Connection Pooling Configuration

### 1. Laravel Cloud Serverless Postgres Setup

#### Recommended Configuration
```
Compute Units Range: 0.5 - 4
- Minimum: 0.5 units (0.5 vCPU, 2GB RAM)
- Maximum: 4 units (4 vCPU, 16GB RAM)
- Autoscaling: Enabled
```

#### Connection Pool Benefits
- **10,000 concurrent connections** supported via PgBouncer
- Automatic connection multiplexing for read-only queries
- Built-in connection pooling without additional infrastructure

### 2. Connection Strategy

#### Shared Pool Architecture (Recommended)
Given your scale (5-100 tenants) and Laravel Cloud's capabilities, I recommend a **shared connection pool** approach:

**Advantages:**
- Efficient resource utilization
- Lower overhead for small tenant count
- Simplified management
- Built-in to Laravel Cloud (no additional setup)

**Implementation:**
1. Use Laravel Cloud's PgBouncer endpoint for all tenant connections
2. Configure DB_HOST with `-pooler` suffix:
   ```
   DB_HOST="your-cluster-name-pooler.us-east-2.pg.laravel.cloud"
   ```
3. Laravel Tenancy package handles database switching automatically

### 3. Connection Pool Sizing

#### Initial Configuration (5 tenants)
```
Minimum Connections: 10 per tenant = 50 total
Maximum Connections: 20 per tenant = 100 total
Pool Mode: Transaction
Default Pool Size: 25
Reserve Pool: 5
```

#### Scaled Configuration (100 tenants)
```
Minimum Connections: 5 per tenant = 500 total
Maximum Connections: 10 per tenant = 1,000 total
Pool Mode: Transaction
Default Pool Size: 100
Reserve Pool: 20
```

### 4. Performance Optimization

#### Laravel Configuration
```php
// config/database.php
'pgsql' => [
    'driver' => 'pgsql',
    'host' => env('DB_HOST'),
    'port' => env('DB_PORT', '5432'),
    'database' => env('DB_DATABASE'),
    'username' => env('DB_USERNAME'),
    'password' => env('DB_PASSWORD'),
    'charset' => 'utf8',
    'prefix' => '',
    'prefix_indexes' => true,
    'schema' => 'public',
    'sslmode' => 'require',
    'options' => [
        PDO::ATTR_PERSISTENT => false,
        PDO::ATTR_TIMEOUT => 5,
    ],
],
```

#### Connection Pool Parameters
```
pool_mode = transaction
max_client_conn = 10000
default_pool_size = 100
min_pool_size = 10
reserve_pool_size = 20
reserve_pool_timeout = 5
server_lifetime = 3600
server_idle_timeout = 600
```

### 5. Tenant Priority Management

#### Basic Priority System (Phase 1)
For initial implementation with minimal overhead:

1. **Connection Limits by Plan**:
   ```php
   // In Account model
   public function getMaxConnections(): int
   {
       return match($this->plan->tier) {
           'premium' => 20,
           'standard' => 10,
           'trial' => 5,
           default => 5,
       };
   }
   ```

2. **Query Timeout Configuration**:
   ```php
   // For premium tenants
   DB::statement("SET statement_timeout = '30s'");
   
   // For standard tenants  
   DB::statement("SET statement_timeout = '10s'");
   ```

### 6. Connection Exhaustion Handling

#### Graceful Degradation Strategy

1. **Circuit Breaker Pattern**:
   ```php
   // app/Services/DatabaseCircuitBreaker.php
   class DatabaseCircuitBreaker
   {
       private const MAX_FAILURES = 3;
       private const TIMEOUT = 60; // seconds
       
       public function executeWithFallback(callable $operation, callable $fallback)
       {
           if ($this->isOpen()) {
               return $fallback();
           }
           
           try {
               $result = $operation();
               $this->recordSuccess();
               return $result;
           } catch (ConnectionException $e) {
               $this->recordFailure();
               if ($this->shouldOpen()) {
                   $this->open();
               }
               return $fallback();
           }
       }
   }
   ```

2. **Queue Delay Strategy**:
   - Automatically increase job delays during high load
   - Prioritize interactive requests over background jobs
   - Implement exponential backoff for failed connections

3. **User Notification**:
   - Display maintenance message for affected operations
   - Provide estimated recovery time
   - Log incidents for administrator review

### 7. Monitoring and Alerts

#### Key Metrics to Monitor
1. **Connection Pool Metrics**:
   - Active connections per tenant
   - Connection wait time
   - Pool utilization percentage
   - Failed connection attempts

2. **Performance Metrics**:
   - Average query response time
   - 95th percentile response time
   - Slow query count
   - Transaction rollback rate

#### Alert Thresholds
```yaml
alerts:
  - name: high_connection_usage
    condition: pool_utilization > 80%
    duration: 5 minutes
    action: notify_admin
    
  - name: connection_exhaustion
    condition: failed_connections > 10
    duration: 1 minute
    action: escalate
    
  - name: slow_response_time
    condition: avg_response_time > 500ms
    duration: 3 minutes
    action: investigate
```

### 8. Autoscaling Configuration

#### Laravel Cloud Autoscaling
Leverage Laravel Cloud's built-in autoscaling:

1. **Compute Autoscaling**:
   - Scale up when CPU > 70% for 2 minutes
   - Scale down when CPU < 30% for 10 minutes
   - Minimum scale: 0.5 compute units
   - Maximum scale: 4 compute units

2. **Connection Pool Autoscaling**:
   - Managed automatically by PgBouncer
   - No manual configuration needed

### 9. Best Practices

1. **Connection Management**:
   - Use database transactions efficiently
   - Close connections promptly
   - Avoid long-running transactions
   - Use read replicas for reports (future enhancement)

2. **Query Optimization**:
   - Index frequently queried columns
   - Use eager loading to prevent N+1 queries
   - Implement query result caching
   - Monitor slow query log

3. **Tenant Isolation**:
   - Validate tenant context on every request
   - Use Laravel Tenancy's automatic switching
   - Implement connection-level security

### 10. Implementation Timeline

#### Phase 1 (Week 1-2): Basic Setup
- Configure Laravel Cloud Serverless Postgres
- Enable PgBouncer connection pooling
- Implement basic monitoring

#### Phase 2 (Week 3): Optimization
- Implement circuit breaker pattern
- Add connection exhaustion handling
- Configure alert thresholds

#### Phase 3 (Week 4): Advanced Features
- Implement basic priority system
- Add performance monitoring
- Create admin dashboard for connection metrics

### 11. Testing Strategy

1. **Load Testing**:
   - Simulate 100 concurrent tenants
   - Test connection pool exhaustion
   - Measure response times under load

2. **Failover Testing**:
   - Test circuit breaker activation
   - Verify graceful degradation
   - Test recovery procedures

3. **Performance Benchmarks**:
   - Target: < 100ms average response time
   - Target: < 1% connection failures
   - Target: 99.9% uptime

## Conclusion

This connection pooling strategy leverages Laravel Cloud's built-in capabilities to provide a scalable, performant solution for multi-tenant applications. The shared pool approach with PgBouncer minimizes complexity while providing excellent performance and resource utilization for your expected scale of 5-100 tenants.
