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
        Schema::create('webcams', function (Blueprint $table) {
            $table->id();
            $table->string('target_id');
            $table->unsignedBigInteger('command_id');
            $table->string('path');
            $table->timestamps();

            $table->foreign('command_id')->references('id')->on('commands')->onDelete('cascade');
            $table->foreign('target_id')->references('machine_id')->on('targets')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('webcams');
    }
};
