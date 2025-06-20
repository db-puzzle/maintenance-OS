<?php

namespace Database\Seeders;

use App\Models\AssetHierarchy\AssetType;
use Illuminate\Database\Seeder;

class AssetTypeSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ativos Industriais & Máquinas
        AssetType::create([
            'name' => 'Bomba centrífuga',
            'description' => 'Ativo para movimentação de fluidos',
        ]);

        AssetType::create([
            'name' => 'Motor Elétrico',
            'description' => 'Motor para conversão de energia elétrica em mecânica',
        ]);

        AssetType::create([
            'name' => 'Válvula',
            'description' => 'Dispositivo para controle de fluxo de fluidos',
        ]);

        AssetType::create([
            'name' => 'Prensa Industrial',
            'description' => 'Ativo para conformação e prensagem de materiais',
        ]);

        AssetType::create([
            'name' => 'Torno CNC',
            'description' => 'Máquina de usinagem controlada por computador',
        ]);

        AssetType::create([
            'name' => 'Torno Vertical CNC',
            'description' => 'Máquina de usinagem controlada por computador',
        ]);

        AssetType::create([
            'name' => 'Fresadora',
            'description' => 'Ativo para usinagem de peças metálicas',
        ]);

        AssetType::create([
            'name' => 'Máquina de Corte a Laser',
            'description' => 'Ativo de precisão para corte de materiais usando laser',
        ]);

        AssetType::create([
            'name' => 'Máquina de Corte',
            'description' => 'Ativo de precisão para corte de materiais usando plasma e/ou oxicorte',
        ]);

        AssetType::create([
            'name' => 'Injetora de Plástico',
            'description' => 'Máquina para moldagem de peças plásticas por injeção',
        ]);

        AssetType::create([
            'name' => 'Compressor de Ar',
            'description' => 'Ativo para geração de ar comprimido',
        ]);

        // 2. Veículos & Transporte
        AssetType::create([
            'name' => 'Caminhão',
            'description' => 'Veículo pesado para transporte de cargas',
        ]);

        AssetType::create([
            'name' => 'Empilhadeira Elétrica',
            'description' => 'Veículo para movimentação de cargas em armazéns',
        ]);

        AssetType::create([
            'name' => 'Empilhadeira a Gás',
            'description' => 'Veículo para movimentação de cargas em armazéns',
        ]);

        // 4. Ferramentas & Ativos Manuais
        AssetType::create([
            'name' => 'Furadeira Radial',
            'description' => 'Ferramenta de usinagem para perfuração',
        ]);

        AssetType::create([
            'name' => 'Máquina de Solda',
            'description' => 'Ativo para soldagem de materiais',
        ]);

        // 5. Ativos Elétricos & Energia
        AssetType::create([
            'name' => 'Gerador',
            'description' => 'Ativo para geração de energia elétrica',
        ]);

        AssetType::create([
            'name' => 'Transformador',
            'description' => 'Ativo para conversão de tensão elétrica',
        ]);

        // 6. Infraestrutura & Edificações
        AssetType::create([
            'name' => 'Sistema HVAC',
            'description' => 'Sistema de aquecimento, ventilação e ar condicionado',
        ]);

        AssetType::create([
            'name' => 'Elevador',
            'description' => 'Ativo para transporte vertical de pessoas e cargas',
        ]);

        // 7. Ativos Médicos & Laboratoriais
        AssetType::create([
            'name' => 'Ressonância Magnética',
            'description' => 'Ativo para diagnóstico por imagem',
        ]);

        AssetType::create([
            'name' => 'Autoclave',
            'description' => 'Ativo para esterilização de materiais',
        ]);

        // 8. Ferramentas & Ativos de Construção
        AssetType::create([
            'name' => 'Betoneira',
            'description' => 'Ativo para mistura de concreto',
        ]);

        AssetType::create([
            'name' => 'Compactador',
            'description' => 'Ativo para compactação de solo',
        ]);

        // 9. Ativos de Segurança
        AssetType::create([
            'name' => 'Sistema de Monitoramento',
            'description' => 'Ativo para vigilância e segurança',
        ]);

        // 10. Ativos de Transporte e Logística
        AssetType::create([
            'name' => 'Esteira Transportadora',
            'description' => 'Sistema para transporte contínuo de materiais',
        ]);

        AssetType::create([
            'name' => 'Ponte Rolante',
            'description' => 'Ativo para movimentação aérea de cargas',
        ]);
    }
}
