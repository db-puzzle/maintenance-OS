<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();
            $table->string('work_order_number')->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('work_order_type_id')->constrained();
            $table->enum('work_order_category', ['corrective', 'preventive', 'inspection', 'project']);
            $table->enum('priority', ['emergency', 'urgent', 'high', 'normal', 'low'])->default('normal');
            $table->integer('priority_score')->default(50)->comment('0-100 for fine-grained sorting');
            $table->string('status', 50)->default('requested');
            
            // Asset relationship
            $table->foreignId('asset_id')->constrained();
            
            // Form/Task configuration
            $table->foreignId('form_id')->nullable()->constrained();
            $table->foreignId('form_version_id')->nullable()->constrained('form_versions');
            $table->json('custom_tasks')->nullable()->comment('For ad-hoc tasks not using forms');
            
            // Planning fields
            $table->decimal('estimated_hours', 5, 2)->nullable();
            $table->decimal('estimated_parts_cost', 10, 2)->nullable();
            $table->decimal('estimated_labor_cost', 10, 2)->nullable();
            $table->decimal('estimated_total_cost', 10, 2)->nullable();
            $table->boolean('downtime_required')->default(false);
            $table->json('safety_requirements')->nullable();
            
            // Scheduling
            $table->timestamp('requested_due_date')->nullable();
            $table->timestamp('scheduled_start_date')->nullable();
            $table->timestamp('scheduled_end_date')->nullable();
            
            // Assignment
            $table->foreignId('assigned_team_id')->nullable()->constrained('teams');
            $table->foreignId('assigned_technician_id')->nullable()->constrained('users');
            $table->json('required_skills')->nullable();
            $table->json('required_certifications')->nullable();
            
            // Execution tracking
            $table->timestamp('actual_start_date')->nullable();
            $table->timestamp('actual_end_date')->nullable();
            $table->decimal('actual_hours', 5, 2)->nullable();
            $table->decimal('actual_parts_cost', 10, 2)->nullable();
            $table->decimal('actual_labor_cost', 10, 2)->nullable();
            $table->decimal('actual_total_cost', 10, 2)->nullable();
            
            // Source tracking
            $table->string('source_type', 50)->default('manual')->comment('manual, routine, sensor, inspection_finding');
            $table->unsignedBigInteger('source_id')->nullable();
            
            // Relationships (flat structure)
            $table->foreignId('related_work_order_id')->nullable()->constrained('work_orders');
            $table->string('relationship_type', 50)->nullable()->comment('follow_up, prerequisite, related');
            
            // People tracking
            $table->foreignId('requested_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->foreignId('planned_by')->nullable()->constrained('users');
            $table->foreignId('verified_by')->nullable()->constrained('users');
            $table->foreignId('closed_by')->nullable()->constrained('users');
            
            // Timestamps
            $table->timestamp('requested_at')->useCurrent();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('planned_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            
            // Metadata
            $table->string('external_reference')->nullable()->comment('PO number, ticket ID, etc');
            $table->boolean('warranty_claim')->default(false);
            $table->json('attachments')->nullable();
            $table->json('tags')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index('work_order_number');
            $table->index(['status', 'priority_score']);
            $table->index(['asset_id', 'status']);
            $table->index(['scheduled_start_date', 'scheduled_end_date']);
            $table->index(['source_type', 'source_id']);
            $table->index(['work_order_category', 'status']);
            $table->index('requested_due_date');
            $table->index('assigned_technician_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_orders');
    }
};