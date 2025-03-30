<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Log;

class CleanupPendingImports extends Command
{
    protected $signature = 'imports:cleanup';
    protected $description = 'Limpa importações pendentes que podem ter ficado presas';

    public function handle()
    {
        $this->info('Iniciando limpeza de importações pendentes...');

        // Busca todas as sessões com importações pendentes
        $sessions = Session::all();
        $cleaned = 0;

        foreach ($sessions as $sessionId => $session) {
            if (isset($session['import_in_progress']) && $session['import_in_progress']) {
                $startedAt = $session['import_started_at'] ?? null;
                
                // Se a importação começou há mais de 30 minutos, considera como pendente
                if ($startedAt && now()->diffInMinutes($startedAt) > 30) {
                    Log::warning('Importação pendente encontrada e limpa', [
                        'session_id' => $sessionId,
                        'started_at' => $startedAt
                    ]);
                    
                    // Limpa os dados da importação da sessão
                    Session::forget($sessionId . '.import_in_progress');
                    Session::forget($sessionId . '.import_started_at');
                    
                    $cleaned++;
                }
            }
        }

        $this->info("Limpeza concluída. {$cleaned} importações pendentes foram limpas.");
    }
} 