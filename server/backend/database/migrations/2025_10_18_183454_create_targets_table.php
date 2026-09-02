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
        Schema::create('targets', function (Blueprint $table) {
            // $table->id();
            $table->string('machine_id')->primary();
            $table->string('hostname');
            $table->string('username');
            $table->string('os');
            $table->string('ip')->nullable();
            $table->string('process_id');
            $table->string('key');
            $table->string('iv');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('targets');
    }
};
