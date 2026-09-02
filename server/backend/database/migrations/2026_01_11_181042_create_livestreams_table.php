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
        Schema::create('livestreams', function (Blueprint $table) {
            $table->id();
            $table->string('target_id');
            $table->longText('offer')->nullable();
            $table->longText('answer')->nullable();
            $table->json('client_ice')->nullable();
            $table->json('admin_ice')->nullable();
            $table->dateTime('ended_at')->nullable();
            $table->timestamps();

            $table->foreign('target_id')->references('machine_id')->on('targets')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('livestreams');
    }
};
